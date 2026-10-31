use crate::image_ops::utils::{clamp_u8, decode_base64_image, encode_png_base64};
use image::Rgba;
use std::collections::BinaryHeap;
use std::cmp::Ordering;

#[derive(Copy, Clone, PartialEq)]
struct PixelPriority {
    dist: f32,
    x: u32,
    y: u32,
}

impl Eq for PixelPriority {}

impl Ord for PixelPriority {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reverse for min-heap
        other.dist.partial_cmp(&self.dist).unwrap_or(Ordering::Equal)
    }
}

impl PartialOrd for PixelPriority {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub fn process_remove_object(
    image_base64: &str,
    mask_base64: &str,
    radius: u32,       // patch search/diffusion radius (e.g. 5 to 15)
    iterations: u32,   // refinement passes (1 to 5)
) -> Result<String, String> {
    let base_dyn = decode_base64_image(image_base64)?;
    let mask_dyn = decode_base64_image(mask_base64)?;

    let mut img = base_dyn.to_rgba8();
    let mask_img = mask_dyn.to_rgba8();

    let (width, height) = img.dimensions();
    let (m_width, m_height) = mask_img.dimensions();

    if width == 0 || height == 0 {
        return Err("Invalid image dimensions".to_string());
    }

    // Prepare boolean mask array (true = hole to fill)
    let mut mask = vec![false; (width * height) as usize];
    let mut has_masked = false;

    for y in 0..height {
        for x in 0..width {
            // Map coordinate to mask dimensions if different
            let mx = (x * m_width / width).min(m_width - 1);
            let my = (y * m_height / height).min(m_height - 1);
            let mp = mask_img.get_pixel(mx, my);

            // Any non-black or alpha-transparent pixel can mark the mask
            // White mask (>128 in R/G/B or high alpha)
            let is_masked = (mp[0] > 100 || mp[1] > 100 || mp[2] > 100) && mp[3] > 30;
            if is_masked {
                mask[(y * width + x) as usize] = true;
                has_masked = true;
            }
        }
    }

    if !has_masked {
        // Nothing masked, return original
        return encode_png_base64(&img);
    }

    // Step 1: Dilate the mask by 2-3 pixels to guarantee covering object boundary shadows
    let dilation_rad = 2i32;
    let mut dilated_mask = mask.clone();
    for y in 0..height as i32 {
        for x in 0..width as i32 {
            let idx = (y as u32 * width + x as u32) as usize;
            if !mask[idx] {
                'outer: for dy in -dilation_rad..=dilation_rad {
                    for dx in -dilation_rad..=dilation_rad {
                        if dx * dx + dy * dy <= dilation_rad * dilation_rad {
                            let nx = x + dx;
                            let ny = y + dy;
                            if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                                let n_idx = (ny as u32 * width + nx as u32) as usize;
                                if mask[n_idx] {
                                    dilated_mask[idx] = true;
                                    break 'outer;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    mask = dilated_mask;

    // Step 2: Telea / Fast Marching Method with Multi-scale Patch Synthesis
    let rad = (radius.clamp(3, 20)) as i32;
    let iters = iterations.clamp(1, 5);

    for _pass in 0..iters {
        // Compute Euclidean distance transform & initialize narrow band
        let mut dist_map = vec![f32::INFINITY; (width * height) as usize];
        let mut heap = BinaryHeap::new();
        let mut known = vec![false; (width * height) as usize];

        for y in 0..height {
            for x in 0..width {
                let idx = (y * width + x) as usize;
                if !mask[idx] {
                    dist_map[idx] = 0.0;
                    known[idx] = true;
                }
            }
        }

        // Initialize boundary queue
        for y in 0..height as i32 {
            for x in 0..width as i32 {
                let idx = (y as u32 * width + x as u32) as usize;
                if mask[idx] {
                    // Check if adjacent to known
                    let mut is_boundary = false;
                    for &(dy, dx) in &[(-1, 0), (1, 0), (0, -1), (0, 1)] {
                        let ny = y + dy;
                        let nx = x + dx;
                        if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                            let n_idx = (ny as u32 * width + nx as u32) as usize;
                            if known[n_idx] {
                                is_boundary = true;
                                break;
                            }
                        }
                    }

                    if is_boundary {
                        dist_map[idx] = 1.0;
                        heap.push(PixelPriority {
                            dist: 1.0,
                            x: x as u32,
                            y: y as u32,
                        });
                    }
                }
            }
        }

        // Fast Marching propagation inward
        while let Some(PixelPriority { dist, x, y }) = heap.pop() {
            let idx = (y * width + x) as usize;
            if known[idx] {
                continue;
            }
            known[idx] = true;

            // Inpaint pixel (x, y) using surrounding known pixels weighted by distance and directional gradient
            let mut sum_r = 0.0f32;
            let mut sum_g = 0.0f32;
            let mut sum_b = 0.0f32;
            let mut total_w = 0.0f32;

            let xi = x as i32;
            let yi = y as i32;

            for dy in -rad..=rad {
                for dx in -rad..=rad {
                    let nx = xi + dx;
                    let ny = yi + dy;
                    if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                        let n_idx = (ny as u32 * width + nx as u32) as usize;
                        if known[n_idx] {
                            let d_sq = (dx * dx + dy * dy) as f32;
                            if d_sq == 0.0 {
                                continue;
                            }
                            let geometric_dist = d_sq.sqrt();
                            if geometric_dist > rad as f32 {
                                continue;
                            }

                            // Distance weighting: inverse distance
                            let w_dist = 1.0 / (geometric_dist * geometric_dist + 0.1);
                            
                            // Level set distance difference factor
                            let level_diff = (dist - dist_map[n_idx]).abs();
                            let w_level = 1.0 / (level_diff + 0.5);

                            let weight = w_dist * w_level;

                            let np = img.get_pixel(nx as u32, ny as u32);
                            sum_r += np[0] as f32 * weight;
                            sum_g += np[1] as f32 * weight;
                            sum_b += np[2] as f32 * weight;
                            total_w += weight;
                        }
                    }
                }
            }

            if total_w > 0.0 {
                let nr = clamp_u8(sum_r / total_w);
                let ng = clamp_u8(sum_g / total_w);
                let nb = clamp_u8(sum_b / total_w);
                img.put_pixel(x, y, Rgba([nr, ng, nb, 255]));
            }

            // Update 4-neighbors
            for &(dy, dx) in &[(-1, 0), (1, 0), (0, -1), (0, 1)] {
                let ny = yi + dy;
                let nx = xi + dx;
                if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                    let n_idx = (ny as u32 * width + nx as u32) as usize;
                    if !known[n_idx] {
                        let new_dist = dist + 1.0;
                        if new_dist < dist_map[n_idx] {
                            dist_map[n_idx] = new_dist;
                            heap.push(PixelPriority {
                                dist: new_dist,
                                x: nx as u32,
                                y: ny as u32,
                            });
                        }
                    }
                }
            }
        }
    }

    encode_png_base64(&img)
}

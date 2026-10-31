use crate::image_ops::utils::{clamp_u8, decode_base64_image, encode_png_base64, rgb_to_lab};
use image::{Rgba, RgbaImage};
use rayon::prelude::*;

pub fn process_remove_background(
    image_base64: &str,
    threshold: f32, // 0.0 to 1.0 (default ~0.35)
    smooth_radius: u32, // 1 to 10
    edge_refine: bool,
) -> Result<String, String> {
    let dynamic = decode_base64_image(image_base64)?;
    let img = dynamic.to_rgba8();
    let (width, height) = img.dimensions();

    if width == 0 || height == 0 {
        return Err("Image dimensions are invalid".to_string());
    }

    // Step 1: Collect background seed samples from border regions (top, bottom, left, right edges)
    let mut bg_samples = Vec::new();
    let border_depth = (width.min(height) as f32 * 0.05).max(3.0) as u32;

    for y in 0..height {
        for x in 0..width {
            let is_border = x < border_depth || x >= width - border_depth || y < border_depth || y >= height - border_depth;
            if is_border {
                // Subsample to keep processing extremely fast
                if (x + y) % 3 == 0 {
                    let p = img.get_pixel(x, y);
                    let (l, a, b) = rgb_to_lab(p[0], p[1], p[2]);
                    bg_samples.push((l, a, b));
                }
            }
        }
    }

    if bg_samples.is_empty() {
        return Err("Failed to extract background samples".to_string());
    }

    // Center coordinates for saliency prior
    let cx = width as f32 / 2.0;
    let cy = height as f32 / 2.0;
    let max_dist = (cx * cx + cy * cy).sqrt();

    // Step 2: Compute initial foreground probability map using parallel rows
    let raw_alpha: Vec<f32> = (0..height)
        .into_par_iter()
        .flat_map(|y| {
            let mut row_alpha = Vec::with_capacity(width as usize);
            let dy = (y as f32 - cy).abs();

            for x in 0..width {
                let dx = (x as f32 - cx).abs();
                let center_dist = (dx * dx + dy * dy).sqrt() / max_dist;
                let p = img.get_pixel(x, y);
                let (pl, pa, pb) = rgb_to_lab(p[0], p[1], p[2]);

                // Find minimum perceptual color distance (Delta E in Lab space) to any background cluster
                let mut min_bg_dist = f32::MAX;
                // Sample a representative subset of background points
                let step = (bg_samples.len() / 64).max(1);
                for i in (0..bg_samples.len()).step_by(step) {
                    let (bl, ba, bb) = bg_samples[i];
                    let dl = pl - bl;
                    let da = pa - ba;
                    let db = pb - bb;
                    let dist = (dl * dl + da * da + db * db).sqrt();
                    if dist < min_bg_dist {
                        min_bg_dist = dist;
                    }
                }

                // Saliency weight: center bias slightly promotes subject
                let center_prior = 1.0 - (center_dist * 0.45);
                
                // Color contrast score relative to background
                // Lab Delta E > 20 is visibly distinct, > 35 is strong contrast
                let contrast_score = (min_bg_dist / 40.0).clamp(0.0, 2.0);

                let mut prob = contrast_score * center_prior;
                
                // If near border, strongly penalize unless color distance is huge
                let border_dist_x = x.min(width - 1 - x) as f32;
                let border_dist_y = y.min(height - 1 - y) as f32;
                let min_border_dist = border_dist_x.min(border_dist_y);
                if min_border_dist < border_depth as f32 {
                    let border_factor = min_border_dist / border_depth as f32;
                    prob *= border_factor.powf(1.5);
                }

                row_alpha.push(prob);
            }
            row_alpha
        })
        .collect();

    // Step 3: Threshold and non-linear contrast mapping
    let thresh_val = threshold.clamp(0.05, 0.95) * 1.5;
    let mut alpha_map: Vec<f32> = raw_alpha
        .par_iter()
        .map(|&p| {
            if p > thresh_val {
                let norm = ((p - thresh_val) / (1.5 - thresh_val)).clamp(0.0, 1.0);
                // Sigmoid smoothing
                1.0 / (1.0 + (-8.0 * (norm - 0.4)).exp())
            } else {
                0.0
            }
        })
        .collect();

    // Step 4: Bilateral/edge-preserving guided smoothing pass
    let r = smooth_radius.clamp(1, 8) as i32;
    if edge_refine && r > 0 {
        let smoothed_alpha = (0..height)
            .into_par_iter()
            .flat_map(|y| {
                let mut row = Vec::with_capacity(width as usize);
                for x in 0..width {
                    let idx = (y * width + x) as usize;
                    let current_alpha = alpha_map[idx];

                    // Only filter boundary pixels where alpha is transitional
                    if current_alpha > 0.05 && current_alpha < 0.95 {
                        let center_pix = img.get_pixel(x, y);
                        let mut sum_weight = 0.0f32;
                        let mut sum_alpha = 0.0f32;

                        for ky in -r..=r {
                            let ny = y as i32 + ky;
                            if ny < 0 || ny >= height as i32 {
                                continue;
                            }
                            for kx in -r..=r {
                                let nx = x as i32 + kx;
                                if nx < 0 || nx >= width as i32 {
                                    continue;
                                }

                                let n_idx = (ny as u32 * width + nx as u32) as usize;
                                let neighbor_pix = img.get_pixel(nx as u32, ny as u32);

                                // Spatial weight
                                let spatial_dist_sq = (kx * kx + ky * ky) as f32;
                                let w_spatial = (-spatial_dist_sq / (2.0 * (r as f32) * (r as f32))).exp();

                                // Color similarity weight
                                let dr = center_pix[0] as f32 - neighbor_pix[0] as f32;
                                let dg = center_pix[1] as f32 - neighbor_pix[1] as f32;
                                let db = center_pix[2] as f32 - neighbor_pix[2] as f32;
                                let color_dist_sq = dr * dr + dg * dg + db * db;
                                let w_color = (-color_dist_sq / (2.0 * 25.0 * 25.0)).exp();

                                let weight = w_spatial * w_color;
                                sum_weight += weight;
                                sum_alpha += alpha_map[n_idx] * weight;
                            }
                        }

                        if sum_weight > 0.0 {
                            row.push(sum_alpha / sum_weight);
                        } else {
                            row.push(current_alpha);
                        }
                    } else {
                        row.push(current_alpha);
                    }
                }
                row
            })
            .collect();
        alpha_map = smoothed_alpha;
    }

    // Step 5: Construct output RGBA image
    let mut out_img = RgbaImage::new(width, height);
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) as usize;
            let orig = img.get_pixel(x, y);
            let a = clamp_u8(alpha_map[idx] * 255.0);
            out_img.put_pixel(x, y, Rgba([orig[0], orig[1], orig[2], a]));
        }
    }

    encode_png_base64(&out_img)
}

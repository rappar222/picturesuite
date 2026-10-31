use crate::image_ops::utils::{clamp_u8, decode_base64_image, encode_png_base64};
use image::{Rgba, RgbaImage};
use rayon::prelude::*;

pub fn process_expand_image(
    image_base64: &str,
    top: u32,
    bottom: u32,
    left: u32,
    right: u32,
    mode: &str, // "smart_fill", "reflect_blend", "linear_diffuse"
) -> Result<String, String> {
    let dynamic = decode_base64_image(image_base64)?;
    let orig = dynamic.to_rgba8();
    let (ow, oh) = orig.dimensions();

    if ow == 0 || oh == 0 {
        return Err("Invalid image dimensions".to_string());
    }

    let nw = ow + left + right;
    let nh = oh + top + bottom;

    if nw > 8000 || nh > 8000 {
        return Err("Expanded dimensions exceed 8000px maximum safe limit".to_string());
    }

    let mut out_img = RgbaImage::new(nw, nh);

    // Step 1: Copy original image in center
    for y in 0..oh {
        for x in 0..ow {
            out_img.put_pixel(x + left, y + top, *orig.get_pixel(x, y));
        }
    }

    // Step 2: Parallel synthesis for outer regions
    // We compute pixel color for (x, y) outside the original bounds [left..left+ow, top..top+oh]
    let rows: Vec<Vec<Rgba<u8>>> = (0..nh)
        .into_par_iter()
        .map(|ny| {
            let mut row = Vec::with_capacity(nw as usize);
            for nx in 0..nw {
                let inside_x = nx >= left && nx < left + ow;
                let inside_y = ny >= top && ny < top + oh;

                if inside_x && inside_y {
                    let ox = nx - left;
                    let oy = ny - top;
                    row.push(*orig.get_pixel(ox, oy));
                    continue;
                }

                // Coordinates relative to original image borders
                let clamped_ox = (nx.saturating_sub(left)).min(ow - 1);
                let clamped_oy = (ny.saturating_sub(top)).min(oh - 1);

                match mode {
                    "reflect_blend" => {
                        // Mirror reflection with distance damping
                        let rx = if nx < left {
                            let dist = left - nx;
                            (dist % ow).min(ow - 1)
                        } else if nx >= left + ow {
                            let dist = nx - (left + ow);
                            (ow - 1).saturating_sub(dist % ow)
                        } else {
                            nx - left
                        };

                        let ry = if ny < top {
                            let dist = top - ny;
                            (dist % oh).min(oh - 1)
                        } else if ny >= top + oh {
                            let dist = ny - (top + oh);
                            (oh - 1).saturating_sub(dist % oh)
                        } else {
                            ny - top
                        };

                        let p = orig.get_pixel(rx, ry);
                        row.push(*p);
                    }
                    _ => {
                        // "smart_fill": Contextual gradient extrapolation with pseudo-noise texture synthesis
                        // Sample nearest edge pixel
                        let edge_p = orig.get_pixel(clamped_ox, clamped_oy);

                        // Distance outward from edge
                        let dist_x = if nx < left { left - nx } else if nx >= left + ow { nx - (left + ow) } else { 0 };
                        let dist_y = if ny < top { top - ny } else if ny >= top + oh { ny - (top + oh) } else { 0 };
                        let dist = ((dist_x * dist_x + dist_y * dist_y) as f32).sqrt();

                        // Gradient sampling: compute directional trend from 4 pixels inside the boundary
                        let sample_step = 4u32;
                        let inner_ox = if nx < left {
                            (clamped_ox + sample_step).min(ow - 1)
                        } else if nx >= left + ow {
                            clamped_ox.saturating_sub(sample_step)
                        } else {
                            clamped_ox
                        };

                        let inner_oy = if ny < top {
                            (clamped_oy + sample_step).min(oh - 1)
                        } else if ny >= top + oh {
                            clamped_oy.saturating_sub(sample_step)
                        } else {
                            clamped_oy
                        };

                        let inner_p = orig.get_pixel(inner_ox, inner_oy);

                        // Linear gradient slope
                        let grad_r = (edge_p[0] as f32 - inner_p[0] as f32) / (sample_step as f32);
                        let grad_g = (edge_p[1] as f32 - inner_p[1] as f32) / (sample_step as f32);
                        let grad_b = (edge_p[2] as f32 - inner_p[2] as f32) / (sample_step as f32);

                        // Dampen gradient as distance increases so it converges to a soft ambient wash
                        let decay = (-dist / 120.0).exp();
                        
                        // Subtle deterministic pseudo-random texture jitter to avoid banding
                        let pseudo_noise = (((nx * 374761393 + ny * 668265263) ^ 0x5bf03635) % 17) as f32 - 8.0;
                        let noise_weight = (1.0 - decay) * 0.4;

                        let base_r = edge_p[0] as f32 + (grad_r * dist.min(25.0) * decay) + pseudo_noise * noise_weight;
                        let base_g = edge_p[1] as f32 + (grad_g * dist.min(25.0) * decay) + pseudo_noise * noise_weight;
                        let base_b = edge_p[2] as f32 + (grad_b * dist.min(25.0) * decay) + pseudo_noise * noise_weight;

                        row.push(Rgba([clamp_u8(base_r), clamp_u8(base_g), clamp_u8(base_b), 255]));
                    }
                }
            }
            row
        })
        .collect();

    for (y, row) in rows.into_iter().enumerate() {
        for (x, pixel) in row.into_iter().enumerate() {
            out_img.put_pixel(x as u32, y as u32, pixel);
        }
    }

    encode_png_base64(&out_img)
}

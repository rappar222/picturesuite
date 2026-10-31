use crate::image_ops::utils::{clamp_u8, decode_base64_image, encode_png_base64};
use image::{Rgba, RgbaImage};
use rayon::prelude::*;

pub fn process_color_grade(
    image_base64: &str,
    preset: &str,
    intensity: f32, // 0.0 to 1.0
    auto_balance: bool,
    dynamic_range: bool,
) -> Result<String, String> {
    let dynamic = decode_base64_image(image_base64)?;
    let img = dynamic.to_rgba8();
    let (width, height) = img.dimensions();

    if width == 0 || height == 0 {
        return Err("Invalid image dimensions".to_string());
    }

    let total_pixels = (width * height) as f32;

    // Step 1: Histogram & Color Stats Analysis
    let mut sum_r = 0.0f64;
    let mut sum_g = 0.0f64;
    let mut sum_b = 0.0f64;
    let mut min_luma = 255.0f32;
    let mut max_luma = 0.0f32;

    // Subsample stats for instant evaluation
    let step = (total_pixels as usize / 10000).max(1);
    let mut sample_count = 0.0f64;

    for y in (0..height).step_by(step.max(1)) {
        for x in (0..width).step_by(step.max(1)) {
            let p = img.get_pixel(x, y);
            sum_r += p[0] as f64;
            sum_g += p[1] as f64;
            sum_b += p[2] as f64;

            let luma = 0.299 * p[0] as f32 + 0.587 * p[1] as f32 + 0.114 * p[2] as f32;
            if luma < min_luma { min_luma = luma; }
            if luma > max_luma { max_luma = luma; }
            sample_count += 1.0;
        }
    }

    let avg_r = (sum_r / sample_count.max(1.0)) as f32;
    let avg_g = (sum_g / sample_count.max(1.0)) as f32;
    let avg_b = (sum_b / sample_count.max(1.0)) as f32;
    let avg_gray = (avg_r + avg_g + avg_b) / 3.0;

    // White balance multipliers
    let gain_r = if auto_balance && avg_r > 5.0 { (avg_gray / avg_r).clamp(0.7, 1.4) } else { 1.0 };
    let gain_g = if auto_balance && avg_g > 5.0 { (avg_gray / avg_g).clamp(0.7, 1.4) } else { 1.0 };
    let gain_b = if auto_balance && avg_b > 5.0 { (avg_gray / avg_b).clamp(0.7, 1.4) } else { 1.0 };

    // Dynamic range stretch bounds
    let black_pt = if dynamic_range { min_luma.max(0.0) * 0.7 } else { 0.0 };
    let white_pt = if dynamic_range { (255.0 - (255.0 - max_luma) * 0.7).min(255.0) } else { 255.0 };
    let luma_range = (white_pt - black_pt).max(10.0);

    let alpha_blend = intensity.clamp(0.0, 1.0);

    // Parallel color grading pass
    let graded_pixels: Vec<Rgba<u8>> = (0..height)
        .into_par_iter()
        .flat_map(|y| {
            let mut row = Vec::with_capacity(width as usize);
            for x in 0..width {
                let orig = img.get_pixel(x, y);

                // Base normalization
                let mut r = orig[0] as f32 * gain_r;
                let mut g = orig[1] as f32 * gain_g;
                let mut b = orig[2] as f32 * gain_b;

                // Contrast / Dynamic range S-curve
                if dynamic_range {
                    r = ((r - black_pt) / luma_range * 255.0).clamp(0.0, 255.0);
                    g = ((g - black_pt) / luma_range * 255.0).clamp(0.0, 255.0);
                    b = ((b - black_pt) / luma_range * 255.0).clamp(0.0, 255.0);
                }

                let luma = 0.299 * r + 0.587 * g + 0.114 * b;
                let norm_luma = (luma / 255.0).clamp(0.0, 1.0);

                // Apply cinematic preset transformations
                let (target_r, target_g, target_b) = match preset {
                    "teal_orange" => {
                        // Shadows push to teal (cyan+blue), highlights push to warm amber/orange
                        let shadow_weight = (1.0 - norm_luma).powf(1.4);
                        let highlight_weight = norm_luma.powf(1.3);

                        let mut tr = r + 30.0 * highlight_weight - 15.0 * shadow_weight;
                        let mut tg = g + 10.0 * highlight_weight + 12.0 * shadow_weight;
                        let mut tb = b - 20.0 * highlight_weight + 35.0 * shadow_weight;

                        // Add subtle midtone contrast
                        tr = apply_s_curve(tr, 1.15);
                        tg = apply_s_curve(tg, 1.10);
                        tb = apply_s_curve(tb, 1.15);

                        (tr, tg, tb)
                    }
                    "kodak_portra" => {
                        // Warm, creamy skin tones, gentle highlight roll-off, soft contrast
                        let warm_high = norm_luma * 18.0;
                        let tr = r + warm_high + 5.0;
                        let tg = g + warm_high * 0.6;
                        let tb = b - warm_high * 0.4;
                        (tr * 1.02, tg * 1.01, tb * 0.96)
                    }
                    "fuji_astia" => {
                        // Vivid landscape colors, punchy greens and rich blues
                        let tr = apply_s_curve(r, 1.12);
                        let tg = (g * 1.06).min(255.0);
                        let tb = (b * 1.08).min(255.0);
                        (tr, tg, tb)
                    }
                    "moody_film" => {
                        // Raised matte blacks (film look), desaturated palette, cool olive undertone
                        let lift_black = 18.0;
                        let tr = (r * 0.88 + lift_black).min(255.0);
                        let tg = (g * 0.90 + lift_black + 2.0).min(255.0);
                        let tb = (b * 0.86 + lift_black + 4.0).min(255.0);
                        (tr, tg, tb)
                    }
                    "warm_sunset" => {
                        // Golden hour radiant sunset glow
                        let tr = (r * 1.14 + 15.0).min(255.0);
                        let tg = (g * 1.05 + 8.0).min(255.0);
                        let tb = (b * 0.88 - 5.0).max(0.0);
                        (tr, tg, tb)
                    }
                    "cyberpunk" => {
                        // Deep indigo shadows, punchy magenta highlights, electric cyan midtones
                        let shadow_w = (1.0 - norm_luma).powf(1.2);
                        let high_w = norm_luma.powf(1.2);
                        let tr = r + 45.0 * high_w - 20.0 * shadow_w;
                        let tg = g - 10.0 * high_w + 5.0 * shadow_w;
                        let tb = b + 25.0 * high_w + 50.0 * shadow_w;
                        (tr, tg, tb)
                    }
                    "bw_fine_art" => {
                        // High-dynamic range B&W with Ansel Adams silver rich contrast
                        let gray = 0.25 * r + 0.65 * g + 0.10 * b;
                        let high_contrast = apply_s_curve(gray, 1.35);
                        (high_contrast, high_contrast, high_contrast)
                    }
                    _ => {
                        // "natural_boost" / default: Clarity, dynamic vibrance, balanced pop
                        let tr = apply_s_curve(r * 1.03, 1.08);
                        let tg = apply_s_curve(g * 1.03, 1.08);
                        let tb = apply_s_curve(b * 1.03, 1.08);
                        (tr, tg, tb)
                    }
                };

                // Linear interpolation with original based on intensity
                let final_r = orig[0] as f32 * (1.0 - alpha_blend) + target_r * alpha_blend;
                let final_g = orig[1] as f32 * (1.0 - alpha_blend) + target_g * alpha_blend;
                let final_b = orig[2] as f32 * (1.0 - alpha_blend) + target_b * alpha_blend;

                row.push(Rgba([
                    clamp_u8(final_r),
                    clamp_u8(final_g),
                    clamp_u8(final_b),
                    orig[3],
                ]));
            }
            row
        })
        .collect();

    let mut out_img = RgbaImage::new(width, height);
    for (i, pixel) in graded_pixels.into_iter().enumerate() {
        let x = (i as u32) % width;
        let y = (i as u32) / width;
        out_img.put_pixel(x, y, pixel);
    }

    encode_png_base64(&out_img)
}

#[inline]
fn apply_s_curve(v: f32, factor: f32) -> f32 {
    let norm = (v / 255.0).clamp(0.0, 1.0);
    let curved = 1.0 / (1.0 + (-factor * 8.0 * (norm - 0.5)).exp());
    curved * 255.0
}

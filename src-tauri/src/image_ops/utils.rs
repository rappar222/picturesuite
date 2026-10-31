use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::{DynamicImage, ImageFormat, ImageReader, RgbaImage};
use std::io::Cursor;

pub fn decode_base64_image(data_str: &str) -> Result<DynamicImage, String> {
    let clean_str = if let Some(idx) = data_str.find(',') {
        &data_str[idx + 1..]
    } else {
        data_str
    };

    let bytes = STANDARD
        .decode(clean_str.trim())
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| format!("Failed to detect image format: {}", e))?;

    reader
        .decode()
        .map_err(|e| format!("Failed to decode image data: {}", e))
}

pub fn encode_png_base64(img: &RgbaImage) -> Result<String, String> {
    let mut bytes: Vec<u8> = Vec::new();
    let dynamic = DynamicImage::ImageRgba8(img.clone());
    dynamic
        .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png)
        .map_err(|e| format!("Failed to encode PNG: {}", e))?;

    let encoded = STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{}", encoded))
}

pub fn encode_format_base64(dynamic: &DynamicImage, format: ImageFormat) -> Result<(String, usize), String> {
    let mut bytes: Vec<u8> = Vec::new();
    dynamic
        .write_to(&mut Cursor::new(&mut bytes), format)
        .map_err(|e| format!("Failed to encode image: {}", e))?;

    let size = bytes.len();
    let mime = match format {
        ImageFormat::Png => "image/png",
        ImageFormat::Jpeg => "image/jpeg",
        ImageFormat::WebP => "image/webp",
        ImageFormat::Bmp => "image/bmp",
        ImageFormat::Ico => "image/x-icon",
        ImageFormat::Tiff => "image/tiff",
        _ => "application/octet-stream",
    };

    let encoded = STANDARD.encode(&bytes);
    Ok((format!("data:{};base64,{}", mime, encoded), size))
}

// Convert RGB (0..=255) to Lab color space for perceptual color difference and color grading
#[inline]
pub fn rgb_to_lab(r: u8, g: u8, b: u8) -> (f32, f32, f32) {
    let mut rf = r as f32 / 255.0;
    let mut gf = g as f32 / 255.0;
    let mut bf = b as f32 / 255.0;

    rf = if rf > 0.04045 { ((rf + 0.055) / 1.055).powf(2.4) } else { rf / 12.92 };
    gf = if gf > 0.04045 { ((gf + 0.055) / 1.055).powf(2.4) } else { gf / 12.92 };
    bf = if bf > 0.04045 { ((bf + 0.055) / 1.055).powf(2.4) } else { bf / 12.92 };

    let x = (rf * 0.4124 + gf * 0.3576 + bf * 0.1805) / 0.95047;
    let y = (rf * 0.2126 + gf * 0.7152 + bf * 0.0722) / 1.00000;
    let z = (rf * 0.0193 + gf * 0.1192 + bf * 0.9505) / 1.08883;

    let fx = if x > 0.008856 { x.cbrt() } else { 7.787 * x + 16.0 / 116.0 };
    let fy = if y > 0.008856 { y.cbrt() } else { 7.787 * y + 16.0 / 116.0 };
    let fz = if z > 0.008856 { z.cbrt() } else { 7.787 * z + 16.0 / 116.0 };

    let l = 116.0 * fy - 16.0;
    let a = 500.0 * (fx - fy);
    let b_val = 200.0 * (fy - fz);

    (l, a, b_val)
}

#[inline]
pub fn clamp_u8(v: f32) -> u8 {
    v.clamp(0.0, 255.0).round() as u8
}

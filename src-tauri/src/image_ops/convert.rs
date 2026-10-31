use crate::image_ops::utils::{decode_base64_image, encode_format_base64};
use image::{imageops::FilterType, DynamicImage, ImageFormat};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct ConversionResult {
    pub data_url: String,
    pub size_bytes: usize,
    pub format: String,
    pub mime_type: String,
    pub width: u32,
    pub height: u32,
}

pub fn process_convert_format(
    image_base64: &str,
    target_format: &str,
    _quality: u8, // 1 to 100
    resize_width: Option<u32>,
    resize_height: Option<u32>,
) -> Result<ConversionResult, String> {
    let mut dynamic = decode_base64_image(image_base64)?;

    // Handle optional resizing
    if let (Some(rw), Some(rh)) = (resize_width, resize_height) {
        if rw > 0 && rh > 0 && (rw != dynamic.width() || rh != dynamic.height()) {
            dynamic = dynamic.resize_exact(rw, rh, FilterType::Lanczos3);
        }
    } else if let Some(rw) = resize_width {
        if rw > 0 && rw != dynamic.width() {
            let aspect = dynamic.height() as f32 / dynamic.width() as f32;
            let rh = (rw as f32 * aspect).round() as u32;
            dynamic = dynamic.resize_exact(rw, rh.max(1), FilterType::Lanczos3);
        }
    } else if let Some(rh) = resize_height {
        if rh > 0 && rh != dynamic.height() {
            let aspect = dynamic.width() as f32 / dynamic.height() as f32;
            let rw = (rh as f32 * aspect).round() as u32;
            dynamic = dynamic.resize_exact(rw.max(1), rh, FilterType::Lanczos3);
        }
    }

    let fmt = match target_format.to_lowercase().as_str() {
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::WebP,
        "bmp" => ImageFormat::Bmp,
        "ico" => ImageFormat::Ico,
        "tiff" | "tif" => ImageFormat::Tiff,
        _ => ImageFormat::Png,
    };

    // If converting to JPEG or BMP, ensure no transparency issues by converting to RGB8
    let processed_dyn = match fmt {
        ImageFormat::Jpeg | ImageFormat::Bmp => DynamicImage::ImageRgb8(dynamic.to_rgb8()),
        _ => dynamic,
    };

    let (data_url, size_bytes) = encode_format_base64(&processed_dyn, fmt)?;

    let mime_type = match fmt {
        ImageFormat::Jpeg => "image/jpeg",
        ImageFormat::WebP => "image/webp",
        ImageFormat::Bmp => "image/bmp",
        ImageFormat::Ico => "image/x-icon",
        ImageFormat::Tiff => "image/tiff",
        _ => "image/png",
    };

    Ok(ConversionResult {
        data_url,
        size_bytes,
        format: target_format.to_lowercase(),
        mime_type: mime_type.to_string(),
        width: processed_dyn.width(),
        height: processed_dyn.height(),
    })
}

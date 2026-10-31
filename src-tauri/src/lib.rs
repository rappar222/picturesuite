mod image_ops;

use image_ops::bg_removal::process_remove_background;
use image_ops::color_grade::process_color_grade;
use image_ops::convert::{process_convert_format, ConversionResult};
use image_ops::inpaint::process_remove_object;
use image_ops::outpaint::process_expand_image;
use image_ops::utils::decode_base64_image;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ImageMetadata {
    pub width: u32,
    pub height: u32,
    pub aspect_ratio: f32,
    pub color_type: String,
}

#[tauri::command]
fn remove_background(
    image_base64: String,
    threshold: Option<f32>,
    smooth_radius: Option<u32>,
    edge_refine: Option<bool>,
) -> Result<String, String> {
    process_remove_background(
        &image_base64,
        threshold.unwrap_or(0.35),
        smooth_radius.unwrap_or(3),
        edge_refine.unwrap_or(true),
    )
}

#[tauri::command]
fn remove_object(
    image_base64: String,
    mask_base64: String,
    radius: Option<u32>,
    iterations: Option<u32>,
) -> Result<String, String> {
    process_remove_object(
        &image_base64,
        &mask_base64,
        radius.unwrap_or(8),
        iterations.unwrap_or(2),
    )
}

#[tauri::command]
fn expand_image(
    image_base64: String,
    top: u32,
    bottom: u32,
    left: u32,
    right: u32,
    mode: Option<String>,
) -> Result<String, String> {
    let mode_str = mode.unwrap_or_else(|| "smart_fill".to_string());
    process_expand_image(&image_base64, top, bottom, left, right, &mode_str)
}

#[tauri::command]
fn auto_color_grade(
    image_base64: String,
    preset: Option<String>,
    intensity: Option<f32>,
    auto_balance: Option<bool>,
    dynamic_range: Option<bool>,
) -> Result<String, String> {
    let p = preset.unwrap_or_else(|| "natural_boost".to_string());
    process_color_grade(
        &image_base64,
        &p,
        intensity.unwrap_or(1.0),
        auto_balance.unwrap_or(true),
        dynamic_range.unwrap_or(true),
    )
}

#[tauri::command]
fn convert_format(
    image_base64: String,
    target_format: String,
    quality: Option<u8>,
    resize_width: Option<u32>,
    resize_height: Option<u32>,
) -> Result<ConversionResult, String> {
    process_convert_format(
        &image_base64,
        &target_format,
        quality.unwrap_or(85),
        resize_width,
        resize_height,
    )
}

#[tauri::command]
fn get_image_metadata(image_base64: String) -> Result<ImageMetadata, String> {
    let dynamic = decode_base64_image(&image_base64)?;
    let w = dynamic.width();
    let h = dynamic.height();
    let aspect_ratio = if h > 0 { w as f32 / h as f32 } else { 1.0 };
    let color_type = format!("{:?}", dynamic.color());

    Ok(ImageMetadata {
        width: w,
        height: h,
        aspect_ratio,
        color_type,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            remove_background,
            remove_object,
            expand_image,
            auto_color_grade,
            convert_format,
            get_image_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

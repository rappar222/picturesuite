export type ToolType = "bg_removal" | "magic_eraser" | "expand" | "color_grade" | "convert";

export type ThemeMode = "system" | "light" | "dark";

export interface ImageMetadata {
  width: u32;
  height: u32;
  aspect_ratio: number;
  color_type: string;
}

export interface ConversionResult {
  data_url: string;
  size_bytes: number;
  format: string;
  mime_type: string;
  width: number;
  height: number;
}

export interface HistoryItem {
  id: string;
  action: string;
  dataUrl: string;
  timestamp: Date;
  details?: string;
}

export type u32 = number;

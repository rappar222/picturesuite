import React, { useState } from "react";
import { RefreshCw, Download, FileCheck2 } from "lucide-react";
import { ConversionResult } from "../types";

interface ConvertPanelProps {
  onConvert: (format: string, quality: number, width?: number, height?: number) => Promise<ConversionResult | null>;
  isProcessing: boolean;
  hasImage: boolean;
}

const FORMATS = ["png", "jpeg", "webp", "bmp", "tiff", "ico"];

export const ConvertPanel: React.FC<ConvertPanelProps> = ({
  onConvert,
  isProcessing,
  hasImage,
}) => {
  const [targetFormat, setTargetFormat] = useState("webp");
  const [quality, setQuality] = useState(85);
  const [customResize, setCustomResize] = useState(false);
  const [resizeWidth, setResizeWidth] = useState<number | undefined>(undefined);
  const [resizeHeight, setResizeHeight] = useState<number | undefined>(undefined);
  const [lastResult, setLastResult] = useState<ConversionResult | null>(null);

  const handleConvertAction = async () => {
    const rw = customResize && resizeWidth && resizeWidth > 0 ? resizeWidth : undefined;
    const rh = customResize && resizeHeight && resizeHeight > 0 ? resizeHeight : undefined;
    const res = await onConvert(targetFormat, quality, rw, rh);
    if (res) {
      setLastResult(res);
    }
  };

  const downloadResult = () => {
    if (!lastResult) return;
    const link = document.createElement("a");
    link.href = lastResult.data_url;
    link.download = `converted-image.${lastResult.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="tool-panel">
      <div className="panel-header">
        <div className="panel-title">
          <RefreshCw size={17} color="var(--accent-emerald)" />
          <span>File Conversion</span>
        </div>
        <p className="panel-subtitle">
          SIMD multi-threaded encoding, Lanczos3 resampling, and format transcoding.
        </p>
      </div>

      <div className="panel-content">
        <div className="setting-group">
          <span className="setting-label">Target Format</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {FORMATS.map((fmt) => (
              <button
                key={fmt}
                className={`btn-sm ${targetFormat === fmt ? "btn-primary" : ""}`}
                style={{ justifyContent: "center", textTransform: "uppercase", fontSize: 11 }}
                onClick={() => setTargetFormat(fmt)}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {(targetFormat === "jpeg" || targetFormat === "webp") && (
          <div className="setting-group">
            <div className="setting-label">
              <span>Compression Quality</span>
              <span className="setting-val">{quality}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value, 10))}
            />
          </div>
        )}

        <div className="setting-group" style={{ gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-main)" }}>Lanczos3 Resampling</span>
            <label className="modern-switch">
              <input
                type="checkbox"
                checked={customResize}
                onChange={(e) => setCustomResize(e.target.checked)}
              />
              <div className="switch-track">
                <div className="switch-thumb" />
              </div>
            </label>
          </div>

          {customResize && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Width (px)</span>
                <input
                  type="number"
                  className="input-num"
                  placeholder="Width"
                  value={resizeWidth || ""}
                  onChange={(e) => setResizeWidth(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                />
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Height (px)</span>
                <input
                  type="number"
                  className="input-num"
                  placeholder="Height"
                  value={resizeHeight || ""}
                  onChange={(e) => setResizeHeight(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                />
              </div>
            </div>
          )}
        </div>

        <button
          className="btn-action"
          disabled={!hasImage || isProcessing}
          onClick={handleConvertAction}
        >
          <RefreshCw size={16} />
          <span>{isProcessing ? "Transcoding..." : `Convert to .${targetFormat.toUpperCase()}`}</span>
        </button>

        {lastResult && (
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: 10,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent-emerald)", fontSize: 12, fontWeight: 700 }}>
              <FileCheck2 size={16} />
              <span>Conversion Ready</span>
            </div>

            <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Output Size:</span>
              <strong style={{ color: "var(--text-main)" }}>{formatBytes(lastResult.size_bytes)}</strong>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Resolution:</span>
              <strong style={{ color: "var(--text-main)" }}>{lastResult.width} × {lastResult.height} px</strong>
            </div>

            <button
              className="btn-sm btn-primary"
              style={{ justifyContent: "center", marginTop: 4 }}
              onClick={downloadResult}
            >
              <Download size={14} />
              <span>Save File</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { Maximize2, Layers } from "lucide-react";

interface ExpandPanelProps {
  onExpandImage: (top: number, bottom: number, left: number, right: number, mode: string) => void;
  isProcessing: boolean;
  hasImage: boolean;
}

export const ExpandPanel: React.FC<ExpandPanelProps> = ({
  onExpandImage,
  isProcessing,
  hasImage,
}) => {
  const [top, setTop] = useState(60);
  const [bottom, setBottom] = useState(60);
  const [left, setLeft] = useState(60);
  const [right, setRight] = useState(60);
  const [mode, setMode] = useState("smart_fill");

  const setAll = (val: number) => {
    setTop(val);
    setBottom(val);
    setLeft(val);
    setRight(val);
  };

  return (
    <div className="tool-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Maximize2 size={17} color="var(--accent-purple)" />
          <span>AI Image Expanding</span>
        </div>
        <p className="panel-subtitle">
          Extend canvas boundaries outward with contextual gradient & texture extrapolation.
        </p>
      </div>

      <div className="panel-content">
        <div className="setting-group">
          <span className="setting-label">Expansion Margins (pixels)</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Top</span>
              <input
                type="number"
                className="input-num"
                value={top}
                min={0}
                max={1500}
                onChange={(e) => setTop(Math.max(0, parseInt(e.target.value || "0", 10)))}
              />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Bottom</span>
              <input
                type="number"
                className="input-num"
                value={bottom}
                min={0}
                max={1500}
                onChange={(e) => setBottom(Math.max(0, parseInt(e.target.value || "0", 10)))}
              />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Left</span>
              <input
                type="number"
                className="input-num"
                value={left}
                min={0}
                max={1500}
                onChange={(e) => setLeft(Math.max(0, parseInt(e.target.value || "0", 10)))}
              />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Right</span>
              <input
                type="number"
                className="input-num"
                value={right}
                min={0}
                max={1500}
                onChange={(e) => setRight(Math.max(0, parseInt(e.target.value || "0", 10)))}
              />
            </div>
          </div>
        </div>

        <div className="setting-group">
          <span className="setting-label">Quick Presets</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <button className="btn-sm" style={{ justifyContent: "center" }} onClick={() => setAll(40)}>
              +40px
            </button>
            <button className="btn-sm" style={{ justifyContent: "center" }} onClick={() => setAll(80)}>
              +80px
            </button>
            <button className="btn-sm" style={{ justifyContent: "center" }} onClick={() => setAll(150)}>
              +150px
            </button>
          </div>
        </div>

        <div className="setting-group">
          <span className="setting-label">Outpainting Mode</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn-sm ${mode === "smart_fill" ? "active" : ""}`}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => setMode("smart_fill")}
            >
              Smart Texture Fill
            </button>
            <button
              className={`btn-sm ${mode === "mirror" ? "active" : ""}`}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => setMode("mirror")}
            >
              Symmetric Mirror
            </button>
          </div>
        </div>

        <button
          className="btn-action"
          disabled={!hasImage || isProcessing || (top === 0 && bottom === 0 && left === 0 && right === 0)}
          onClick={() => onExpandImage(top, bottom, left, right, mode)}
        >
          <Layers size={16} />
          <span>{isProcessing ? "Synthesizing Canvas..." : "Expand Canvas Boundaries"}</span>
        </button>

        <div className="tip-box">
          <span>📐</span>
          <span>
            <strong>Pro Tip:</strong> Outpaint images to convert portrait shots into landscape wallpapers or banners without cropping.
          </span>
        </div>
      </div>
    </div>
  );
};

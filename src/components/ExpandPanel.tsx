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
  const [top, setTop] = useState(50);
  const [bottom, setBottom] = useState(50);
  const [left, setLeft] = useState(50);
  const [right, setRight] = useState(50);
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
          <Maximize2 size={16} color="#8b5cf6" />
          <span>AI Image Expanding</span>
        </div>
        <p className="panel-subtitle">
          Extend canvas boundaries outward with contextual texture extrapolation.
        </p>
      </div>

      <div className="panel-content">
        <div className="setting-group">
          <span className="setting-label">Expansion Margins (pixels)</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Top</span>
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
              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Bottom</span>
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
              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Left</span>
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
              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Right</span>
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
          <span className="setting-label">Quick Expand Presets</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn-sm" onClick={() => setAll(40)}>+40px</button>
            <button className="btn-sm" onClick={() => setAll(80)}>+80px</button>
            <button className="btn-sm" onClick={() => setAll(150)}>+150px</button>
            <button className="btn-sm" onClick={() => { setTop(0); setBottom(0); setLeft(120); setRight(120); }}>Wide</button>
          </div>
        </div>

        <div className="setting-group">
          <span className="setting-label">Synthesis Mode</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn-sm ${mode === "smart_fill" ? "btn-primary" : ""}`}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => setMode("smart_fill")}
            >
              Smart Fill
            </button>
            <button
              className={`btn-sm ${mode === "reflect_blend" ? "btn-primary" : ""}`}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => setMode("reflect_blend")}
            >
              Mirror Blend
            </button>
          </div>
        </div>

        <button
          className="btn-action"
          disabled={!hasImage || isProcessing || (top === 0 && bottom === 0 && left === 0 && right === 0)}
          onClick={() => onExpandImage(top, bottom, left, right, mode)}
        >
          <Layers size={16} />
          <span>{isProcessing ? "Synthesizing Canvas..." : "Expand Canvas"}</span>
        </button>
      </div>
    </div>
  );
};

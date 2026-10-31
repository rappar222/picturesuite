import React, { useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";

interface BgRemovalPanelProps {
  onRemoveBackground: (threshold: number, radius: number, refine: boolean) => void;
  isProcessing: boolean;
  hasImage: boolean;
}

export const BgRemovalPanel: React.FC<BgRemovalPanelProps> = ({
  onRemoveBackground,
  isProcessing,
  hasImage,
}) => {
  const [threshold, setThreshold] = useState(0.35);
  const [smoothRadius, setSmoothRadius] = useState(3);
  const [edgeRefine, setEdgeRefine] = useState(true);

  return (
    <div className="tool-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Sparkles size={16} color="#06b6d4" />
          <span>AI Background Removal</span>
        </div>
        <p className="panel-subtitle">
          Extract foreground subjects instantly with boundary-preserving alpha matting.
        </p>
      </div>

      <div className="panel-content">
        <div className="setting-group">
          <div className="setting-label">
            <span>Detection Sensitivity</span>
            <span className="setting-val">{Math.round(threshold * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.80"
            step="0.02"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
          />
        </div>

        <div className="setting-group">
          <div className="setting-label">
            <span>Edge Feathering Radius</span>
            <span className="setting-val">{smoothRadius} px</span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={smoothRadius}
            onChange={(e) => setSmoothRadius(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="setting-group" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={14} color="#10b981" />
            <span style={{ fontSize: 12, color: "var(--text-main)" }}>Bilateral Edge Refinement</span>
          </div>
          <input
            type="checkbox"
            checked={edgeRefine}
            onChange={(e) => setEdgeRefine(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
          />
        </div>

        <button
          className="btn-action"
          disabled={!hasImage || isProcessing}
          onClick={() => onRemoveBackground(threshold, smoothRadius, edgeRefine)}
        >
          <Sparkles size={16} />
          <span>{isProcessing ? "Processing Matting..." : "Remove Background"}</span>
        </button>

        <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
          💡 <strong>Tip:</strong> Increases or decreases sensitivity if parts of the subject blend into the background.
        </div>
      </div>
    </div>
  );
};

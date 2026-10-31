import React, { useState } from "react";
import { Eraser, Trash2, Wand2 } from "lucide-react";

interface MagicEraserPanelProps {
  brushSize: number;
  setBrushSize: (size: number) => void;
  onClearMask: () => void;
  onEraseObject: (radius: number, iterations: number) => void;
  isProcessing: boolean;
  hasImage: boolean;
  hasDrawnMask: boolean;
}

export const MagicEraserPanel: React.FC<MagicEraserPanelProps> = ({
  brushSize,
  setBrushSize,
  onClearMask,
  onEraseObject,
  isProcessing,
  hasImage,
  hasDrawnMask,
}) => {
  const [searchRadius, setSearchRadius] = useState(8);
  const [iterations, setIterations] = useState(2);

  return (
    <div className="tool-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Eraser size={16} color="#f43f5e" />
          <span>Magic Eraser (Object Removal)</span>
        </div>
        <p className="panel-subtitle">
          Erase unwanted people, blemishes, or objects like on Samsung Galaxy and fill them back in seamlessly.
        </p>
      </div>

      <div className="panel-content">
        <div className="setting-group">
          <div className="setting-label">
            <span>Brush Size</span>
            <span className="setting-val">{brushSize} px</span>
          </div>
          <input
            type="range"
            min="6"
            max="80"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="setting-group">
          <div className="setting-label">
            <span>Context Inpaint Radius</span>
            <span className="setting-val">{searchRadius} px</span>
          </div>
          <input
            type="range"
            min="4"
            max="18"
            value={searchRadius}
            onChange={(e) => setSearchRadius(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="setting-group">
          <div className="setting-label">
            <span>Refinement Passes</span>
            <span className="setting-val">{iterations}</span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            value={iterations}
            onChange={(e) => setIterations(parseInt(e.target.value, 10))}
          />
        </div>

        <button
          className="btn-sm"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={onClearMask}
          disabled={!hasDrawnMask || isProcessing}
        >
          <Trash2 size={14} />
          <span>Clear Mask Selection</span>
        </button>

        <button
          className="btn-action"
          disabled={!hasImage || !hasDrawnMask || isProcessing}
          onClick={() => onEraseObject(searchRadius, iterations)}
        >
          <Wand2 size={16} />
          <span>{isProcessing ? "Inpainting Context..." : "Erase & Fill Context"}</span>
        </button>

        <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
          🖌️ <strong>How to use:</strong> Paint over any item or person directly on the canvas with the red brush, then click <strong>Erase & Fill Context</strong>.
        </div>
      </div>
    </div>
  );
};

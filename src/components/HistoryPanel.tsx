import React from "react";
import { Info, History, ArrowRight } from "lucide-react";
import { ImageMetadata, HistoryItem } from "../types";

interface HistoryPanelProps {
  metadata: ImageMetadata | null;
  history: HistoryItem[];
  currentIndex: number;
  onSelectHistory: (index: number) => void;
  lastExecutionTime: number | null;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  metadata,
  history,
  currentIndex,
  onSelectHistory,
  lastExecutionTime,
}) => {
  return (
    <div className="info-sidebar">
      <div className="info-section">
        <div className="info-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={13} />
          <span>Image Properties</span>
        </div>
        {metadata ? (
          <div className="meta-grid">
            <div className="meta-item">
              <span className="meta-k">Dimensions</span>
              <div className="meta-v">{metadata.width} × {metadata.height}</div>
            </div>
            <div className="meta-item">
              <span className="meta-k">Aspect Ratio</span>
              <div className="meta-v">{metadata.aspect_ratio.toFixed(2)}:1</div>
            </div>
            <div className="meta-item">
              <span className="meta-k">Color Format</span>
              <div className="meta-v">{metadata.color_type}</div>
            </div>
            <div className="meta-item">
              <span className="meta-k">Last Compute</span>
              <div className="meta-v" style={{ color: "#34d399" }}>
                {lastExecutionTime !== null ? `${lastExecutionTime} ms` : "Ready"}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-dim)", padding: "10px 0" }}>
            No active image loaded.
          </div>
        )}
      </div>

      <div className="info-section" style={{ flex: 1 }}>
        <div className="info-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <History size={13} />
          <span>Edit History</span>
        </div>
        <div className="history-list">
          {history.map((item, idx) => (
            <div
              key={item.id}
              className={`history-item ${idx === currentIndex ? "active" : ""}`}
              onClick={() => onSelectHistory(idx)}
            >
              <div>
                <div className="history-name">{item.action}</div>
                {item.details && <div className="history-time">{item.details}</div>}
              </div>
              {idx === currentIndex && <ArrowRight size={13} color="#3b82f6" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { 
  FolderOpen, 
  Download, 
  Undo2, 
  Redo2, 
  SplitSquareVertical, 
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";

interface HeaderProps {
  status: string;
  isProcessing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenFile: () => void;
  onExport: () => void;
  compareMode: boolean;
  onToggleCompare: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  hasImage: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  isProcessing,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenFile,
  onExport,
  compareMode,
  onToggleCompare,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  hasImage,
}) => {
  return (
    <header className="app-header">
      <div className="logo-group">
        <div className="logo-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <span className="logo-title">PictureSuite</span>
        </div>
        <span className="badge-rust">Rust Engine</span>
      </div>

      <div className="header-center">
        <div className="status-pill">
          <div className={`status-indicator ${isProcessing ? "busy" : ""}`} />
          <span>{status}</span>
        </div>

        {hasImage && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 12 }}>
            <button className="btn-sm" onClick={onZoomOut} title="Zoom Out">
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 40, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="btn-sm" onClick={onZoomIn} title="Zoom In">
              <ZoomIn size={14} />
            </button>
            <button className="btn-sm" onClick={onResetZoom} title="Reset Zoom">
              <RotateCcw size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="header-actions">
        <button 
          className="btn-sm" 
          onClick={onUndo} 
          disabled={!canUndo || isProcessing}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={15} />
        </button>
        <button 
          className="btn-sm" 
          onClick={onRedo} 
          disabled={!canRedo || isProcessing}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={15} />
        </button>

        {hasImage && (
          <button 
            className={`btn-sm ${compareMode ? "btn-primary" : ""}`}
            onClick={onToggleCompare}
            title="Split Before / After View"
          >
            <SplitSquareVertical size={15} />
            <span>Compare</span>
          </button>
        )}

        <button className="btn-sm" onClick={onOpenFile}>
          <FolderOpen size={15} />
          <span>Open</span>
        </button>

        <button 
          className="btn-sm btn-primary" 
          onClick={onExport} 
          disabled={!hasImage || isProcessing}
        >
          <Download size={15} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};

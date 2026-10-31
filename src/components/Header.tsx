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
  RotateCcw,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { ThemeMode } from "../types";

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
  themePreference: ThemeMode;
  resolvedTheme: "light" | "dark";
  onCycleTheme: () => void;
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
  themePreference,
  resolvedTheme,
  onCycleTheme,
}) => {
  const getThemeTitle = () => {
    if (themePreference === "system") {
      return `Theme: Auto System (${resolvedTheme}) - Click to toggle`;
    }
    return `Theme: ${themePreference === "dark" ? "Dark Mode" : "Light Mode"} - Click to toggle`;
  };

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
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
            <button className="btn-sm" onClick={onZoomOut} title="Zoom Out (-)">
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", minWidth: 42, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="btn-sm" onClick={onZoomIn} title="Zoom In (+)">
              <ZoomIn size={14} />
            </button>
            <button className="btn-sm" onClick={onResetZoom} title="Reset Zoom (100%)">
              <RotateCcw size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="header-actions">
        {/* Theme mode toggle: System -> Dark -> Light */}
        <button
          className="theme-toggle-btn"
          onClick={onCycleTheme}
          title={getThemeTitle()}
        >
          {themePreference === "system" ? (
            <Monitor size={16} />
          ) : resolvedTheme === "dark" ? (
            <Moon size={16} />
          ) : (
            <Sun size={16} />
          )}
        </button>

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
            className={`btn-sm ${compareMode ? "active" : ""}`}
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

import React, { useState } from "react";
import { Palette, SunMedium, Compass } from "lucide-react";

interface ColorGradePanelProps {
  onColorGrade: (preset: string, intensity: number, autoBalance: boolean, dynamicRange: boolean) => void;
  isProcessing: boolean;
  hasImage: boolean;
}

const PRESETS = [
  { id: "teal_orange", name: "Teal & Orange", desc: "Hollywood cinematic contrast" },
  { id: "kodak_portra", name: "Kodak Portra 400", desc: "Creamy warm skin tones" },
  { id: "fuji_astia", name: "Fuji Astia", desc: "Vivid punchy landscapes" },
  { id: "moody_film", name: "Moody Matte Film", desc: "Lifted film blacks & olive" },
  { id: "warm_sunset", name: "Golden Sunset", desc: "Radiant golden hour glow" },
  { id: "cyberpunk", name: "Cyberpunk Neon", desc: "Indigo shadows & electric pink" },
  { id: "bw_fine_art", name: "Fine Art B&W", desc: "High dynamic range silver" },
  { id: "natural_boost", name: "Natural Clarity", desc: "Balanced dynamic pop" },
];

export const ColorGradePanel: React.FC<ColorGradePanelProps> = ({
  onColorGrade,
  isProcessing,
  hasImage,
}) => {
  const [selectedPreset, setSelectedPreset] = useState("teal_orange");
  const [intensity, setIntensity] = useState(1.0);
  const [autoBalance, setAutoBalance] = useState(true);
  const [dynamicRange, setDynamicRange] = useState(true);

  return (
    <div className="tool-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Palette size={16} color="#38bdf8" />
          <span>AI Auto Color Grading</span>
        </div>
        <p className="panel-subtitle">
          Professional chromatic adaptation, dynamic range expansion, and cinematic 3D LUT grading.
        </p>
      </div>

      <div className="panel-content">
        <div className="setting-group">
          <span className="setting-label">Cinematic Presets</span>
          <div className="preset-grid">
            {PRESETS.map((p) => (
              <div
                key={p.id}
                className={`preset-card ${selectedPreset === p.id ? "active" : ""}`}
                onClick={() => setSelectedPreset(p.id)}
              >
                <span className="preset-card-title">{p.name}</span>
                <span className="preset-card-desc">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">
            <span>Look Intensity</span>
            <span className="setting-val">{Math.round(intensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="1.0"
            step="0.05"
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
          />
        </div>

        <div className="setting-group" style={{ gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Compass size={14} color="#60a5fa" />
              <span style={{ fontSize: 12, color: "var(--text-main)" }}>Auto White Balance</span>
            </div>
            <input
              type="checkbox"
              checked={autoBalance}
              onChange={(e) => setAutoBalance(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <SunMedium size={14} color="#fbbf24" />
              <span style={{ fontSize: 12, color: "var(--text-main)" }}>Dynamic Range S-Curve</span>
            </div>
            <input
              type="checkbox"
              checked={dynamicRange}
              onChange={(e) => setDynamicRange(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
            />
          </div>
        </div>

        <button
          className="btn-action"
          disabled={!hasImage || isProcessing}
          onClick={() => onColorGrade(selectedPreset, intensity, autoBalance, dynamicRange)}
        >
          <Palette size={16} />
          <span>{isProcessing ? "Grading..." : "Apply Auto Color Grade"}</span>
        </button>
      </div>
    </div>
  );
};

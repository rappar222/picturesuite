import React, { useRef, useEffect, useState, useCallback } from "react";
import { Image as ImageIcon, UploadCloud, Brush, Sparkles } from "lucide-react";
import { ToolType } from "../types";

interface CanvasAreaProps {
  currentImage: string | null;
  originalImage: string | null;
  tool: ToolType;
  compareMode: boolean;
  brushSize: number;
  zoom: number;
  setZoom: (fn: (z: number) => number) => void;
  onImageLoaded: (dataUrl: string) => void;
  maskCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  hasDrawnMask: boolean;
  setHasDrawnMask: (val: boolean) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  currentImage,
  originalImage,
  tool,
  compareMode,
  brushSize,
  zoom,
  setZoom,
  onImageLoaded,
  maskCanvasRef,
  setHasDrawnMask,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [splitPos, setSplitPos] = useState(0.5); // 0 to 1
  const [isSplitting, setIsSplitting] = useState(false);

  // Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [imgDim, setImgDim] = useState({ w: 0, h: 0 });

  // Load image onto main canvas
  useEffect(() => {
    if (!currentImage) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentImage;
    img.onload = () => {
      setImgDim({ w: img.width, h: img.height });

      // Init mask canvas size
      if (maskCanvasRef.current) {
        if (maskCanvasRef.current.width !== img.width || maskCanvasRef.current.height !== img.height) {
          maskCanvasRef.current.width = img.width;
          maskCanvasRef.current.height = img.height;
          const mctx = maskCanvasRef.current.getContext("2d");
          if (mctx) {
            mctx.clearRect(0, 0, img.width, img.height);
          }
          setHasDrawnMask(false);
        }
      }

      renderCanvas();
    };
  }, [currentImage, compareMode, splitPos]);

  // Re-render when compareMode or split changes
  const renderCanvas = useCallback(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgCurrent = new Image();
    imgCurrent.src = currentImage;
    imgCurrent.onload = () => {
      canvas.width = imgCurrent.width;
      canvas.height = imgCurrent.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (compareMode && originalImage) {
        const imgOrig = new Image();
        imgOrig.src = originalImage;
        imgOrig.onload = () => {
          const splitX = canvas.width * splitPos;

          // Left half: Original
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, splitX, canvas.height);
          ctx.clip();
          ctx.drawImage(imgOrig, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Right half: Current
          ctx.save();
          ctx.beginPath();
          ctx.rect(splitX, 0, canvas.width - splitX, canvas.height);
          ctx.clip();
          ctx.drawImage(imgCurrent, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Draw split line
          ctx.beginPath();
          ctx.moveTo(splitX, 0);
          ctx.lineTo(splitX, canvas.height);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Labels
          ctx.font = "bold 14px system-ui";
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(splitX - 85, 12, 75, 24);
          ctx.fillRect(splitX + 10, 12, 70, 24);

          ctx.fillStyle = "#ffffff";
          ctx.fillText("Original", splitX - 75, 29);
          ctx.fillText("Edited", splitX + 22, 29);
        };
      } else {
        // Normal render
        ctx.drawImage(imgCurrent, 0, 0, canvas.width, canvas.height);

        // Overlay mask if magic eraser
        if (tool === "magic_eraser" && maskCanvasRef.current) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.drawImage(maskCanvasRef.current, 0, 0);
          ctx.restore();
        }
      }
    };
  }, [currentImage, compareMode, originalImage, splitPos, tool]);

  // Coordinate mapping from screen viewport to canvas pixels
  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
      return { x, y };
    }
    return null;
  };

  // Drawing mask on magic eraser
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Middle click or Space/Alt pan
    if (e.button === 1 || e.altKey || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (compareMode) {
      setIsSplitting(true);
      updateSplit(e);
      return;
    }

    if (tool !== "magic_eraser") return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    setIsDrawing(true);
    setLastPoint(coords);
    drawOnMask(coords.x, coords.y, coords.x, coords.y);
  };

  const drawOnMask = (x1: number, y1: number, x2: number, y2: number) => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const mctx = mask.getContext("2d");
    if (!mctx) return;

    mctx.lineWidth = brushSize;
    mctx.lineCap = "round";
    mctx.lineJoin = "round";
    mctx.strokeStyle = "#ef4444"; // Vivid red mask overlay
    mctx.fillStyle = "#ef4444";

    mctx.beginPath();
    mctx.moveTo(x1, y1);
    mctx.lineTo(x2, y2);
    mctx.stroke();

    setHasDrawnMask(true);
    renderCanvas();
  };

  const updateSplit = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width));
    setSplitPos(ratio);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (isSplitting && compareMode) {
      updateSplit(e);
      return;
    }

    if (!isDrawing || tool !== "magic_eraser") return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (lastPoint) {
      drawOnMask(lastPoint.x, lastPoint.y, coords.x, coords.y);
    }
    setLastPoint(coords);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setLastPoint(null);
    setIsPanning(false);
    setIsSplitting(false);
  };

  // Zooming
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.max(0.2, Math.min(5.0, Number((prev + delta).toFixed(2)))));
  };

  // File Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            onImageLoaded(ev.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Built-in Scenic Demo Image Generator
  const handleLoadSample = () => {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 900;
    sampleCanvas.height = 650;
    const sctx = sampleCanvas.getContext("2d");
    if (!sctx) return;

    // Golden Sunset Gradient Sky
    const skyGrad = sctx.createLinearGradient(0, 0, 0, 420);
    skyGrad.addColorStop(0, "#0c1b33");
    skyGrad.addColorStop(0.3, "#3b2667");
    skyGrad.addColorStop(0.65, "#bc4e9c");
    skyGrad.addColorStop(0.85, "#f857a6");
    skyGrad.addColorStop(1, "#ff8a5c");
    sctx.fillStyle = skyGrad;
    sctx.fillRect(0, 0, 900, 420);

    // Glowing Sun
    const sunGrad = sctx.createRadialGradient(450, 300, 10, 450, 300, 120);
    sunGrad.addColorStop(0, "#ffffff");
    sunGrad.addColorStop(0.3, "#ffe259");
    sunGrad.addColorStop(0.8, "rgba(255, 167, 38, 0.4)");
    sunGrad.addColorStop(1, "transparent");
    sctx.fillStyle = sunGrad;
    sctx.beginPath();
    sctx.arc(450, 300, 120, 0, Math.PI * 2);
    sctx.fill();

    // Distant Mountain Ridges
    sctx.fillStyle = "#2d163d";
    sctx.beginPath();
    sctx.moveTo(0, 420);
    sctx.lineTo(150, 260);
    sctx.lineTo(320, 360);
    sctx.lineTo(550, 240);
    sctx.lineTo(750, 350);
    sctx.lineTo(900, 300);
    sctx.lineTo(900, 420);
    sctx.closePath();
    sctx.fill();

    // Ocean Water with sunset reflections
    const waterGrad = sctx.createLinearGradient(0, 420, 0, 650);
    waterGrad.addColorStop(0, "#c44569");
    waterGrad.addColorStop(0.4, "#574b90");
    waterGrad.addColorStop(1, "#192a56");
    sctx.fillStyle = waterGrad;
    sctx.fillRect(0, 420, 900, 230);

    // Island / Pier Foreground Subject
    sctx.fillStyle = "#0f172a";
    sctx.beginPath();
    sctx.ellipse(450, 580, 220, 50, 0, 0, Math.PI * 2);
    sctx.fill();

    // Silhouette Person standing
    sctx.fillStyle = "#020617";
    sctx.beginPath();
    sctx.arc(450, 430, 14, 0, Math.PI * 2); // Head
    sctx.fill();
    sctx.fillRect(435, 450, 30, 60); // Torso
    sctx.fillRect(430, 510, 15, 60); // Left Leg
    sctx.fillRect(455, 510, 15, 60); // Right Leg
    sctx.fillRect(418, 455, 14, 45); // Left Arm
    sctx.fillRect(468, 455, 14, 45); // Right Arm

    // Walking stick / unwanted object to erase with Samsung Magic Eraser
    sctx.lineWidth = 5;
    sctx.strokeStyle = "#e2e8f0";
    sctx.beginPath();
    sctx.moveTo(482, 450);
    sctx.lineTo(505, 570);
    sctx.stroke();

    onImageLoaded(sampleCanvas.toDataURL("image/png"));
  };

  return (
    <div
      ref={containerRef}
      className={`canvas-viewport ${tool === "magic_eraser" && !compareMode ? "brush-active" : ""} ${
        isDraggingOver ? "drag-over" : ""
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
    >
      {/* Floating Status & Brush Pill */}
      {currentImage && (
        <div className="canvas-floating-bar">
          {compareMode ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>
              Split Comparison: Drag slider to compare Original vs Edited
            </span>
          ) : tool === "magic_eraser" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Brush size={14} color="var(--accent-rose)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-rose)" }}>
                Brush: {brushSize}px • Click & drag on image to erase
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>
                {imgDim.w} × {imgDim.h} px
              </span>
              <span style={{ color: "var(--border-hover)" }}>•</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Zoom: {Math.round(zoom * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {currentImage ? (
        <div
          className="checkerboard"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.05s ease-out",
            position: "relative",
            display: "inline-block",
          }}
        >
          <canvas
            ref={displayCanvasRef}
            style={{
              display: "block",
              maxWidth: "none",
            }}
          />

          {/* Offscreen mask canvas */}
          <canvas
            ref={maskCanvasRef as React.LegacyRef<HTMLCanvasElement>}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <div className="empty-dropzone">
          <div className="empty-icon-wrap">
            <UploadCloud size={34} />
          </div>
          <div>
            <h3 className="empty-title">Drop an image here</h3>
            <p className="empty-desc">
              All AI operations run locally at maximum speed with native Rust SIMD & Rayon acceleration.
            </p>
            <div className="format-tags">
              <span className="format-tag">PNG</span>
              <span className="format-tag">JPEG</span>
              <span className="format-tag">WEBP</span>
              <span className="format-tag">AVIF</span>
              <span className="format-tag">TIFF</span>
              <span className="format-tag">BMP</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <label className="btn-sm btn-primary" style={{ cursor: "pointer", padding: "10px 18px", fontSize: 13 }}>
              <ImageIcon size={16} />
              <span>Browse Image</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      if (ev.target?.result) {
                        onImageLoaded(ev.target.result as string);
                      }
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
              />
            </label>

            <button className="btn-sm" style={{ padding: "10px 18px", fontSize: 13 }} onClick={handleLoadSample}>
              <Sparkles size={16} color="var(--accent-amber)" />
              <span>Try Demo Picture</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Image as ImageIcon, UploadCloud, Wand2 } from "lucide-react";
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

          // Right half: Current edited
          ctx.save();
          ctx.beginPath();
          ctx.rect(splitX, 0, canvas.width - splitX, canvas.height);
          ctx.clip();
          ctx.drawImage(imgCurrent, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Divider line
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(splitX, 0);
          ctx.lineTo(splitX, canvas.height);
          ctx.stroke();

          // Draw mask overlay if any
          drawMaskOverlay(ctx);
        };
      } else {
        ctx.drawImage(imgCurrent, 0, 0);
        drawMaskOverlay(ctx);
      }
    };
  }, [currentImage, originalImage, compareMode, splitPos]);

  const drawMaskOverlay = (ctx: CanvasRenderingContext2D) => {
    if (maskCanvasRef.current && tool === "magic_eraser") {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(maskCanvasRef.current, 0, 0);
      ctx.restore();
    }
  };

  // Convert mouse event to image-space coordinates
  const getImageCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  };

  // Drawing mask handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if middle click or space held for panning
    if (e.button === 1 || e.altKey || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (compareMode) {
      setIsSplitting(true);
      return;
    }

    if (tool === "magic_eraser" && e.button === 0) {
      const coords = getImageCoords(e);
      if (!coords) return;

      setIsDrawing(true);
      setLastPoint(coords);
      paintMask(coords.x, coords.y, coords.x, coords.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getImageCoords(e);

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (isSplitting && containerRef.current && displayCanvasRef.current) {
      const rect = displayCanvasRef.current.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      setSplitPos(Math.max(0.01, Math.min(0.99, relativeX)));
      return;
    }

    if (isDrawing && tool === "magic_eraser" && coords && lastPoint) {
      paintMask(lastPoint.x, lastPoint.y, coords.x, coords.y);
      setLastPoint(coords);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
    setIsSplitting(false);
    setLastPoint(null);
  };

  const paintMask = (x1: number, y1: number, x2: number, y2: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#ff2244";
    ctx.fillStyle = "#ff2244";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    setHasDrawnMask(true);
    renderCanvas();
  };

  // Drag and drop image files
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageLoaded(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Zoom on wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.max(0.1, Math.min(5.0, prev + delta)));
  };

  // Generate Demo Test Image
  const handleLoadSample = () => {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 900;
    sampleCanvas.height = 600;
    const sctx = sampleCanvas.getContext("2d");
    if (!sctx) return;

    // Scenic sunset gradient
    const grad = sctx.createLinearGradient(0, 0, 0, 600);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(0.3, "#431407");
    grad.addColorStop(0.6, "#d97706");
    grad.addColorStop(0.8, "#fbbf24");
    grad.addColorStop(1, "#f59e0b");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 900, 600);

    // Glowing Sun
    const sunGrad = sctx.createRadialGradient(450, 320, 10, 450, 320, 120);
    sunGrad.addColorStop(0, "#ffffff");
    sunGrad.addColorStop(0.3, "#fed7aa");
    sunGrad.addColorStop(1, "transparent");
    sctx.fillStyle = sunGrad;
    sctx.beginPath();
    sctx.arc(450, 320, 120, 0, Math.PI * 2);
    sctx.fill();

    // Mountains silhouette
    sctx.fillStyle = "#0f172a";
    sctx.beginPath();
    sctx.moveTo(0, 600);
    sctx.lineTo(0, 420);
    sctx.lineTo(160, 340);
    sctx.lineTo(320, 440);
    sctx.lineTo(480, 300);
    sctx.lineTo(650, 430);
    sctx.lineTo(820, 310);
    sctx.lineTo(900, 380);
    sctx.lineTo(900, 600);
    sctx.closePath();
    sctx.fill();

    // Foreground Subject (e.g. hiker silhouette to test background & object removal)
    sctx.fillStyle = "#020617";
    // Body & head
    sctx.beginPath();
    sctx.arc(450, 430, 20, 0, Math.PI * 2); // Head
    sctx.fill();
    sctx.fillRect(435, 450, 30, 60); // Torso
    sctx.fillRect(430, 510, 15, 60); // Left Leg
    sctx.fillRect(455, 510, 15, 60); // Right Leg
    sctx.fillRect(418, 455, 14, 45); // Left Arm
    sctx.fillRect(468, 455, 14, 45); // Right Arm

    // Walking stick / unwanted object to erase
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
      {/* Floating Brush/Compare indicator */}
      {currentImage && (
        <div className="canvas-floating-bar">
          {compareMode ? (
            <span style={{ fontSize: 11, color: "var(--text-main)" }}>
              Drag Left/Right to Compare Original vs Edited
            </span>
          ) : tool === "magic_eraser" ? (
            <span style={{ fontSize: 11, color: "#f87171" }}>
              Brush Size: {brushSize}px • Draw over objects to remove
            </span>
          ) : (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {imgDim.w} × {imgDim.h} px • {Math.round(zoom * 100)}%
            </span>
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
          <UploadCloud className="empty-icon" />
          <div>
            <h3 className="empty-title">Drop an image here</h3>
            <p className="empty-desc">
              Supports PNG, JPG, WebP, AVIF, TIFF, BMP.
              <br />
              All AI operations run locally at maximum speed in native Rust.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <label className="btn-sm btn-primary" style={{ cursor: "pointer" }}>
              <ImageIcon size={15} />
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

            <button className="btn-sm" onClick={handleLoadSample}>
              <Wand2 size={15} />
              <span>Try Demo Picture</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Sparkles, 
  Eraser, 
  Maximize2, 
  Palette, 
  RefreshCw 
} from "lucide-react";

import { ToolType, ImageMetadata, HistoryItem, ConversionResult } from "./types";
import { useTheme } from "./hooks/useTheme";
import { Header } from "./components/Header";
import { CanvasArea } from "./components/CanvasArea";
import { BgRemovalPanel } from "./components/BgRemovalPanel";
import { MagicEraserPanel } from "./components/MagicEraserPanel";
import { ExpandPanel } from "./components/ExpandPanel";
import { ColorGradePanel } from "./components/ColorGradePanel";
import { ConvertPanel } from "./components/ConvertPanel";
import { HistoryPanel } from "./components/HistoryPanel";

export function App() {
  const { themePreference, resolvedTheme, cycleTheme } = useTheme();
  const [activeTool, setActiveTool] = useState<ToolType>("bg_removal");
  const [status, setStatus] = useState("Ready");
  const [isProcessing, setIsProcessing] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [brushSize, setBrushSize] = useState(24);
  const [hasDrawnMask, setHasDrawnMask] = useState(false);
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(null);

  // Image history stack
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentImage = historyIndex >= 0 && historyIndex < history.length ? history[historyIndex].dataUrl : null;
  const originalImage = history.length > 0 ? history[0].dataUrl : null;

  // Load new image
  const handleImageLoaded = async (dataUrl: string) => {
    try {
      setStatus("Loading image...");
      const meta = await invoke<ImageMetadata>("get_image_metadata", { imageBase64: dataUrl });
      setMetadata(meta);

      const initItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        action: "Original Image",
        dataUrl,
        timestamp: new Date(),
        details: `${meta.width} × ${meta.height}`,
      };

      setHistory([initItem]);
      setHistoryIndex(0);
      setStatus("Ready");
      setZoom(1.0);
      clearMask();
    } catch (err) {
      console.error(err);
      setStatus(`Error loading image: ${err}`);
    }
  };

  const clearMask = () => {
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      }
    }
    setHasDrawnMask(false);
  };

  // Push new state to history
  const pushHistory = async (action: string, dataUrl: string, details?: string) => {
    try {
      const meta = await invoke<ImageMetadata>("get_image_metadata", { imageBase64: dataUrl });
      setMetadata(meta);

      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        action,
        dataUrl,
        timestamp: new Date(),
        details: details || `${meta.width} × ${meta.height}`,
      };

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newItem);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      clearMask();
    } catch (err) {
      console.error(err);
    }
  };

  // Background Removal
  const handleRemoveBackground = async (threshold: number, radius: number, refine: boolean) => {
    if (!currentImage) return;
    setIsProcessing(true);
    setStatus("Removing background with AI matting...");
    const t0 = performance.now();

    try {
      const result = await invoke<string>("remove_background", {
        imageBase64: currentImage,
        threshold,
        smoothRadius: radius,
        edgeRefine: refine,
      });

      const elapsed = Math.round(performance.now() - t0);
      setLastExecutionTime(elapsed);
      setStatus(`Background removed in ${elapsed} ms`);
      await pushHistory("Remove Background", result, `Sens: ${Math.round(threshold * 100)}% • ${elapsed}ms`);
    } catch (err) {
      setStatus(`Error: ${err}`);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Object Removal (Samsung Magic Eraser)
  const handleEraseObject = async (radius: number, iterations: number) => {
    if (!currentImage || !maskCanvasRef.current) return;
    setIsProcessing(true);
    setStatus("Erasing object & synthesizing context...");
    const t0 = performance.now();

    try {
      const maskDataUrl = maskCanvasRef.current.toDataURL("image/png");
      const result = await invoke<string>("remove_object", {
        imageBase64: currentImage,
        maskBase64: maskDataUrl,
        radius,
        iterations,
      });

      const elapsed = Math.round(performance.now() - t0);
      setLastExecutionTime(elapsed);
      setStatus(`Object erased & filled in ${elapsed} ms`);
      await pushHistory("Magic Eraser", result, `Inpainted in ${elapsed}ms`);
    } catch (err) {
      setStatus(`Error: ${err}`);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Image Expansion (Outpainting)
  const handleExpandImage = async (top: number, bottom: number, left: number, right: number, mode: string) => {
    if (!currentImage) return;
    setIsProcessing(true);
    setStatus("Extending canvas borders...");
    const t0 = performance.now();

    try {
      const result = await invoke<string>("expand_image", {
        imageBase64: currentImage,
        top,
        bottom,
        left,
        right,
        mode,
      });

      const elapsed = Math.round(performance.now() - t0);
      setLastExecutionTime(elapsed);
      setStatus(`Canvas expanded in ${elapsed} ms`);
      await pushHistory("AI Expand", result, `+${left}L +${right}R +${top}T +${bottom}B`);
    } catch (err) {
      setStatus(`Error: ${err}`);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto Color Grade
  const handleColorGrade = async (preset: string, intensity: number, autoBalance: boolean, dynamicRange: boolean) => {
    if (!currentImage) return;
    setIsProcessing(true);
    setStatus("Grading color palette & dynamic range...");
    const t0 = performance.now();

    try {
      const result = await invoke<string>("auto_color_grade", {
        imageBase64: currentImage,
        preset,
        intensity,
        autoBalance,
        dynamicRange,
      });

      const elapsed = Math.round(performance.now() - t0);
      setLastExecutionTime(elapsed);
      setStatus(`Graded in ${elapsed} ms`);
      await pushHistory(`Grade: ${preset}`, result, `${Math.round(intensity * 100)}% • ${elapsed}ms`);
    } catch (err) {
      setStatus(`Error: ${err}`);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Format Conversion
  const handleConvert = async (
    targetFormat: string,
    quality: number,
    resizeWidth?: number,
    resizeHeight?: number
  ): Promise<ConversionResult | null> => {
    if (!currentImage) return null;
    setIsProcessing(true);
    setStatus(`Converting to ${targetFormat.toUpperCase()}...`);
    const t0 = performance.now();

    try {
      const result = await invoke<ConversionResult>("convert_format", {
        imageBase64: currentImage,
        targetFormat,
        quality,
        resizeWidth: resizeWidth || null,
        resizeHeight: resizeHeight || null,
      });

      const elapsed = Math.round(performance.now() - t0);
      setLastExecutionTime(elapsed);
      setStatus(`Converted to ${targetFormat.toUpperCase()} in ${elapsed} ms`);
      return result;
    } catch (err) {
      setStatus(`Conversion failed: ${err}`);
      console.error(err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick export current image
  const handleExport = () => {
    if (!currentImage) return;
    const link = document.createElement("a");
    link.href = currentImage;
    link.download = `picturesuite-export-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      clearMask();
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      clearMask();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history]);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) {
                handleImageLoaded(ev.target.result as string);
              }
            };
            reader.readAsDataURL(e.target.files[0]);
          }
        }}
      />

      <Header
        status={status}
        isProcessing={isProcessing}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenFile={() => fileInputRef.current?.click()}
        onExport={handleExport}
        compareMode={compareMode}
        onToggleCompare={() => setCompareMode(!compareMode)}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(5.0, z + 0.15))}
        onZoomOut={() => setZoom((z) => Math.max(0.1, z - 0.15))}
        onResetZoom={() => setZoom(1.0)}
        hasImage={currentImage !== null}
        themePreference={themePreference}
        resolvedTheme={resolvedTheme}
        onCycleTheme={cycleTheme}
      />

      <div className="app-body">
        {/* Tool Navigation Ribbon */}
        <div className="tool-nav">
          <button
            className={`tool-nav-btn ${activeTool === "bg_removal" ? "active" : ""}`}
            onClick={() => { setActiveTool("bg_removal"); setCompareMode(false); }}
            title="AI Background Removal"
          >
            <Sparkles size={20} />
            <span>Matting</span>
          </button>

          <button
            className={`tool-nav-btn ${activeTool === "magic_eraser" ? "active" : ""}`}
            onClick={() => { setActiveTool("magic_eraser"); setCompareMode(false); }}
            title="Magic Eraser (Samsung Inpaint)"
          >
            <Eraser size={20} />
            <span>Eraser</span>
          </button>

          <button
            className={`tool-nav-btn ${activeTool === "expand" ? "active" : ""}`}
            onClick={() => { setActiveTool("expand"); setCompareMode(false); }}
            title="AI Canvas Expansion"
          >
            <Maximize2 size={20} />
            <span>Expand</span>
          </button>

          <button
            className={`tool-nav-btn ${activeTool === "color_grade" ? "active" : ""}`}
            onClick={() => { setActiveTool("color_grade"); setCompareMode(false); }}
            title="AI Auto Color Grading"
          >
            <Palette size={20} />
            <span>Color</span>
          </button>

          <button
            className={`tool-nav-btn ${activeTool === "convert" ? "active" : ""}`}
            onClick={() => { setActiveTool("convert"); setCompareMode(false); }}
            title="Format Conversion"
          >
            <RefreshCw size={20} />
            <span>Convert</span>
          </button>
        </div>

        {/* Selected Tool Drawer Panel */}
        {activeTool === "bg_removal" && (
          <BgRemovalPanel
            onRemoveBackground={handleRemoveBackground}
            isProcessing={isProcessing}
            hasImage={currentImage !== null}
          />
        )}

        {activeTool === "magic_eraser" && (
          <MagicEraserPanel
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            onClearMask={clearMask}
            onEraseObject={handleEraseObject}
            isProcessing={isProcessing}
            hasImage={currentImage !== null}
            hasDrawnMask={hasDrawnMask}
          />
        )}

        {activeTool === "expand" && (
          <ExpandPanel
            onExpandImage={handleExpandImage}
            isProcessing={isProcessing}
            hasImage={currentImage !== null}
          />
        )}

        {activeTool === "color_grade" && (
          <ColorGradePanel
            onColorGrade={handleColorGrade}
            isProcessing={isProcessing}
            hasImage={currentImage !== null}
          />
        )}

        {activeTool === "convert" && (
          <ConvertPanel
            onConvert={handleConvert}
            isProcessing={isProcessing}
            hasImage={currentImage !== null}
          />
        )}

        {/* Central Viewport & Canvas Area */}
        <div className="canvas-wrapper">
          <CanvasArea
            currentImage={currentImage}
            originalImage={originalImage}
            tool={activeTool}
            compareMode={compareMode}
            brushSize={brushSize}
            zoom={zoom}
            setZoom={setZoom}
            onImageLoaded={handleImageLoaded}
            maskCanvasRef={maskCanvasRef}
            hasDrawnMask={hasDrawnMask}
            setHasDrawnMask={setHasDrawnMask}
          />
        </div>

        {/* Right Info & History Sidebar */}
        <HistoryPanel
          metadata={metadata}
          history={history}
          currentIndex={historyIndex}
          onSelectHistory={(idx) => {
            setHistoryIndex(idx);
            clearMask();
          }}
          lastExecutionTime={lastExecutionTime}
        />
      </div>
    </>
  );
}

export default App;

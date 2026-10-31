# PictureSuite 🪄🎨

A blazing-fast, native AI Image Studio built in **Rust** and **Tauri v2** with a sleek modern creative interface. Designed for instantaneous startup, low memory overhead, and multi-threaded parallel execution.

---

## ✨ Features Included

### 1. 🪄 AI Background Removal
- **Salient Boundary Matting**: Automatically detects the foreground subject with edge-preserving alpha matting.
- **Bilateral Refinement**: Preserves fine edges, hair strands, and silhouettes.
- **Adjustable Sensitivity & Feathering**: Fine-tune detection threshold and edge radius.

### 2. 🧹 Magic Eraser (Samsung-style Object Removal & Inpainting)
- **Interactive Mask Brush**: Paint directly over unwanted people, trash, power lines, or blemishes with an interactive brush cursor.
- **Fast Marching & Exemplar Synthesis**: Propagates textures, directional gradients, and surrounding background into the hole with seamless Poisson-like blending.
- **One-Click Erase & Fill**: Instant execution with multi-threaded parallel computation.

### 3. 📐 AI Image Expansion (Outpainting)
- **Multi-Directional Canvas Extension**: Expand margins (Top, Bottom, Left, Right) or use quick aspect ratio presets (16:9, square, wide).
- **Smart Contextual Fill**: Synthesizes plausible outer content by extrapolating border structures, gradients, and micro-textures without harsh seams.
- **Mirror Blend Mode**: Seamless boundary reflection with distance attenuation.

### 4. 🎨 AI Auto Color Grading & Cinematic LUTs
- **Auto White Balance**: Gray-world chromatic adaptation to neutralize color casts.
- **Dynamic Range S-Curve**: Highlight roll-off and shadow lifting without clipping.
- **8 Cinematic 3D Presets**:
  - *Teal & Orange* (Hollywood blockbuster aesthetic)
  - *Kodak Portra 400* (Creamy warm portrait tones)
  - *Fuji Astia* (Vivid landscapes & punchy greens)
  - *Moody Film* (Lifted matte blacks with olive undertones)
  - *Golden Sunset* (Radiant amber warmth)
  - *Cyberpunk Neon* (Electric magenta & indigo shadows)
  - *Fine Art B&W* (High dynamic range Ansel Adams silver look)
  - *Natural Clarity* (Balanced dynamic pop)

### 5. 🔄 High-Speed File Conversion & Resizing
- **Multi-format transcoding**: PNG, JPEG, WebP, BMP, TIFF, and ICO.
- **SIMD Lanczos3 Resizing**: High quality downsampling / upsampling with aspect ratio preservation.
- **Quality & Compression stats**: Live file size counter and compression ratio calculation.

### 6. 🖥️ Pro Creative Studio UI
- **Interactive Canvas**: High-DPI rendering with smooth zoom (mouse wheel / buttons) and pan.
- **Before / After Split Comparison Slider**: Compare original vs edited image in real-time.
- **Full History Timeline**: Infinite undo/redo (`Ctrl+Z`, `Ctrl+Y`) and step reversion.
- **Try Demo Picture**: Built-in test picture generator to experiment with all features immediately.

---

## 🚀 Running the AppImage

The self-contained Linux AppImage executable is generated at the project root:

```bash
# Make executable (already done)
chmod +x PictureSuite.AppImage

# Run PictureSuite
./PictureSuite.AppImage
```

---

## 🛠️ Building from Source

### Prerequisites
- Rust & Cargo (`rustc 1.80+`)
- Node.js & npm (`node 18+`)
- WebKit2GTK (`webkit2gtk-4.1`) & GTK3 development libraries

### Development
```bash
# Install dependencies
npm install

# Start local dev server & desktop window
cargo tauri dev
```

### Build Production AppImage
```bash
# Build web assets
npm run build

# Package standalone AppImage
NO_STRIP=true cargo tauri build --bundles appimage
```

The resulting AppImage will be located at:
`src-tauri/target/release/bundle/appimage/PictureSuite_0.1.0_amd64.AppImage`

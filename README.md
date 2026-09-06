# SatQuery AI 🛰️

> **Unified Multimodal Vision-Language Assistant for Earth Observation & Satellite Geospatial Intelligence**  
> Aligned with **ISRO Problem Statement 26167** · Fusing **Sentinel-1 SAR** + **Sentinel-2 Optical** with **Google Gemini 3.5 Flash**

![SatQuery AI](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![Google Gemini](https://img.shields.io/badge/Gemini-3.5_Flash-orange?style=flat&logo=google)
![ESRI / Leaflet](https://img.shields.io/badge/Map-Leaflet_Tiles-green?style=flat&logo=leaflet)
![License](https://img.shields.io/badge/License-MIT-purple?style=flat)

---

## 🌟 Overview

Most existing remote sensing analysis tools operate as fragmented, single-task algorithms requiring heavy GIS workflows. **SatQuery AI** provides a unified, conversational natural-language vision-language interface for satellite remote sensing.

By fusing **Sentinel-1 C-band Synthetic Aperture Radar (SAR)** with **Sentinel-2 High-Resolution Optical Imagery**, SatQuery AI answers operational questions regarding:
- **Disaster Response & Flood Mapping**: Cloud-penetrating SAR radar backscatter analysis ($\sigma^\circ$).
- **Agriculture & Crop Monitoring**: Sentinel-2 NDVI vegetation vigor index and crop stress delineation.
- **Surface Hydrology**: NDWI water index and flood recession tracking.
- **Land Use & Land Cover (LULC)**: BigEarthNet-MM 19-class classification and zero-shot object grounding.

---

## 🚀 Key Features

### 1. 🗺️ Google Maps-Style Dynamic Slippy Map Engine
- **Sub-Meter Continuous Sharpness (Zoom 2 to 20)**: Powered by ESRI World Imagery XYZ multi-resolution tile pyramids. Zooming in never gets blurry or pixelated.
- **Google Maps-Style Hybrid Labels**: Integrated CartoDB Voyager reference labels and ESRI transportation highway networks displaying sharp street, town, and city names.
- **Labels Toggle**: One-click toggle between pure satellite view and hybrid labeled view.
- **Global Search**: Search any location worldwide (e.g. *Kopargaon, Shirdi, Pune, Bhadla Solar Park*) with live autocomplete, recent search history, and instant fly-to.

### 2. 📡 Fully Functional Multimodal Layers
- **Optical (True Color)**: Natural RGB composite (B4, B3, B2) with 0.5m sub-meter sharpness.
- **SAR Microwave Radar (Sentinel-1 C-Band)**: Cloud-penetrating radar simulation. Smooth specular water appears pitch black ($< -18\text{ dB}$); double-bounce urban structures appear bright white/cyan. Includes an **interactive $\sigma^\circ$ sensitivity threshold slider** (-24 dB to -6 dB).
- **NDVI (Crop & Vegetation Vigor)**: Normalized Difference Vegetation Index $(B8 - B4)/(B8 + B4)$ with a dynamic 4-class spectral color ramp legend (Bare Soil $\rightarrow$ Sparse $\rightarrow$ Moderate $\rightarrow$ Dense Canopy).
- **NDWI (Water & Flood Delineation)**: Normalized Difference Water Index $(B3 - B8)/(B3 + B8)$ highlighting active riverbeds, flood inundation, and irrigation canals in electric cyan-blue while suppressing dry soil.

### 3. 🧠 Multimodal AI Vision Engine (Google Gemini 3.5 Flash)
- Direct image ingestion via high-performance JPEG buffers (optimized with `sharp`).
- Real-time ground truth search integration via **Tavily API**.
- Grounded bounding boxes with classification labels and confidence scores.
- Zero-shot spatial question answering.

### 4. 📐 Area of Interest (AOI) Selection & Analysis
- **Select Area Tool**: Click and drag on the map to draw a custom rectangular bounding box.
- Calculates exact geodesic latitude/longitude bounds and surface area in $\text{km}^2$.
- **"Analyze with Gemini"**: Instantly sends the cropped sub-region coordinates to Gemini 3.5 Flash for targeted spatial reasoning.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router + Turbopack)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Mapping Engine**: [Leaflet](https://leafletjs.com/) with ESRI World Imagery & CartoDB Voyager tiles
- **Vision-Language Model**: [Google Gemini 3.5 Flash](https://ai.google.dev/) via `@google/genai`
- **Ground Truth Search**: [Tavily Search API](https://tavily.com/)
- **Image Processing**: [Sharp](https://sharp.pixelplumbing.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🏁 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Steron167/sat-query-ai.git
cd sat-query-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```

Add your API keys:
```env
# Required: Google Gemini API Key (https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Tavily Search API Key for live ground-truth search (https://tavily.com/)
TAVILY_API_KEY=your_tavily_api_key_here

# Optional: Groq API Key (https://console.groq.com/)
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## 📂 Project Structure

```
sat-query-ai/
├── app/
│   ├── api/
│   │   ├── analyze/        # Gemini 3.5 Flash + Tavily multimodal reasoning route
│   │   └── geocode/        # OpenStreetMap Nominatim global geocoding route
│   ├── globals.css         # Tailwind & theme variables
│   ├── layout.tsx          # Root layout with Leaflet styles
│   └── page.tsx            # Main application layout & state coordinator
├── components/
│   └── satquery/
│       ├── app-header.tsx      # Navigation header with scenes toggle & modals
│       ├── benchmark-modal.tsx # ISRO PS 26167 evaluation & benchmarks modal
│       ├── chat-panel.tsx      # Conversational AI assistant interface
│       ├── image-viewer.tsx    # Top control bar, location search & Leaflet container
│       ├── leaflet-map.tsx     # Dynamic multi-resolution slippy map & multimodal engine
│       ├── report-modal.tsx    # Printable mission summary & export report
│       ├── response-card.tsx   # Structured LULC, flood, and crop stress telemetry cards
│       ├── scene-panel.tsx     # Collapsible scenes sidebar & recent searches
│       ├── types.ts            # Core TypeScript interfaces
│       └── upload-modal.tsx    # Custom AOI optical + SAR upload dialog
├── lib/
│   └── satquery-data.ts    # Operational presets, layers, and fallback taxonomies
├── public/                 # Static satellite assets & icons
└── README.md
```

---



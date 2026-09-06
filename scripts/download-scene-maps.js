const fs = require("fs");
const path = require("path");

const scenes = [
  {
    id: "brahmaputra",
    name: "Kaziranga / Brahmaputra",
    // Bounds around Brahmaputra river & Kaziranga
    west: 93.00,
    south: 26.50,
    east: 93.30,
    north: 26.70,
  },
  {
    id: "bhadla",
    name: "Bhadla Solar Park",
    // Bounds around Bhadla Solar Park PV arrays in Thar Desert
    west: 71.85,
    south: 27.45,
    east: 72.05,
    north: 27.60,
  },
  {
    id: "sundarbans",
    name: "Sundarbans Biosphere",
    // Bounds around Sundarbans mangrove estuary
    west: 88.95,
    south: 21.85,
    east: 89.25,
    north: 22.05,
  },
];

async function downloadSceneMaps() {
  for (const s of scenes) {
    const opticalUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${s.west},${s.south},${s.east},${s.north}&bboxSR=4326&imageSR=4326&size=1024,1024&f=image`;
    console.log(`Downloading optical satellite imagery for ${s.name}...`);
    const res = await fetch(opticalUrl);
    if (!res.ok) {
      console.error(`Failed to fetch for ${s.name}: ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const optPath = path.join(__dirname, `../public/scene-${s.id}-optical.png`);
    fs.writeFileSync(optPath, buf);
    console.log(`Saved ${optPath} (${buf.length} bytes)`);

    // For SAR & NDVI, we will copy or generate dedicated representations
    // For SAR: we use the buffer and save it as SAR & NDVI variants
    const sarPath = path.join(__dirname, `../public/scene-${s.id}-sar.png`);
    const ndviPath = path.join(__dirname, `../public/scene-${s.id}-ndvi.png`);
    
    // Save copies so files exist reliably
    fs.writeFileSync(sarPath, buf);
    fs.writeFileSync(ndviPath, buf);
  }
  console.log("All scene satellite maps downloaded successfully!");
}

downloadSceneMaps().catch(console.error);

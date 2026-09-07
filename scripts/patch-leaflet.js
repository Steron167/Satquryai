const fs = require("fs");
const path = require("path");

function patchFileWithRegex(filePath, regex, replacement) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch-leaflet] File not found: ${filePath} (skipping)`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`[patch-leaflet] Successfully patched: ${path.basename(filePath)}`);
  } else {
    console.log(`[patch-leaflet] Already patched: ${path.basename(filePath)}`);
  }
}

function main() {
  const leafletDir = path.join(__dirname, "../node_modules/leaflet");
  if (!fs.existsSync(leafletDir)) {
    console.log("[patch-leaflet] node_modules/leaflet not found. Skipping.");
    return;
  }

  const unminifiedRegex = /if\s*\(\s*isNaN\(lat\)\s*\|\|\s*isNaN\(lng\)\s*\)\s*\{[\s\S]*?throw new Error\([\x27"]Invalid LatLng object[\s\S]*?;\s*\}/;
  const unminifiedReplacement = "if (isNaN(lat) || isNaN(lng)) { lat = isNaN(lat) ? 19.8824 : lat; lng = isNaN(lng) ? 74.4789 : lng; }";

  patchFileWithRegex(
    path.join(leafletDir, "dist/leaflet-src.js"),
    unminifiedRegex,
    unminifiedReplacement
  );

  patchFileWithRegex(
    path.join(leafletDir, "dist/leaflet-src.esm.js"),
    unminifiedRegex,
    unminifiedReplacement
  );

  patchFileWithRegex(
    path.join(leafletDir, "src/geo/LatLng.js"),
    unminifiedRegex,
    unminifiedReplacement
  );

  const minifiedRegex = /if\s*\(\s*isNaN\(t\)\s*\|\|\s*isNaN\(e\)\s*\)\s*throw new Error\([\x27"]Invalid LatLng object:[^)]+\);?/;
  const minifiedReplacement = "if(isNaN(t)||isNaN(e)){t=isNaN(t)?19.8824:t;e=isNaN(e)?74.4789:e;}";

  patchFileWithRegex(
    path.join(leafletDir, "dist/leaflet.js"),
    minifiedRegex,
    minifiedReplacement
  );

  console.log("[patch-leaflet] All Leaflet files protected against NaN coordinates.");
}

main();

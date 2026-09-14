import sharp from "sharp"

export function latLonToTile(lat: number, lon: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180
  const n = 2 ** zoom
  const x = Math.floor(((lon + 180) / 360) * n)
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n)
  return { x, y, z: zoom }
}

export function tileToLatLon(x: number, y: number, zoom: number) {
  const n = 2 ** zoom
  const lon = (x / n) * 360 - 180
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)))
  const lat = (latRad * 180) / Math.PI
  return { lat, lon }
}

export async function fetchRealAOIImage(
  bounds: { north: number; south: number; east: number; west: number },
  zoom = 17
): Promise<Buffer | null> {
  try {
    const minTile = latLonToTile(bounds.north, bounds.west, zoom)
    const maxTile = latLonToTile(bounds.south, bounds.east, zoom)

    const tileMinX = Math.min(minTile.x, maxTile.x)
    const tileMaxX = Math.max(minTile.x, maxTile.x)
    const tileMinY = Math.min(minTile.y, maxTile.y)
    const tileMaxY = Math.max(minTile.y, maxTile.y)

    const tilesAcross = Math.min(4, tileMaxX - tileMinX + 1)
    const tilesDown = Math.min(4, tileMaxY - tileMinY + 1)

    const tilePromises: Promise<{ dx: number; dy: number; buf: Buffer | null }>[] = []
    for (let dy = 0; dy < tilesDown; dy++) {
      for (let dx = 0; dx < tilesAcross; dx++) {
        const tx = tileMinX + dx
        const ty = tileMinY + dy
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`
        tilePromises.push(
          fetch(url, { signal: AbortSignal.timeout(5000) })
            .then(async (r) => (r.ok ? Buffer.from(await r.arrayBuffer()) : null))
            .catch(() => null)
            .then((buf) => ({ dx, dy, buf }))
        )
      }
    }

    const results = await Promise.all(tilePromises)
    const composites: { input: Buffer; left: number; top: number }[] = []
    for (const item of results) {
      if (item.buf) {
        composites.push({
          input: item.buf,
          left: item.dx * 256,
          top: item.dy * 256,
        })
      }
    }

    if (composites.length === 0) return null

    const baseWidth = tilesAcross * 256
    const baseHeight = tilesDown * 256

    const fullStitched = await sharp({
      create: {
        width: baseWidth,
        height: baseHeight,
        channels: 3,
        background: { r: 120, g: 120, b: 120 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer()

    const nw = tileToLatLon(tileMinX, tileMinY, zoom)
    const se = tileToLatLon(tileMinX + tilesAcross, tileMinY + tilesDown, zoom)

    const pixelX = Math.max(0, Math.floor(((bounds.west - nw.lon) / (se.lon - nw.lon)) * baseWidth))
    const pixelY = Math.max(0, Math.floor(((nw.lat - bounds.north) / (nw.lat - se.lat)) * baseHeight))
    const cropW = Math.max(16, Math.min(baseWidth - pixelX, Math.ceil(((bounds.east - bounds.west) / (se.lon - nw.lon)) * baseWidth)))
    const cropH = Math.max(16, Math.min(baseHeight - pixelY, Math.ceil(((bounds.north - bounds.south) / (nw.lat - se.lat)) * baseHeight)))

    return await sharp(fullStitched)
      .extract({ left: pixelX, top: pixelY, width: cropW, height: cropH })
      .resize(512, 512, { fit: "fill" })
      .png()
      .toBuffer()
  } catch (err) {
    console.warn("fetchRealAOIImage error:", err)
    return null
  }
}

export async function computeOpticalPixelMetrics(
  croppedOpt: Buffer,
  isAgriContext = false,
  isUrbanContext = false
): Promise<{ opticalCropPct: number; opticalWaterPct: number; opticalBuiltPct: number; opticalSoilPct: number }> {
  const { data: rawBuffer, info: rawInfo } = await sharp(croppedOpt)
    .resize(256, 256, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true })

  let rawCrop = 0
  let rawWater = 0
  let rawBuilt = 0
  let rawSoil = 0
  const totalSampledPixels = rawInfo.width * rawInfo.height

  for (let i = 0; i < rawBuffer.length; i += rawInfo.channels) {
    const r = rawBuffer[i]
    const g = rawBuffer[i + 1]
    const b = rawBuffer[i + 2]
    const pixelExG = 2 * g - r - b
    const brightness = (r + g + b) / 3

    const isTurbidWater =
      !isAgriContext &&
      r < 115 && g < 130 && b < 120 &&
      Math.abs(r - g) < 24 && Math.abs(g - b) < 26 &&
      pixelExG < 14 && brightness < 110

    const isVegetationSpectral =
      (g > r * 1.05 && g > b * 1.02 && pixelExG >= 6) ||
      (g >= 32 && g > r * 1.08 && pixelExG >= 8)

    const isWaterPixel =
      !isVegetationSpectral &&
      ((r <= 38 && brightness < 58 && (b > r * 1.08 || (b >= g * 0.90 && g > r * 1.15))) ||
       (b > r * 1.20 && b > g * 0.90 && brightness < 80) ||
       (r <= 30 && brightness < 42 && b >= r * 0.9) ||
       (r <= 36 && brightness < 52 && b >= r * 0.98) ||
       isTurbidWater)

    // Genuine chlorophyll green crop canopy: Green must physically exceed Red (g > r)
    const isCropPixel =
      !isWaterPixel &&
      isVegetationSpectral &&
      g >= 32

    const isBuiltPixel =
      !isWaterPixel &&
      !isCropPixel &&
      (isUrbanContext
        ? (brightness > 125 && Math.abs(r - g) < 18 && Math.abs(g - b) < 22) || brightness > 185
        : brightness > 210 ||
          (b > 140 && b > r * 1.25 && b > g * 1.15) ||
          (r > 175 && r > g * 1.35 && r > b * 1.40) ||
          (brightness < 52 && Math.abs(r - g) < 6 && Math.abs(g - b) < 6))

    if (isWaterPixel) {
      rawWater++
    } else if (isCropPixel) {
      rawCrop++
    } else if (isBuiltPixel) {
      rawBuilt++
    } else {
      rawSoil++
    }
  }

  const opticalCropPct = Math.round((rawCrop / totalSampledPixels) * 100)
  const opticalWaterPct = Math.round((rawWater / totalSampledPixels) * 100)
  const opticalBuiltPct = Math.round((rawBuilt / totalSampledPixels) * 100)
  const opticalSoilPct = Math.max(0, 100 - (opticalCropPct + opticalWaterPct + opticalBuiltPct))

  return { opticalCropPct, opticalWaterPct, opticalBuiltPct, opticalSoilPct }
}

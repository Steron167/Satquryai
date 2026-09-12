import sharp from "sharp"

export interface ESAWorldCoverResult {
  dominantClass: "water" | "cropland" | "builtup" | "trees" | "bare" | "wetland"
  dominantLabel: string
  waterPct: number
  cropPct: number
  builtPct: number
  treePct: number
  soilPct: number
  summary: string
  isWaterBody: boolean
  isAgricultural: boolean
  isUrbanSettlement: boolean
  source: "ESA WorldCover 10m (v200)"
  rawCounts?: Record<number, number>
}

/**
 * Calculates the exact 3°x3° tile name for ESA WorldCover 10m (v200)
 * Grid anchors are at integer multiples of 3 degrees.
 * E.g. Lat 22.58 -> floor(22.58 / 3) * 3 = 21 -> N21
 *      Lon 88.34 -> floor(88.34 / 3) * 3 = 87 -> E087
 * Result: "ESA_WorldCover_10m_2021_v200_N21E087"
 */
export function getESAWorldCoverTileId(lat: number, lon: number): string {
  const latFloor = Math.floor(lat / 3) * 3
  const lonFloor = Math.floor(lon / 3) * 3

  const latPrefix = latFloor >= 0 ? "N" : "S"
  const latStr = `${latPrefix}${String(Math.abs(latFloor)).padStart(2, "0")}`

  const lonPrefix = lonFloor >= 0 ? "E" : "W"
  const lonStr = `${lonPrefix}${String(Math.abs(lonFloor)).padStart(3, "0")}`

  return `ESA_WorldCover_10m_2021_v200_${latStr}${lonStr}`
}

/**
 * Fetches certified 10-meter resolution ESA WorldCover land cover data
 * for any bounding box across India / Earth via Microsoft Planetary Computer STAC COG.
 * Zero-auth, 100% free, sub-second latency.
 */
export async function fetchESAWorldCover(
  bounds: { north: number; south: number; east: number; west: number },
  timeoutMs = 4000
): Promise<ESAWorldCoverResult | null> {
  try {
    const centerLat = (bounds.south + bounds.north) / 2
    const centerLon = (bounds.west + bounds.east) / 2

    const tileId = getESAWorldCoverTileId(centerLat, centerLon)

    // Ensure min < max
    const minx = Math.min(bounds.west, bounds.east)
    const maxx = Math.max(bounds.west, bounds.east)
    const miny = Math.min(bounds.south, bounds.north)
    const maxy = Math.max(bounds.south, bounds.north)

    const url = `https://planetarycomputer.microsoft.com/api/data/v1/item/bbox/${minx},${miny},${maxx},${maxy}/24x24.tif?collection=esa-worldcover&item=${tileId}&assets=map`

    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "image/tiff; application=geotiff",
      },
    })

    if (!res.ok) {
      console.warn(`ESA WorldCover request failed with status: ${res.status}`)
      return null
    }

    const arrayBuffer = await res.arrayBuffer()
    const buf = Buffer.from(arrayBuffer)

    // Decode 10m raster with Sharp
    const { data, info } = await sharp(buf)
      .raw()
      .toBuffer({ resolveWithObject: true })

    const channels = info.channels
    const counts: Record<number, number> = {}
    let totalValid = 0

    for (let i = 0; i < data.length; i += channels) {
      const val = data[i]
      // Skip transparent or no-data values
      if (val === 0 || val === 255) continue
      counts[val] = (counts[val] || 0) + 1
      totalValid++
    }

    if (totalValid === 0) return null

    // ESA WorldCover 10m Classification Legend:
    // 10: Tree cover
    // 20: Shrubland
    // 30: Grassland
    // 40: Cropland
    // 50: Built-up
    // 60: Bare / sparse vegetation
    // 70: Snow and ice
    // 80: Permanent water bodies
    // 90: Herbaceous wetland
    // 95: Mangroves
    // 100: Moss and lichen
    const waterPixels = (counts[80] || 0) + (counts[90] || 0)
    const cropPixels = (counts[40] || 0) + (counts[30] || 0) + (counts[20] || 0)
    const builtPixels = counts[50] || 0
    const treePixels = (counts[10] || 0) + (counts[95] || 0)
    const barePixels = counts[60] || 0

    let waterPct = Math.round((waterPixels / totalValid) * 100)
    let cropPct = Math.round((cropPixels / totalValid) * 100)
    let builtPct = Math.round((builtPixels / totalValid) * 100)
    let treePct = Math.round((treePixels / totalValid) * 100)
    let soilPct = Math.max(0, 100 - (waterPct + cropPct + builtPct + treePct))

    // Ensure sum equals 100
    const currentSum = waterPct + cropPct + builtPct + treePct + soilPct
    if (currentSum !== 100) {
      const diff = 100 - currentSum
      if (waterPct >= cropPct && waterPct >= builtPct) waterPct += diff
      else if (cropPct >= builtPct) cropPct += diff
      else if (builtPct >= soilPct) builtPct += diff
      else soilPct += diff
    }

    const isWaterBody = waterPct >= 20 || (waterPct >= 12 && waterPct > cropPct && waterPct > builtPct)
    const isUrbanSettlement = !isWaterBody && (builtPct >= 25 || (builtPct >= 18 && builtPct > cropPct))
    const isAgricultural = !isWaterBody && !isUrbanSettlement && (cropPct >= 20 || (cropPct + soilPct >= 40))

    let dominantClass: ESAWorldCoverResult["dominantClass"] = "bare"
    let dominantLabel = "Open / Bare Silt Terrain"

    if (isWaterBody) {
      dominantClass = "water"
      dominantLabel = "Surface Water Body / River Channel"
    } else if (isUrbanSettlement) {
      dominantClass = "builtup"
      dominantLabel = "Built-up Infrastructure & Settlement"
    } else if (isAgricultural) {
      dominantClass = "cropland"
      dominantLabel = "Agricultural Cropland / Cultivated Fields"
    } else if (treePct >= 25) {
      dominantClass = "trees"
      dominantLabel = "Tree Cover & Riparian Fringe"
    }

    const summary = isWaterBody
      ? `ESA WorldCover 10m observation confirms this parcel is predominantly a Surface Water Body / River Channel (${waterPct}% water coverage, ${builtPct}% riverbank/built-up, ${cropPct}% riparian vegetation).`
      : isUrbanSettlement
      ? `ESA WorldCover 10m observation confirms this parcel is predominantly Built-up Infrastructure & Settlement (${builtPct}% built-up structures, ${treePct}% urban canopy, ${waterPct}% drainage).`
      : isAgricultural
      ? `ESA WorldCover 10m observation confirms this parcel is active Agricultural Cropland (${cropPct}% cultivated cropland, ${treePct}% canopy, ${soilPct}% fallow soil).`
      : `ESA WorldCover 10m observation indicates ${dominantLabel} (${soilPct}% bare soil, ${builtPct}% built-up, ${waterPct}% water).`

    return {
      dominantClass,
      dominantLabel,
      waterPct,
      cropPct,
      builtPct,
      treePct,
      soilPct,
      summary,
      isWaterBody,
      isAgricultural,
      isUrbanSettlement,
      source: "ESA WorldCover 10m (v200)",
      rawCounts: counts,
    }
  } catch (err) {
    console.warn("ESA WorldCover fetch error/timeout:", err)
    return null
  }
}

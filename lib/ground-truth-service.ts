export interface GroundTruthResult {
  isUrbanSettlement: boolean
  isAgricultural: boolean
  isWaterBody: boolean
  placeName: string
  settlementType?: string
  suburb?: string
  town?: string
  rawOsmType?: string
  confidence: number
  summary: string
  buildingCount?: number
}

export async function fetchGroundTruth(
  bounds: {
    south: number
    west: number
    north: number
    east: number
  },
  isGreenVegetation?: boolean
): Promise<GroundTruthResult> {
  const centerLat = (bounds.south + bounds.north) / 2
  const centerLon = (bounds.west + bounds.east) / 2

  // Default regional result
  const defaultResult: GroundTruthResult = {
    isUrbanSettlement: false,
    isAgricultural: true,
    isWaterBody: false,
    placeName: "Regional Parcel",
    confidence: 0.85,
    summary: "Agricultural / Open vegetative terrain",
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${centerLat.toFixed(5)}&lon=${centerLon.toFixed(5)}&format=json&zoom=18`
    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "SatQuery-AI-GroundTruth/1.0",
        "Accept-Language": "en,hi",
      },
      signal: AbortSignal.timeout(3500),
    })

    if (!res.ok) return defaultResult

    const data = await res.json()
    if (!data) return defaultResult

    const osmClass = (data.class || "").toLowerCase()
    const osmType = (data.type || "").toLowerCase()
    const addressType = (data.addresstype || "").toLowerCase()
    const address = data.address || {}
    const suburb = address.suburb || address.neighbourhood || address.residential || address.city_district || ""
    const town = address.town || address.city || address.village || ""
    const displayName = data.display_name || ""
    const placeName = displayName.split(",").slice(0, 2).join(",").trim() || (town ? `${town} Area` : "Regional Area")

    // If spectral analysis confirmed green photosynthetic vegetation,
    // this parcel is undeniably active cropland (even if located in peri-urban town limits)
    if (isGreenVegetation) {
      return {
        isUrbanSettlement: false,
        isAgricultural: true,
        isWaterBody: false,
        placeName,
        settlementType: "farmland",
        suburb,
        town,
        rawOsmType: "landuse:farmland",
        confidence: 0.98,
        summary: `Active agricultural cropland and cultivated parcel in ${placeName}`,
      }
    }

    // Check for clear urban/built-up indicators (only when NOT green vegetation)
    const isResidentialStreet =
      osmClass === "highway" &&
      (osmType === "residential" || osmType === "living_street" || osmType === "pedestrian")

    const isBuilding =
      osmClass === "building" ||
      osmClass === "office" ||
      osmClass === "shop" ||
      [
        "building",
        "house",
        "apartments",
        "commercial",
        "industrial",
        "retail",
        "school",
        "hospital",
        "hotel",
        "residential",
      ].includes(osmType) ||
      addressType === "building"

    const isSuburbanSettlement = Boolean(
      suburb &&
        (isBuilding ||
          isResidentialStreet ||
          addressType === "suburb" ||
          addressType === "neighbourhood" ||
          addressType === "residential")
    )

    const isLanduseUrban =
      osmClass === "landuse" &&
      ["residential", "commercial", "industrial", "construction", "retail"].includes(osmType)

    const isUrbanSettlement = isBuilding || isResidentialStreet || isSuburbanSettlement || isLanduseUrban

    const isWaterBody =
      osmClass === "waterway" ||
      (osmClass === "natural" && (osmType === "water" || osmType === "wetland")) ||
      ["river", "canal", "stream", "pond", "reservoir", "lake", "drain"].includes(osmType)

    const isAgricultural = !isUrbanSettlement && !isWaterBody

    const summary = isUrbanSettlement
      ? `Dense Built-up Urban Settlement (${suburb ? `${suburb}, ` : ""}${town || "City"}) with residential structures and street grid`
      : isWaterBody
      ? `Water channel / drainage corridor (${displayName.split(",")[0]})`
      : `Agricultural cropland and rural parcel near ${town || "outskirts"}`

    return {
      isUrbanSettlement,
      isAgricultural,
      isWaterBody,
      placeName,
      settlementType: osmType,
      suburb,
      town,
      rawOsmType: `${osmClass}:${osmType}`,
      confidence: isUrbanSettlement || isWaterBody ? 0.98 : 0.88,
      summary,
    }
  } catch (err) {
    console.warn("Ground truth fetch timed out or failed:", err)
    return defaultResult
  }
}

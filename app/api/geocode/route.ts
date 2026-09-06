export const maxDuration = 15

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim()

    if (!q) {
      return Response.json({ error: "Missing search query" }, { status: 400 })
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q
    )}&limit=5&addressdetails=1`

    const res = await fetch(url, {
      headers: {
        "User-Agent": "SatQuery-AI-Geocoding/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      return Response.json({ error: "Geocoding service error" }, { status: 502 })
    }

    const data = (await res.json()) as Array<{
      place_id: number
      lat: string
      lon: string
      display_name: string
      type: string
      name?: string
      boundingbox?: [string, string, string, string]
      address?: Record<string, string>
    }>

    const results = data.map((item) => {
      const lat = parseFloat(item.lat)
      const lon = parseFloat(item.lon)

      const shortName =
        item.name ||
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.county ||
        item.display_name.split(",")[0]

      const state = item.address?.state || item.address?.region || ""
      const country = item.address?.country || ""
      const region = [state, country].filter(Boolean).join(", ") || item.display_name

      const delta = 0.035
      const north = Number((lat + delta).toFixed(4))
      const south = Number((lat - delta).toFixed(4))
      const east = Number((lon + delta).toFixed(4))
      const west = Number((lon - delta).toFixed(4))

      const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${west},${south},${east},${north}&bboxSR=4326&imageSR=4326&size=1024,1024&f=image`

      return {
        id: `geo-${item.place_id}`,
        name: shortName,
        displayName: item.display_name,
        region,
        lat,
        lon,
        bounds: { north, south, east, west },
        tileUrl,
      }
    })

    return Response.json({ results })
  } catch (err) {
    console.error("Geocoding API error:", err)
    return Response.json({ error: "Geocoding request failed" }, { status: 500 })
  }
}

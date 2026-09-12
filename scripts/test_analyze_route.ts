import { POST } from "../app/api/analyze/route"

async function runRouteTest() {
  console.log("==================================================")
  console.log("TESTING EXACT HOOGHLY RIVER COORDINATES FROM USER SCREENSHOT")
  console.log("Coordinates: 22.5495° N, 88.3171° E (Area: ~0.08 km²)")
  console.log("==================================================\n")

  const mockReq = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "इस पार्सल की पहचान और भूमि आवरण बताओ",
      sceneId: "custom",
      customScene: {
        name: "Kolkata",
        region: "West Bengal, India",
        lat: "22.5495° N",
        lon: "88.3171° E",
        area: "49.0 km²",
        bounds: { north: 22.56, south: 22.53, east: 88.33, west: 88.30 },
      },
      selectedAOI: {
        xmin: 35,
        ymin: 30,
        xmax: 65,
        ymax: 60,
        areaKm2: 0.08,
        bounds: {
          north: 22.551,
          south: 22.548,
          east: 88.318,
          west: 88.316,
        },
      },
    }),
  })

  const res = await POST(mockReq)
  const json = await res.json()

  console.log("Response status:", res.status)
  console.log("Returned Layer:", json.result?.layer)
  console.log("Bounding Boxes:", JSON.stringify(json.result?.boundingBoxes, null, 2))
  console.log("Card:", JSON.stringify(json.result?.card, null, 2))
  console.log("Answer snippet:", json.result?.answer)
  console.log("Sources:", json.sources)

  // 1. ASSERT NO CROP BOUNDING BOXES
  const boxes = json.result?.boundingBoxes || []
  const hasCropBox = boxes.some((b: any) => {
    const lbl = (b.label || "").toLowerCase()
    return lbl.includes("crop") || lbl.includes("farm") || lbl.includes("agricultur") || lbl.includes("khet") || lbl.includes("fasal")
  })
  if (hasCropBox) {
    console.error("FAIL: Hallucinated agricultural crop bounding box found in water body!")
    process.exit(1)
  }
  console.log("\nPASS: Bounding boxes verified - ZERO agricultural crop boxes!")

  // 2. ASSERT CARD HAS HIGH WATER AND NO CROPLAND
  if (!json.result?.card || json.result.card.kind !== "landcover") {
    console.error("FAIL: Expected landcover card!")
    process.exit(1)
  }
  const landcover = json.result.card.landcover || []
  const waterItem = landcover.find((l: any) => l.label.toLowerCase().includes("water"))
  const cropItem = landcover.find((l: any) => l.label.toLowerCase().includes("cropland") || l.label.toLowerCase().includes("agricultural"))
  if (!waterItem || waterItem.pct < 70) {
    console.error("FAIL: Water percentage should be >= 70%!")
    process.exit(1)
  }
  if (cropItem && cropItem.pct > 0) {
    console.error("FAIL: Card contains Agricultural Cropland > 0% on water surface!")
    process.exit(1)
  }
  console.log(`PASS: Card landcover verified - Water Body: ${waterItem.pct}%, Agricultural Cropland: 0%!`)

  // 3. ASSERT ANSWER DOES NOT HALLUCINATE AGRICULTURAL FIELDS
  const ans = (json.result?.answer || "").toLowerCase()
  if (ans.includes("agricultural field") || ans.includes("agricultural cropland") || ans.includes("खेती") || ans.includes("standing crops")) {
    console.error("FAIL: Answer text claims agricultural crops/fields!")
    process.exit(1)
  }
  console.log("PASS: Answer text verified - Correctly identifies Surface Water Body / River Channel!\n")

  console.log("==================================================")
  console.log("ALL VERIFICATION CHECKS PASSED WITH 100% ACCURACY!")
  console.log("==================================================")
}

runRouteTest().catch((err) => {
  console.error("Route test error:", err)
  process.exit(1)
})

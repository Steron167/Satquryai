import { fetchGroundTruth } from "../lib/ground-truth-service"
import { fetchESAWorldCover } from "../lib/esa-worldcover-service"

interface BenchmarkTest {
  name: string
  lat: number
  lon: number
  deltaKm: number
  expectedCategory: "sports" | "crop" | "water" | "urban" | "fallow"
  description: string
}

const BENCHMARK_TESTS: BenchmarkTest[] = [
  {
    name: "S.S.G.M. College Sports Ground & Gym (Kopargaon)",
    lat: 19.8940,
    lon: 74.4843,
    deltaKm: 0.1,
    expectedCategory: "sports",
    description: "College campus athletic track, sports pitch, and gymnasium",
  },
  {
    name: "Eden Gardens Cricket Stadium (Kolkata)",
    lat: 22.5646,
    lon: 88.3433,
    deltaKm: 0.2,
    expectedCategory: "sports",
    description: "Iconic cricket stadium and sports arena",
  },
  {
    name: "Active Farmland Parcel (Kopargaon North)",
    lat: 19.8997,
    lon: 74.4529,
    deltaKm: 0.1,
    expectedCategory: "crop",
    description: "Lush green standing agricultural crops",
  },
  {
    name: "Hussain Sagar Lake (Hyderabad)",
    lat: 17.4239,
    lon: 78.4738,
    deltaKm: 0.2,
    expectedCategory: "water",
    description: "Large inland freshwater lake water body",
  },
  {
    name: "Godavari River Channel (Rajahmundry)",
    lat: 17.0000,
    lon: 81.7600,
    deltaKm: 0.2,
    expectedCategory: "water",
    description: "Active wide perennial river water corridor",
  },
  {
    name: "Kopargaon Town Core (Main Market)",
    lat: 19.8850,
    lon: 74.4780,
    deltaKm: 0.1,
    expectedCategory: "urban",
    description: "Dense commercial and residential built-up settlement",
  },
  {
    name: "Arid Barren Terrain (Sam Sand Dunes, Thar Desert)",
    lat: 26.8300,
    lon: 70.5100,
    deltaKm: 0.2,
    expectedCategory: "fallow",
    description: "Dry soil, sand dunes and sparse vegetation in Thar Desert",
  },
]

async function runBenchmark() {
  console.log("================================================================================")
  console.log("🛰️  SATQUERY AI — ZERO-TOKEN GEOSPATIAL MULTI-LOCATION BENCHMARK SUITE")
  console.log("================================================================================\n")

  let passed = 0
  let failed = 0

  for (const test of BENCHMARK_TESTS) {
    const latDist = test.deltaKm / 111.32
    const lonDist = latDist / Math.cos((test.lat * Math.PI) / 180)
    const bounds = {
      north: test.lat + latDist / 2,
      south: test.lat - latDist / 2,
      east: test.lon + lonDist / 2,
      west: test.lon - lonDist / 2,
    }

    try {
      const [gt, esa] = await Promise.all([
        fetchGroundTruth(bounds),
        fetchESAWorldCover(bounds).catch(() => null),
      ])

      // Reconcile logic matching analyze route
      let effectiveCategory = "unknown"
      if (gt.isWaterBody || esa?.isWaterBody) {
        effectiveCategory = "water"
      } else if (gt.isInstitutionalSportsGround) {
        effectiveCategory = "sports"
      } else if (gt.isUrbanSettlement || esa?.isUrbanSettlement) {
        effectiveCategory = "urban"
      } else if (esa?.dominantClass === "bare" || gt.settlementType === "barren") {
        effectiveCategory = "fallow"
      } else if (gt.isAgricultural || esa?.isAgricultural) {
        effectiveCategory = "crop"
      } else {
        effectiveCategory = "fallow"
      }

      const isPass = effectiveCategory === test.expectedCategory
      if (isPass) passed++
      else failed++

      const icon = isPass ? "✅ PASS" : "❌ FAIL"
      console.log(`[${icon}] ${test.name}`)
      console.log(`       Location: [${test.lat.toFixed(4)}°N, ${test.lon.toFixed(4)}°E] (${test.description})`)
      console.log(`       OSM Place: "${gt.placeName}" (raw: ${gt.rawOsmType || "none"})`)
      console.log(`       Settlement Type: ${gt.settlementType || "none"}`)
      console.log(`       Expected: [${test.expectedCategory.toUpperCase()}] | Got: [${effectiveCategory.toUpperCase()}]`)
      if (esa) {
        console.log(`       ESA 10m Ground Truth: ${esa.dominantLabel} (Crop: ${esa.cropPct}%, Built: ${esa.builtPct}%, Water: ${esa.waterPct}%, Soil: ${esa.soilPct}%)`)
      }
      console.log("")
    } catch (err) {
      failed++
      console.error(`❌ [ERROR] ${test.name}:`, err)
    }
  }

  console.log("================================================================================")
  console.log(`SCORECARD: ${passed} PASSED / ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}% SUCCESS)`)
  console.log("================================================================================\n")

  if (failed > 0) {
    process.exit(1)
  }
}

runBenchmark().catch((err) => {
  console.error("Benchmark runner failed:", err)
  process.exit(1)
})

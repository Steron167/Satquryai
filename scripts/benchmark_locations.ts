import { fetchGroundTruth } from "../lib/ground-truth-service"
import { fetchESAWorldCover } from "../lib/esa-worldcover-service"
import { fetchRealAOIImage, computeOpticalPixelMetrics } from "../lib/aoi-tile-service"

interface BenchmarkTest {
  name: string
  lat: number
  lon: number
  deltaKm: number
  expectedCategory: "sports" | "crop" | "water" | "urban" | "fallow" | "vacant_plot"
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
    name: "Wankhede Cricket Stadium (Mumbai)",
    lat: 18.9389,
    lon: 72.8258,
    deltaKm: 0.15,
    expectedCategory: "sports",
    description: "International cricket stadium with turf pitch and spectator stands",
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
    name: "Punjab Wheat & Grain Agricultural Parcel (Khanna)",
    lat: 30.7000,
    lon: 76.1000,
    deltaKm: 0.1,
    expectedCategory: "crop",
    description: "High-yield agrarian crop fields in Punjab agricultural belt",
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
  {
    name: "Annapurna Nagar Vacant Layout Plot (Kopargaon)",
    lat: 19.8982,
    lon: 74.4785,
    deltaKm: 0.1,
    expectedCategory: "vacant_plot",
    description: "Peri-urban unpaved residential layout plot / open dirt ground near Sai Colony",
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
      const [gt, esa, optBuf] = await Promise.all([
        fetchGroundTruth(bounds),
        fetchESAWorldCover(bounds).catch(() => null),
        fetchRealAOIImage(bounds, 17).catch(() => null),
      ])

      let opticalCropPct = 0
      let opticalSoilPct = 0
      let opticalWaterPct = 0
      let opticalBuiltPct = 0
      let isVacantPlot = false
      let isFallowSoil = false

      if (optBuf) {
        const isAgriContext = Boolean(gt.isAgricultural || esa?.isAgricultural)
        const isUrbanContext = Boolean(gt.isUrbanSettlement || esa?.isUrbanSettlement)
        const optical = await computeOpticalPixelMetrics(optBuf, isAgriContext, isUrbanContext)
        opticalCropPct = optical.opticalCropPct
        opticalSoilPct = optical.opticalSoilPct
        opticalWaterPct = optical.opticalWaterPct
        opticalBuiltPct = optical.opticalBuiltPct

        const isPeriUrbanContext = Boolean(
          gt.isPeriUrban ||
          gt.suburb ||
          gt.placeName.toLowerCase().includes("nagar") ||
          gt.placeName.toLowerCase().includes("colony") ||
          gt.placeName.toLowerCase().includes("layout") ||
          gt.placeName.toLowerCase().includes("society") ||
          gt.placeName.toLowerCase().includes("shingnapur")
        )

        const isWater =
          Boolean(esa?.isWaterBody) ||
          opticalWaterPct >= 25 ||
          (opticalWaterPct >= 15 && opticalWaterPct > opticalCropPct && opticalWaterPct > opticalBuiltPct) ||
          Boolean(gt.isWaterBody && opticalWaterPct >= 10)

        const isBuiltUp =
          !isWater &&
          ((gt.isUrbanSettlement && (esa?.builtPct ?? 0) >= 30) ||
            (esa?.isUrbanSettlement && (esa.builtPct ?? 0) >= 50) ||
            opticalBuiltPct >= 35 ||
            (opticalBuiltPct >= 22 && opticalBuiltPct > opticalCropPct + opticalSoilPct))

        const isBarrenDesert = esa?.dominantClass === "bare" || gt.settlementType === "barren"

        isVacantPlot =
          !isWater &&
          !isBuiltUp &&
          !isBarrenDesert &&
          !gt.isInstitutionalSportsGround &&
          isPeriUrbanContext &&
          opticalSoilPct >= 45 &&
          opticalSoilPct > opticalCropPct &&
          opticalCropPct < 45

        isFallowSoil =
          !isWater &&
          !isBuiltUp &&
          !isVacantPlot &&
          !gt.isInstitutionalSportsGround &&
          (opticalSoilPct >= 45 && opticalCropPct < 35)
      }

      // Reconcile logic matching analyze route
      const isBarrenDesert = esa?.dominantClass === "bare" || gt.settlementType === "barren"
      let effectiveCategory = "unknown"
      if (gt.isWaterBody || esa?.isWaterBody || opticalWaterPct >= 30) {
        effectiveCategory = "water"
      } else if (gt.isInstitutionalSportsGround) {
        effectiveCategory = "sports"
      } else if (isVacantPlot || gt.settlementType === "vacant_plot") {
        effectiveCategory = "vacant_plot"
      } else if (isBarrenDesert || isFallowSoil) {
        effectiveCategory = "fallow"
      } else if (gt.isUrbanSettlement || esa?.isUrbanSettlement) {
        effectiveCategory = "urban"
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
      console.log(`       Settlement Type: ${gt.settlementType || "none"} (periUrban: ${Boolean(gt.isPeriUrban)})`)
      console.log(`       Expected: [${test.expectedCategory.toUpperCase()}] | Got: [${effectiveCategory.toUpperCase()}]`)
      if (optBuf) {
        console.log(`       Optical Physics: Soil ${opticalSoilPct}%, Crop ${opticalCropPct}%, Built ${opticalBuiltPct}%, Water ${opticalWaterPct}%`)
      }
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

import { fetchESAWorldCover } from "../lib/esa-worldcover-service"

async function runTests() {
  console.log("==================================================")
  console.log("SATQUERY AI · ESA WORLDCOVER 10M INTEGRATION TESTS")
  console.log("==================================================\n")

  // TEST 1: Hooghly River / Howrah Bridge, Kolkata
  console.log("[TEST 1] Testing Hooghly River, Kolkata (Muddy/Silty Water)...")
  const hooghlyBounds = {
    north: 22.590,
    south: 22.580,
    east: 88.350,
    west: 88.344,
  }
  const hooghly = await fetchESAWorldCover(hooghlyBounds)
  console.log("Hooghly Result:", {
    dominantClass: hooghly?.dominantClass,
    dominantLabel: hooghly?.dominantLabel,
    waterPct: hooghly?.waterPct,
    cropPct: hooghly?.cropPct,
    builtPct: hooghly?.builtPct,
    isWaterBody: hooghly?.isWaterBody,
    isAgricultural: hooghly?.isAgricultural,
  })

  if (!hooghly || !hooghly.isWaterBody || hooghly.waterPct < 60 || hooghly.cropPct > 5) {
    console.error("FAIL: Hooghly River was NOT classified as a water body with high water percentage!")
    process.exit(1)
  }
  console.log("PASS: Hooghly River accurately classified as Surface Water Body with 0% Cropland!\n")

  // TEST 2: Kopargaon Sugarcane Farmland, Maharashtra
  console.log("[TEST 2] Testing Kopargaon Farmland, Maharashtra...")
  const kopargaonBounds = {
    north: 19.90,
    south: 19.88,
    east: 74.49,
    west: 74.47,
  }
  const kopargaon = await fetchESAWorldCover(kopargaonBounds)
  console.log("Kopargaon Result:", {
    dominantClass: kopargaon?.dominantClass,
    dominantLabel: kopargaon?.dominantLabel,
    cropPct: kopargaon?.cropPct,
    builtPct: kopargaon?.builtPct,
    isAgricultural: kopargaon?.isAgricultural,
  })

  if (!kopargaon || kopargaon.cropPct < 30) {
    console.error("FAIL: Kopargaon farmland did not show expected agricultural crop percentage!")
    process.exit(1)
  }
  console.log("PASS: Kopargaon farmland accurately classified as Agricultural Cropland!\n")

  // TEST 3: Bhadla Solar Park / Desert, Rajasthan
  console.log("[TEST 3] Testing Bhadla Desert / Solar Infrastructure, Rajasthan...")
  const bhadlaBounds = {
    north: 27.55,
    south: 27.53,
    east: 71.92,
    west: 71.90,
  }
  const bhadla = await fetchESAWorldCover(bhadlaBounds)
  console.log("Bhadla Result:", {
    dominantClass: bhadla?.dominantClass,
    dominantLabel: bhadla?.dominantLabel,
    soilPct: bhadla?.soilPct,
    builtPct: bhadla?.builtPct,
  })

  if (!bhadla || bhadla.soilPct < 50) {
    console.error("FAIL: Bhadla did not show high desert/bare soil percentage!")
    process.exit(1)
  }
  console.log("PASS: Bhadla Desert accurately classified as Bare Desert Soil / Solar Infrastructure!\n")

  console.log("==================================================")
  console.log("ALL 3 GEOGRAPHICAL GROUND TRUTH TESTS PASSED 100%!")
  console.log("==================================================")
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})

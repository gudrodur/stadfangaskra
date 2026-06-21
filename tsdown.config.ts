import { defineConfig } from "tsdown";

// Two entry points: the main library and the standalone postcode data
// (`iceaddr-ts/postcodes`). Dual ESM + CJS with type declarations, platform
// neutral so the output runs in Node and on edge runtimes (Cloudflare Workers).
export default defineConfig({
  entry: ["src/index.ts", "src/postcodes.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  platform: "neutral",
});

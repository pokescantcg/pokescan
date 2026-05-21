import { buildSync } from "esbuild";

buildSync({
  entryPoints: ["server/index.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outdir: "server_dist",
  tsconfig: "tsconfig.json",
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});

console.log("Build complete");

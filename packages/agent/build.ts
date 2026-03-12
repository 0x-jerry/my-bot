await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  sourcemap: true,
  target: "bun",
});

console.log(`Build success!`);

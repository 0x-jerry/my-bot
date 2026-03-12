await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  target: "bun",
});

console.log(`Build success!`);

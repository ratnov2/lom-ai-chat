import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  format: "iife",
  minify: true,
  outfile: "dist/standalone.js",
  define: { "process.env.NODE_ENV": '"production"' },
});
const js = await readFile("dist/standalone.js", "utf8");
const css = await readFile("dist/standalone.css", "utf8");
await mkdir("standalone", { recursive: true });
await writeFile(
  "standalone/index.html",
  `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOM AI</title><style>${css}</style><div id="root"></div><script>${js.replaceAll("</script", "<\\/script")}</script></html>`,
);
console.log("standalone/index.html — автономная версия без сервера");

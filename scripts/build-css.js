const fs = require("fs");
const path = require("path");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");

async function build() {
  const srcPath = path.join(__dirname, "../app/globals.src.css");
  const destPath = path.join(__dirname, "../app/globals.css");
  const css = fs.readFileSync(srcPath, "utf8");

  const result = await postcss([tailwind()]).process(css, { from: srcPath, to: destPath });
  fs.writeFileSync(destPath, result.css);
  console.log(`[build-css] Compiled ${result.css.length} bytes of Tailwind CSS to app/globals.css`);
}

build().catch((err) => {
  console.error("[build-css] Error:", err);
  process.exit(1);
});

// 회의 공유용 단일 HTML 페이지를 만든다: node artifact/build.mjs → artifact/dist/index.html
// CSS와 JS를 모두 페이지 안에 넣어서 다른 파일 없이 열린다.
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { build } from "esbuild";

const out = "artifact/dist";
mkdirSync(out, { recursive: true });

const js = await build({
  entryPoints: ["artifact/main.tsx"],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "next/link": "./artifact/shims/link.tsx",
    "next/navigation": "./artifact/shims/navigation.ts",
  },
  logOverride: { "unsupported-directive": "silent" },
});

execSync(`npx @tailwindcss/cli -i src/app/globals.css -o ${out}/app.css --minify`, { stdio: "inherit" });
const css = readFileSync(`${out}/app.css`, "utf8");
const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<title>DB어때</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap">
<style>${css}</style>
<div id="root"></div>
<script>${script}</script>
`;
writeFileSync(`${out}/index.html`, html);
console.log(`${out}/index.html ${(html.length / 1024).toFixed(0)} KB`);

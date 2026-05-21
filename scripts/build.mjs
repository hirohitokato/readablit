import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";

const root = resolve(new URL("..", import.meta.url).pathname);
const srcDir = resolve(root, "src");
const distDir = resolve(root, "dist");

/**
 * Chrome 拡張では manifest や executeScript から静的ファイル名で参照するため、
 * 一般的な SPA のようなハッシュ付き分割出力より「固定名の単一バンドル」を優先する。
 */
async function buildEntry({ entry, fileName, globalName }) {
  await build({
    configFile: false,
    publicDir: false,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      minify: false,
      sourcemap: false,
      reportCompressedSize: false,
      target: "es2022",
      lib: {
        entry,
        formats: ["iife"],
        name: globalName,
        fileName: () => fileName
      },
      rollupOptions: {
        output: {
          extend: true
        }
      }
    }
  });
}

async function copyStaticAssets() {
  await cp(resolve(srcDir, "manifest.json"), resolve(distDir, "manifest.json"), { force: true });
  await cp(resolve(srcDir, "popup/popup.html"), resolve(distDir, "popup/popup.html"), { force: true });
  await cp(resolve(srcDir, "popup/popup.css"), resolve(distDir, "popup/popup.css"), { force: true });
  await cp(resolve(srcDir, "hello_extensions.png"), resolve(distDir, "hello_extensions.png"), { force: true });
  await cp(resolve(srcDir, "dict"), resolve(distDir, "dict"), { recursive: true, force: true });
  await cp(resolve(srcDir, "vendor"), resolve(distDir, "vendor"), { recursive: true, force: true });
}

await rm(distDir, { recursive: true, force: true });
await mkdir(resolve(distDir, "popup"), { recursive: true });
await mkdir(resolve(distDir, "background"), { recursive: true });
await mkdir(resolve(distDir, "content"), { recursive: true });

await Promise.all([
  buildEntry({
    entry: resolve(srcDir, "popup/popup.ts"),
    fileName: "popup/popup.js",
    globalName: "ReadablitPopup"
  }),
  buildEntry({
    entry: resolve(srcDir, "background/serviceWorker.ts"),
    fileName: "background/serviceWorker.js",
    globalName: "ReadablitBackground"
  }),
  buildEntry({
    entry: resolve(srcDir, "content/contentScript.ts"),
    fileName: "content/contentScript.js",
    globalName: "ReadablitContentScript"
  })
]);

await copyStaticAssets();

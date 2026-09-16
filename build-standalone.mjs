import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceHtmlPath = path.join(projectRoot, "index.html");
const sourceCssPath = path.join(projectRoot, "css", "style.css");
const sourceJsPath = path.join(projectRoot, "js", "main.js");
const outputDirectory = path.join(projectRoot, "dist");
const outputHtmlPath = path.join(outputDirectory, "index.html");

const [html, css, js] = await Promise.all([
  readFile(sourceHtmlPath, "utf8"),
  readFile(sourceCssPath, "utf8"),
  readFile(sourceJsPath, "utf8")
]);

const stylesheetPattern = /<link rel="stylesheet" href="css\/style\.css">/;
const scriptPattern = /<script src="js\/main\.js"><\/script>/;

if (!stylesheetPattern.test(html) || !scriptPattern.test(html)) {
  throw new Error("未找到预期的 CSS 或 JavaScript 引用，请检查 index.html 结构。");
}

const safeInlineScript = js.replace(/<\/script>/gi, "<\\/script>");
const standaloneHtml = html
  .replace(stylesheetPattern, `<style>\n${css}\n  </style>`)
  .replace(scriptPattern, `<script>\n${safeInlineScript}\n  </script>`);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputHtmlPath, standaloneHtml, "utf8");

console.log(`Standalone build created: ${outputHtmlPath}`);

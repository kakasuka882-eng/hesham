import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "cf-dist");
const FORCE_INCLUDED_PATHS = new Set(["data/topics.json"]);

const BLOCKED_DIRS = new Set([
  ".git",
  ".github",
  "app",
  "data",
  "node_modules",
  "cf-dist",
  "blog-single-page-layout",
  "bundles",
  "cgi-bin",
  "contact",
  "jobs-1-item",
  "legal-notice",
  "modules-1-item",
  "privacy",
  "real-estate-single-page-layout",
  "subpage",
  "webcard"
]);

const BLOCKED_FILES = new Set([
  "firebase-debug.log",
  "tmp_cookie.txt",
  "firebase.json",
  ".firebaserc",
  "firestore.rules",
  "storage.rules"
]);

const BLOCKED_EXTENSIONS = [".php", ".sqlite", ".zip"];

const normalize = (value) => value.replace(/\\/g, "/");

const shouldSkip = (relativePath) => {
  const normalized = normalize(relativePath);
  if (!normalized || normalized === ".") return false;
  if (FORCE_INCLUDED_PATHS.has(normalized)) return false;

  const parts = normalized.split("/");
  if (parts.some((part) => BLOCKED_DIRS.has(part))) return true;

  const base = parts[parts.length - 1];
  if (BLOCKED_FILES.has(base)) return true;

  const lower = normalized.toLowerCase();
  if (BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;

  return false;
};

const ensureCleanOutDir = async () => {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
};

const copyRecursive = async (sourceDir, outDir, relativeBase = "") => {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  let copiedFiles = 0;

  for (const entry of entries) {
    const relPath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    if (shouldSkip(relPath)) continue;

    const srcPath = path.join(sourceDir, entry.name);
    const dstPath = path.join(outDir, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(dstPath, { recursive: true });
      copiedFiles += await copyRecursive(srcPath, dstPath, relPath);
      continue;
    }

    if (!entry.isFile()) continue;
    await fs.copyFile(srcPath, dstPath);
    copiedFiles += 1;
  }

  return copiedFiles;
};

const run = async () => {
  await ensureCleanOutDir();
  const total = await copyRecursive(ROOT, OUT_DIR);
  console.log(`Cloudflare dist ready: ${total} files copied to ${OUT_DIR}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

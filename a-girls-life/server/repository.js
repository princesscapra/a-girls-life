import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA_DIR = path.join(ROOT, "data");

function readJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

export function loadGameData() {
  const events = readJson("events.json");
  const sources = readJson("sources.json");

  return {
    events,
    sources,
    loadedAt: new Date().toISOString(),
  };
}

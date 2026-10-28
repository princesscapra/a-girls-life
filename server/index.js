import http from "node:http";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { URL } from "node:url";

import { loadGameData } from "./repository.js";
import { advanceOneYear, createInitialState } from "./simulation.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 8080);
const MAX_PORT_SCAN = 20;

let gameData = loadGameData();

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1024 * 128) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sourceMapById(sources) {
  return Object.fromEntries(sources.map((source) => [source.id, source]));
}

function serveStatic(reqPath, res) {
  const filePath = path.join(PUBLIC_DIR, reqPath === "/" ? "index.html" : reqPath.slice(1));
  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    sendText(res, 404, "Not found");
    return;
  }

  const ext = path.extname(resolved);
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  };

  const body = fs.readFileSync(resolved);
  const cacheControl = [".html", ".css", ".js", ".json"].includes(ext)
    ? "no-cache"
    : "public, max-age=86400";

  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": cacheControl,
  });
  res.end(body);
}

function handleBootstrap(res) {
  const sourceMap = sourceMapById(gameData.sources);
  const exposedEvents = gameData.events.map((event) => ({
    id: event.id,
    category: event.category,
    label: event.label,
    sourceId: event.sourceId,
    sourceTitle: sourceMap[event.sourceId]?.title || "Source inconnue",
    sourceUrl: sourceMap[event.sourceId]?.url || "",
    sourceCollectedAt: sourceMap[event.sourceId]?.collectedAt || null,
  }));

  sendJson(res, 200, {
    app: {
      yearDurationMs: 5000,
      dataLoadedAt: gameData.loadedAt,
      locale: "fr-FR",
    },
    flags: gameData.flags,
    events: exposedEvents,
    sources: gameData.sources,
  });
}

async function handleStateCreate(req, res) {
  const raw = await readBody(req);
  const input = raw ? JSON.parse(raw) : {};
  const state = createInitialState(input, gameData.flags?.simulation);
  sendJson(res, 200, { state });
}

async function handleStateAdvance(req, res) {
  const raw = await readBody(req);
  const input = raw ? JSON.parse(raw) : {};
  if (!input.state) {
    sendJson(res, 400, { error: "Missing state" });
    return;
  }

  const { state, yearEvents } = advanceOneYear(
    input.state,
    gameData.events,
    sourceMapById(gameData.sources),
    Math.random,
    gameData.flags?.simulation
  );
  sendJson(res, 200, { state, yearEvents });
}

async function handleApi(method, pathname, req, res) {
  if (method === "GET" && pathname === "/api/bootstrap") {
    handleBootstrap(res);
    return true;
  }

  if (method === "POST" && pathname === "/api/reload-data") {
    if (gameData.flags?.api?.allowDataReload === false) {
      sendJson(res, 403, { error: "Data reload is disabled by configuration" });
      return true;
    }

    gameData = loadGameData();
    sendJson(res, 200, { ok: true, loadedAt: gameData.loadedAt });
    return true;
  }

  if (method === "POST" && pathname === "/api/state/create") {
    await handleStateCreate(req, res);
    return true;
  }

  if (method === "POST" && pathname === "/api/state/advance") {
    await handleStateAdvance(req, res);
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    const isApiRequest = await handleApi(method, parsedUrl.pathname, req, res);
    if (isApiRequest) return;

    if (method === "GET") {
      serveStatic(parsedUrl.pathname, res);
      return;
    }

    sendText(res, 405, "Method not allowed");
  } catch (error) {
    sendJson(res, 500, {
      error: "Internal server error",
      message: error.message,
    });
  }
});

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port);
  });
}

async function findAvailablePort(startPort, maxScan = MAX_PORT_SCAN) {
  for (let offset = 0; offset <= maxScan; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error(`No free port found between ${startPort} and ${startPort + maxScan}`);
}

const selectedPort = await findAvailablePort(PORT);
if (selectedPort !== PORT) {
  console.warn(`Port ${PORT} indisponible, bascule automatique vers ${selectedPort}.`);
}

server.listen(selectedPort, () => {
  console.log(`a-girls-life running on http://localhost:${selectedPort}`);
});

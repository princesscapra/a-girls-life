import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA_DIR = path.join(ROOT, "data");
const CATEGORY_EVENTS_FILE = "events.json";
const FEATURE_FLAGS_FILE = "feature-flags.json";

function readJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

function readJsonFromPath(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

function isDirectory(entry) {
  return entry.isDirectory();
}

function loadCategoryEvents() {
  const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
  const categoryDirs = entries.filter(isDirectory).map((entry) => entry.name).sort();
  const events = [];

  for (const categoryDir of categoryDirs) {
    const eventsPath = path.join(DATA_DIR, categoryDir, CATEGORY_EVENTS_FILE);
    if (!fs.existsSync(eventsPath)) continue;

    const categoryEvents = readJsonFromPath(eventsPath);
    if (!Array.isArray(categoryEvents)) {
      throw new TypeError(`Invalid category events format in ${eventsPath}: expected an array`);
    }

    events.push(...categoryEvents);
  }

  return events;
}

function loadFeatureFlags() {
  const flagsPath = path.join(DATA_DIR, FEATURE_FLAGS_FILE);
  if (!fs.existsSync(flagsPath)) {
    return {
      data: {
        loadCategoryEvents: true,
        loadRootEvents: true,
      },
      api: {
        allowDataReload: true,
      },
      simulation: {
        enableIdentityTransition: true,
        enableMortality: true,
      },
      ui: {
        showBirthModal: true,
        showSensitiveFilter: true,
        showIdentityCard: true,
        showActivityLog: true,
        showScenarioPopup: true,
        showIndicators: true,
        autoStartAfterBirth: true,
      },
      eventCategories: {},
    };
  }

  const flags = readJson(FEATURE_FLAGS_FILE);
  return {
    data: {
      loadCategoryEvents: flags?.data?.loadCategoryEvents !== false,
      loadRootEvents: flags?.data?.loadRootEvents !== false,
    },
    api: {
      allowDataReload: flags?.api?.allowDataReload !== false,
    },
    simulation: {
      enableIdentityTransition: flags?.simulation?.enableIdentityTransition !== false,
      enableMortality: flags?.simulation?.enableMortality !== false,
    },
    ui: {
      showBirthModal: flags?.ui?.showBirthModal !== false,
      showSensitiveFilter: flags?.ui?.showSensitiveFilter !== false,
      showIdentityCard: flags?.ui?.showIdentityCard !== false,
      showActivityLog: flags?.ui?.showActivityLog !== false,
      showScenarioPopup: flags?.ui?.showScenarioPopup !== false,
      showIndicators: flags?.ui?.showIndicators !== false,
      autoStartAfterBirth: flags?.ui?.autoStartAfterBirth !== false,
    },
    eventCategories: flags?.eventCategories && typeof flags.eventCategories === "object"
      ? flags.eventCategories
      : {},
  };
}

function categoryEnabled(category, categoryFlags) {
  if (!category || typeof category !== "string") return true;
  if (!(category in categoryFlags)) return true;
  return categoryFlags[category] !== false;
}

function filterEventsByFlags(events, featureFlags) {
  return events.filter((event) => categoryEnabled(event.category, featureFlags.eventCategories));
}

function assertUniqueEventIds(events) {
  const seen = new Set();
  for (const event of events) {
    if (!event?.id) {
        throw new TypeError("Each event must include an id");
    }

    if (seen.has(event.id)) {
      throw new Error(`Duplicate event id detected: ${event.id}`);
    }

    seen.add(event.id);
  }
}

export function loadGameData() {
  const flags = loadFeatureFlags();
  const categoryEvents = flags.data.loadCategoryEvents ? loadCategoryEvents() : [];
  const legacyEvents = flags.data.loadRootEvents ? readJson("events.json") : [];
  const events = filterEventsByFlags([...categoryEvents, ...legacyEvents], flags);
  const sources = readJson("sources.json");

  assertUniqueEventIds(events);

  return {
    events,
    sources,
    flags,
    loadedAt: new Date().toISOString(),
  };
}

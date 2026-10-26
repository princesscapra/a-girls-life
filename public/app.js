const state = {
  simulationState: null,
  timerId: null,
  yearDurationMs: 5000,
  sourceById: new Map(),
  showSensitive: true,
};

const dom = {
  form: document.getElementById("start-form"),
  status: document.getElementById("status"),
  pause: document.getElementById("pause"),
  yearEvents: document.getElementById("year-events"),
  lifeJournal: document.getElementById("life-journal"),
  timeline: document.getElementById("timeline"),
  activityLog: document.getElementById("activity-log"),
  sensitiveFilter: document.getElementById("sensitive-filter"),
};

function socioLabel(value) {
  if (value === "low") return "precaire";
  if (value === "high") return "aise";
  return "intermediaire";
}

function appendLog(level, message) {
  if (!dom.activityLog) return;

  const placeholder = dom.activityLog.querySelector(".log-placeholder");
  if (placeholder) {
    placeholder.remove();
  }

  const li = document.createElement("li");
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  li.className = `log-${level}`;
  li.textContent = `[${hh}:${mm}:${ss}] ${level.toUpperCase()} - ${message}`;

  dom.activityLog.prepend(li);
  const extra = dom.activityLog.querySelectorAll("li");
  if (extra.length > 40) {
    extra[extra.length - 1].remove();
  }
}

function isSensitiveCategory(category) {
  return category === "violences" || category === "discriminations";
}

function setStatus(text) {
  dom.status.textContent = text;
}

function refreshControls() {
  const playing = Boolean(state.timerId);

  dom.pause.disabled = !playing;
}

function sourceMeta(sourceId) {
  const source = state.sourceById.get(sourceId);
  if (!source) return "Source indisponible";
  return `${source.organization} - ${source.title} (${source.collectedAt || "date inconnue"})`;
}

function sourceLink(sourceId) {
  const source = state.sourceById.get(sourceId);
  if (!source?.url) return "";
  return `<a href="${source.url}" target="_blank" rel="noopener noreferrer">Source</a>`;
}

function renderYearEvents(events) {
  const visibleEvents = state.showSensitive
    ? events
    : events.filter((event) => !isSensitiveCategory(event.category));

  dom.yearEvents.innerHTML = "";
  if (visibleEvents.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucun evenement affiche pour cette annee avec le filtre actif.";
    dom.yearEvents.appendChild(li);
    return;
  }

  for (const event of visibleEvents) {
    const li = document.createElement("li");
    if (isSensitiveCategory(event.category)) {
      li.classList.add("sensitive");
    }

    const probabilityPct = `${Math.round((event.probabilityApplied || 0) * 1000) / 10}%`;
    li.innerHTML = `
      <strong>${event.label}</strong>
      <div class="meta">Categorie: ${event.category} | Probabilite appliquee: ${probabilityPct}</div>
      <div class="meta">${sourceMeta(event.sourceId)} ${sourceLink(event.sourceId)}</div>
    `;

    if (event.note) {
      const note = document.createElement("div");
      note.className = "meta";
      note.textContent = `Contexte: ${event.note}`;
      li.appendChild(note);
    }

    if (Array.isArray(event.effects) && event.effects.length > 0) {
      const effects = document.createElement("div");
      effects.className = "meta";
      effects.textContent = `Effets possibles: ${event.effects.join("; ")}`;
      li.appendChild(effects);
    }

    dom.yearEvents.appendChild(li);
  }
}

function renderTimeline() {
  if (!state.simulationState) {
    dom.timeline.innerHTML = "";
    return;
  }

  const entries = state.simulationState.timeline.slice().reverse();
  dom.timeline.innerHTML = "";

  for (const entry of entries) {
    const li = document.createElement("li");
    li.innerHTML = `
      Annee ${entry.year} (age ${entry.age}) - Etape: ${entry.lifeStage || "N/A"} - Identite: ${entry.identity}
      <span class="meta"> | ${entry.events.length} evenement(s)</span>
    `;
    dom.timeline.appendChild(li);
  }
}

function createBirthJournalItem(entry, yearTitle) {
  const li = document.createElement("li");
  li.innerHTML = `
    <strong>${yearTitle}</strong>: Naissance du personnage.
    <div class="meta">Etape: ${entry.lifeStage || "N/A"} | Identite: ${entry.identity}</div>
  `;
  return li;
}

function createNoEventJournalItem(entry, yearTitle) {
  const li = document.createElement("li");
  li.innerHTML = `
    <strong>${yearTitle}</strong>: Aucune situation declenchee cette annee.
    <div class="meta">Etape: ${entry.lifeStage || "N/A"} | Identite: ${entry.identity}</div>
  `;
  return li;
}

function createEventRow(event) {
  const row = document.createElement("div");
  const probabilityPct = `${Math.round((event.probabilityApplied || 0) * 1000) / 10}%`;

  if (isSensitiveCategory(event.category)) {
    row.classList.add("sensitive");
  }

  row.innerHTML = `
    <div>${event.label}</div>
    <div class="meta">Categorie: ${event.category} | Probabilite appliquee: ${probabilityPct}</div>
    <div class="meta">${sourceMeta(event.sourceId)} ${sourceLink(event.sourceId)}</div>
  `;

  if (event.note) {
    const note = document.createElement("div");
    note.className = "meta";
    note.textContent = `Contexte: ${event.note}`;
    row.appendChild(note);
  }

  if (Array.isArray(event.effects) && event.effects.length > 0) {
    const effects = document.createElement("div");
    effects.className = "meta";
    effects.textContent = `Effets possibles: ${event.effects.join("; ")}`;
    row.appendChild(effects);
  }

  return row;
}

function createEventJournalItem(entry, yearTitle, events) {
  const li = document.createElement("li");
  li.innerHTML = `
    <strong>${yearTitle}</strong>: ${events.length} evenement(s) cette annee.
    <div class="meta">Etape: ${entry.lifeStage || "N/A"} | Identite: ${entry.identity}</div>
  `;

  for (const event of events) {
    li.appendChild(createEventRow(event));
  }

  return li;
}

function renderLifeJournal() {
  if (!dom.lifeJournal) return;
  if (!state.simulationState) {
    dom.lifeJournal.innerHTML = "";
    const li = document.createElement("li");
    li.className = "journal-placeholder";
    li.textContent = "Le journal de vie apparaitra ici apres le debut de la simulation.";
    dom.lifeJournal.appendChild(li);
    return;
  }

  const timelineEntries = state.simulationState.timeline.slice().reverse();
  dom.lifeJournal.innerHTML = "";

  for (const entry of timelineEntries) {
    const events = state.showSensitive
      ? entry.events
      : entry.events.filter((event) => !isSensitiveCategory(event.category));

    const yearTitle = `Annee ${entry.year} - age ${entry.age}`;
    if (entry.year === 0) {
      dom.lifeJournal.appendChild(createBirthJournalItem(entry, yearTitle));
      continue;
    }

    if (events.length === 0) {
      dom.lifeJournal.appendChild(createNoEventJournalItem(entry, yearTitle));
      continue;
    }

    dom.lifeJournal.appendChild(createEventJournalItem(entry, yearTitle, events));
  }
}

async function api(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Erreur API (${response.status}): ${details}`);
  }

  return response.json();
}

async function bootstrap() {
  const response = await fetch("/api/bootstrap");
  if (!response.ok) {
    throw new Error("Impossible de charger la configuration initiale.");
  }

  const data = await response.json();
  state.yearDurationMs = data.app.yearDurationMs;

  for (const source of data.sources) {
    state.sourceById.set(source.id, source);
  }
}

async function startSimulation() {
  stopAutoPlay();

  const { state: created } = await api("/api/state/create", {});

  state.simulationState = created;
  renderTimeline();
  renderYearEvents([]);
  renderLifeJournal();

  setStatus(
    `Simulation active: age ${created.age}, etape ${created.lifeStage}, identite ${created.identity}, profil ${socioLabel(created.socioEconomic)}.`
  );
  appendLog(
    "info",
    `Nouvelle simulation: naissance aleatoire (${created.assignedSexAtBirth}), profil ${socioLabel(created.socioEconomic)}.`
  );
  startAutoPlay();
  refreshControls();
}

async function advanceYear() {
  if (!state.simulationState?.alive) return;

  const response = await api("/api/state/advance", {
    state: state.simulationState,
  });

  state.simulationState = response.state;
  renderTimeline();
  renderYearEvents(response.yearEvents || []);
  renderLifeJournal();

  if (!state.simulationState.alive) {
    setStatus(
      `Fin de vie atteinte a ${state.simulationState.age} ans. La simulation s'arrete automatiquement.`
    );
    appendLog("warn", `Fin de vie a ${state.simulationState.age} ans.`);
    stopAutoPlay();
  } else {
    setStatus(
      `Annee ${state.simulationState.year}: age ${state.simulationState.age}, etape ${state.simulationState.lifeStage}, identite ${state.simulationState.identity}.`
    );
    appendLog(
      "info",
      `Annee ${state.simulationState.year}, age ${state.simulationState.age}, etape ${state.simulationState.lifeStage}, identite ${state.simulationState.identity}, ${response.yearEvents.length} evenement(s).`
    );

    for (const event of response.yearEvents) {
      appendLog("info", `Evenement: ${event.label} [${event.category}]`);
    }
  }

  refreshControls();
}

function startAutoPlay() {
  if (state.timerId || !state.simulationState?.alive) return;

  state.timerId = setInterval(() => {
    advanceYear().catch((error) => {
      setStatus(error.message);
      stopAutoPlay();
    });
  }, state.yearDurationMs);

  setStatus("Lecture automatique active: +1 an toutes les 5 secondes.");
  appendLog("info", "Lecture automatique demarree.");
  refreshControls();
}

function stopAutoPlay() {
  if (!state.timerId) return;
  clearInterval(state.timerId);
  state.timerId = null;
  refreshControls();
}

dom.form.addEventListener("submit", (event) => {
  event.preventDefault();
  startSimulation().catch((error) => {
    setStatus(error.message);
    appendLog("error", error.message);
  });
});

dom.pause.addEventListener("click", () => {
  stopAutoPlay();
  setStatus("Lecture automatique en pause.");
  appendLog("info", "Lecture automatique en pause.");
});

dom.sensitiveFilter.addEventListener("change", () => {
  state.showSensitive = dom.sensitiveFilter.checked;
  const last = state.simulationState?.timeline?.[state.simulationState.timeline.length - 1];
  renderYearEvents(last?.events || []);
  renderLifeJournal();
  appendLog(
    "info",
    state.showSensitive
      ? "Filtre sensible: affichage active."
      : "Filtre sensible: affichage masque."
  );
});

try {
  if (dom.activityLog) {
    const li = document.createElement("li");
    li.className = "log-placeholder";
    li.textContent = "Le journal technique se remplira automatiquement pendant la simulation.";
    dom.activityLog.appendChild(li);
  }
  renderLifeJournal();
  await bootstrap();
  setStatus("Configuration chargee. Clique sur Naitre pour commencer.");
  appendLog("info", "Configuration chargee. Simulation prete.");
  refreshControls();
} catch (error) {
  setStatus(`Echec au chargement initial: ${error.message}`);
  appendLog("error", `Echec initial: ${error.message}`);
}

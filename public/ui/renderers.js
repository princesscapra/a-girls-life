import { featureEnabled } from "../state/store.js";

export function socioLabel(value) {
  if (value === "low") return "precaire";
  if (value === "high") return "aise";
  return "intermediaire";
}

export function isSensitiveCategory(category) {
  return category === "violences" || category === "discriminations";
}

export function setStatus(dom, text) {
  if (!dom.status) return;
  dom.status.textContent = text;
}

export function appendLog(dom, level, message) {
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
  const entries = dom.activityLog.querySelectorAll("li");
  if (entries.length > 40) {
    entries[entries.length - 1].remove();
  }
}

export function formatBirthDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "aujourd'hui";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function refreshControls(dom, state) {
  if (!dom.pause) return;
  const playing = Boolean(state.timerId);
  dom.pause.disabled = !playing;
}

function sourceMeta(state, sourceId) {
  const source = state.sourceById.get(sourceId);
  if (!source) return "Source indisponible";
  return `${source.organization} - ${source.title} (${source.collectedAt || "date inconnue"})`;
}

function sourceLink(state, sourceId) {
  const source = state.sourceById.get(sourceId);
  if (!source?.url) return "";
  return `<a href="${source.url}" target="_blank" rel="noopener noreferrer">Source</a>`;
}

function probabilityText(value) {
  return `${Math.round((value || 0) * 1000) / 10}%`;
}

export function renderIdentity(dom, state) {
  const entry = state.simulationState;
  if (!entry) return;

  if (dom.avatar) {
    dom.avatar.src = entry.appearance || "";
    dom.avatar.alt = `Portrait de ${entry.name || "personnage"}`;
  }

  if (dom.name) dom.name.textContent = entry.name || "Inconnu-e";
  if (dom.birthDate) dom.birthDate.textContent = formatBirthDate(entry.birthDate);
  if (dom.birthSex) dom.birthSex.textContent = entry.assignedSexAtBirth || "N/A";
  if (dom.genderIdentity) dom.genderIdentity.textContent = entry.identity || "N/A";
  if (dom.sexualOrientation) dom.sexualOrientation.textContent = "Non renseigne";
  if (dom.socialContext) dom.socialContext.textContent = socioLabel(entry.socioEconomic);
  if (dom.religion) dom.religion.textContent = "Non renseigne";
  if (dom.education) dom.education.textContent = "En cours";
  if (dom.profession) dom.profession.textContent = entry.age >= 18 ? "A definir" : "Sans objet";
  if (dom.passion) dom.passion.textContent = "A decouvrir";
}

export function birthModalMessage(entry) {
  const weight = Number(entry.weight || 0).toFixed(2);
  const height = Math.round(Number(entry.height || 0));
  return `- Bordereau de naissance:\n${entry.name} est ne-e le ${formatBirthDate(entry.birthDate)},\nelle pese ${weight}kg et mesure ${height}cm\nDepuis elle illumine nos jours, ecourte nos nuits et fait le bonhuer de toute la famille.\n${entry.mothername} madame ${entry.fathername} monsieur`;
}

export function showBirthModal(dom, state, entry) {
  if (!featureEnabled(state.flags?.ui?.showBirthModal)) {
    return;
  }

  const text = birthModalMessage(entry);

  if (dom.birthModalText) {
    dom.birthModalText.textContent = text;
  }

  if (dom.birthModal && typeof dom.birthModal.showModal === "function") {
    dom.birthModal.showModal();
    return;
  }

  window.alert(text);
}

export function renderYearEvents(dom, state, events) {
  if (!dom.yearEvents) return;
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

    li.innerHTML = `
      <strong>${event.label}</strong>
      <div class="meta">Categorie: ${event.category} | Probabilite appliquee: ${probabilityText(event.probabilityApplied)}</div>
      <div class="meta">${sourceMeta(state, event.sourceId)} ${sourceLink(state, event.sourceId)}</div>
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

export function renderTimeline(dom, state) {
  if (!dom.timeline) return;
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

export function applyUiFlags(dom, state) {
  const ui = state.flags?.ui || {};

  if (dom.identityCard) {
    dom.identityCard.hidden = !featureEnabled(ui.showIdentityCard);
  }

  if (dom.sensitiveFilterCard) {
    dom.sensitiveFilterCard.hidden = !featureEnabled(ui.showSensitiveFilter);
  }

  if (dom.activityLogCard) {
    dom.activityLogCard.hidden = !featureEnabled(ui.showActivityLog);
  }

  if (dom.indicatorsCard) {
    dom.indicatorsCard.hidden = !featureEnabled(ui.showIndicators);
  }

  if (!featureEnabled(ui.showSensitiveFilter)) {
    state.showSensitive = true;
  }
}

function setIndicatorRow(dom, id, value) {
  const fill = dom.indicatorFills[id];
  const label = dom.indicatorValues[id];
  if (!fill || !label) return;

  const safe = Math.max(0, Math.min(100, Math.round(value || 0)));
  fill.style.width = `${safe}%`;
  label.textContent = `${safe}/100`;
}

export function renderIndicators(dom, state) {
  const indicators = state.simulationState?.indicators;
  if (!indicators) return;

  setIndicatorRow(dom, "bonheur", indicators.bonheur);
  setIndicatorRow(dom, "sante", indicators.sante);
  setIndicatorRow(dom, "santeMentale", indicators.santeMentale);
  setIndicatorRow(dom, "estimeDeSoi", indicators.estimeDeSoi);
  setIndicatorRow(dom, "affirmationDeSoi", indicators.affirmationDeSoi);
  setIndicatorRow(dom, "conditionDeVie", indicators.conditionDeVie);
}

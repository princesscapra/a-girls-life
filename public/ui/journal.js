import { isSensitiveCategory } from "./renderers.js";

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

function createBirthJournalItem(entry, yearTitle) {
  const li = document.createElement("li");
  li.innerHTML = `
    <strong>${yearTitle}</strong>: Naissance du personnage.
    <p>${entry.name} est ne-e le aujourd'hui, elle pese ${entry.weight}kg et mesure ${entry.height}cm.
      Depuis elle illumine nos jours, ecourte nos nuits et fait le bonhuer de toute la famille.
      ${entry.mothername} madame ${entry.fathername} monsieur.
    </p>
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

function createEventRow(state, event) {
  const row = document.createElement("div");

  if (isSensitiveCategory(event.category)) {
    row.classList.add("sensitive");
  }

  row.innerHTML = `
    <div>${event.label}</div>
    <div class="meta">Categorie: ${event.category} | Probabilite appliquee: ${probabilityText(event.probabilityApplied)}</div>
    <div class="meta">${sourceMeta(state, event.sourceId)} ${sourceLink(state, event.sourceId)}</div>
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

function createEventJournalItem(state, entry, yearTitle, events) {
  const li = document.createElement("li");
  li.innerHTML = `
    <strong>${yearTitle}</strong>: ${events.length} evenement(s) cette annee.
    <div class="meta">Etape: ${entry.lifeStage || "N/A"} | Identite: ${entry.identity}</div>
  `;

  for (const event of events) {
    li.appendChild(createEventRow(state, event));
  }

  return li;
}

export function renderLifeJournal(dom, state) {
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

    dom.lifeJournal.appendChild(createEventJournalItem(state, entry, yearTitle, events));
  }
}

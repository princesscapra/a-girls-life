import { createSimulationState, advanceSimulationState, fetchBootstrap } from "./services/api.js";
import { createStore, featureEnabled } from "./state/store.js";
import {
  appendLog,
  applyUiFlags,
  refreshControls,
  renderIdentity,
  renderIndicators,
  renderTimeline,
  renderYearEvents,
  setStatus,
  showBirthModal,
  socioLabel,
} from "./ui/renderers.js";
import { renderLifeJournal } from "./ui/journal.js";
import { applyScenarioChoice, ensureIndicators, openScenarioModal } from "./ui/scenario.js";

const state = createStore();

const dom = {
  form: document.getElementById("start-form"),
  status: document.getElementById("status"),
  pause: document.getElementById("pause"),
  yearEvents: document.getElementById("year-events"),
  lifeJournal: document.getElementById("life-journal"),
  timeline: document.getElementById("timeline"),
  activityLog: document.getElementById("activity-log"),
  sensitiveFilter: document.getElementById("sensitive-filter"),
  avatar: document.getElementById("avatar"),
  name: document.getElementById("name"),
  birthDate: document.getElementById("birth-date"),
  birthSex: document.getElementById("birth-sex"),
  genderIdentity: document.getElementById("gender-identity"),
  sexualOrientation: document.getElementById("sexual-orientation"),
  socialContext: document.getElementById("social-context"),
  religion: document.getElementById("religion"),
  education: document.getElementById("education"),
  profession: document.getElementById("profession"),
  passion: document.getElementById("passion"),
  birthModal: document.getElementById("birth-modal"),
  birthModalText: document.getElementById("birth-modal-text"),
  birthModalClose: document.getElementById("birth-modal-close"),
  scenarioModal: document.getElementById("scenario-modal"),
  scenarioTitle: document.getElementById("scenario-title"),
  scenarioDescription: document.getElementById("scenario-description"),
  scenarioEventLabel: document.getElementById("scenario-event-label"),
  scenarioChoices: document.getElementById("scenario-choices"),
  identityCard: document.getElementById("identity-card"),
  sensitiveFilterCard: document.getElementById("sensitive-filter-card"),
  activityLogCard: document.getElementById("activity-log-card"),
  indicatorsCard: document.getElementById("indicators-card"),
  indicatorFills: {
    bonheur: document.getElementById("fill-bonheur"),
    sante: document.getElementById("fill-sante"),
    santeMentale: document.getElementById("fill-sante-mentale"),
    estimeDeSoi: document.getElementById("fill-estime-de-soi"),
    affirmationDeSoi: document.getElementById("fill-affirmation-de-soi"),
    conditionDeVie: document.getElementById("fill-condition-de-vie"),
  },
  indicatorValues: {
    bonheur: document.getElementById("value-bonheur"),
    sante: document.getElementById("value-sante"),
    santeMentale: document.getElementById("value-sante-mentale"),
    estimeDeSoi: document.getElementById("value-estime-de-soi"),
    affirmationDeSoi: document.getElementById("value-affirmation-de-soi"),
    conditionDeVie: document.getElementById("value-condition-de-vie"),
  },
};

async function runScenarioQueue(events) {
  if (!featureEnabled(state.flags?.ui?.showScenarioPopup)) return;
  if (!Array.isArray(events) || events.length === 0) return;
  const shouldResumeAfter = Boolean(state.timerId);
  if (shouldResumeAfter) {
    stopAutoPlay();
  }

  const selectableEvents = events.filter((event) => event.id !== "mortality");

  const processEventAt = async (index) => {
    if (index >= selectableEvents.length) return;
    const event = selectableEvents[index];
    const choice = await openScenarioModal(dom, state, event);
    if (choice) {
      applyScenarioChoice(state.simulationState, choice);
      const currentEntry = state.simulationState.timeline[state.simulationState.timeline.length - 1];
      if (currentEntry) {
        if (!Array.isArray(currentEntry.playerChoices)) {
          currentEntry.playerChoices = [];
        }

        currentEntry.playerChoices.push({
          eventId: event.id,
          choiceId: choice.id,
          choiceLabel: choice.label,
        });
      }

      appendLog(dom, "info", `Choix scenario: ${choice.label} (${event.id})`);
      renderIndicators(dom, state);
    }

    await processEventAt(index + 1);
  };

  await processEventAt(0);

  if (shouldResumeAfter && state.simulationState?.alive) {
    startAutoPlay();
  }
}

function stopAutoPlay() {
  if (!state.timerId) return;
  clearInterval(state.timerId);
  state.timerId = null;
  refreshControls(dom, state);
}

async function advanceYear() {
  if (!state.simulationState?.alive) return;

  const response = await advanceSimulationState(state.simulationState);
  state.simulationState = response.state;
  ensureIndicators(state.simulationState);

  renderTimeline(dom, state);
  renderYearEvents(dom, state, response.yearEvents || []);
  renderLifeJournal(dom, state);
  renderIdentity(dom, state);
  renderIndicators(dom, state);

  if (state.simulationState.alive) {
    await runScenarioQueue(response.yearEvents || []);
  }

  if (!state.simulationState.alive) {
    setStatus(dom, `Fin de vie atteinte a ${state.simulationState.age} ans. La simulation s'arrete automatiquement.`);
    appendLog(dom, "warn", `Fin de vie a ${state.simulationState.age} ans.`);
    stopAutoPlay();
  } else {
    setStatus(
      dom,
      `Annee ${state.simulationState.year}: age ${state.simulationState.age}, etape ${state.simulationState.lifeStage}, identite ${state.simulationState.identity}.`
    );
    appendLog(
      dom,
      "info",
      `Annee ${state.simulationState.year}, age ${state.simulationState.age}, etape ${state.simulationState.lifeStage}, identite ${state.simulationState.identity}, ${response.yearEvents.length} evenement(s).`
    );

    for (const event of response.yearEvents) {
      appendLog(dom, "info", `Evenement: ${event.label} [${event.category}]`);
    }
  }

  refreshControls(dom, state);
}

function startAutoPlay() {
  if (state.timerId || !state.simulationState?.alive) return;

  state.timerId = setInterval(() => {
    advanceYear().catch((error) => {
      setStatus(dom, error.message);
      stopAutoPlay();
    });
  }, state.yearDurationMs);

  setStatus(dom, "Lecture automatique active: +1 an toutes les 5 secondes.");
  appendLog(dom, "info", "Lecture automatique demarree.");
  refreshControls(dom, state);
}

async function bootstrap() {
  const data = await fetchBootstrap();
  state.yearDurationMs = data.app.yearDurationMs;
  state.flags = data.flags || state.flags;
  applyUiFlags(dom, state);

  for (const source of data.sources) {
    state.sourceById.set(source.id, source);
  }
}

async function startSimulation() {
  stopAutoPlay();

  const { state: created } = await createSimulationState();
  state.simulationState = created;
  ensureIndicators(state.simulationState);

  renderTimeline(dom, state);
  renderYearEvents(dom, state, []);
  renderLifeJournal(dom, state);
  renderIdentity(dom, state);
  renderIndicators(dom, state);
  showBirthModal(dom, state, created);

  setStatus(
    dom,
    `Simulation active: age ${created.age}, etape ${created.lifeStage}, identite ${created.identity}, profil ${socioLabel(created.socioEconomic)}.`
  );
  appendLog(
    dom,
    "info",
    `Nouvelle simulation: naissance aleatoire (${created.assignedSexAtBirth}), profil ${socioLabel(created.socioEconomic)}.`
  );

  if (featureEnabled(state.flags?.ui?.autoStartAfterBirth)) {
    startAutoPlay();
  }

  refreshControls(dom, state);
}

dom.form.addEventListener("submit", (event) => {
  event.preventDefault();
  startSimulation().catch((error) => {
    setStatus(dom, error.message);
    appendLog(dom, "error", error.message);
  });
});

dom.pause.addEventListener("click", () => {
  stopAutoPlay();
  setStatus(dom, "Lecture automatique en pause.");
  appendLog(dom, "info", "Lecture automatique en pause.");
});

if (dom.birthModalClose) {
  dom.birthModalClose.addEventListener("click", () => {
    if (dom.birthModal?.open) {
      dom.birthModal.close();
    }
  });
}

if (dom.sensitiveFilter) {
  dom.sensitiveFilter.addEventListener("change", () => {
    state.showSensitive = dom.sensitiveFilter.checked;
    const last = state.simulationState?.timeline?.[state.simulationState.timeline.length - 1];
    renderYearEvents(dom, state, last?.events || []);
    renderLifeJournal(dom, state);
    appendLog(
      dom,
      "info",
      state.showSensitive
        ? "Filtre sensible: affichage active."
        : "Filtre sensible: affichage masque."
    );
  });
}

try {
  if (dom.activityLog) {
    const li = document.createElement("li");
    li.className = "log-placeholder";
    li.textContent = "Le journal technique se remplira automatiquement pendant la simulation.";
    dom.activityLog.appendChild(li);
  }

  renderLifeJournal(dom, state);
  await bootstrap();
  setStatus(dom, "Configuration chargee. Clique sur Naitre pour commencer.");
  appendLog(dom, "info", "Configuration chargee. Simulation prete.");
  refreshControls(dom, state);
} catch (error) {
  setStatus(dom, `Echec au chargement initial: ${error.message}`);
  appendLog(dom, "error", `Echec initial: ${error.message}`);
}

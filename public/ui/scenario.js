import { featureEnabled } from "../state/store.js";

const INDICATOR_DEFAULTS = {
  bonheur: 50,
  sante: 55,
  santeMentale: 50,
  estimeDeSoi: 50,
  affirmationDeSoi: 45,
  conditionDeVie: 50,
};

const INDICATOR_KEYS = Object.keys(INDICATOR_DEFAULTS);

function clampIndicator(value) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

export function ensureIndicators(simulationState) {
  if (!simulationState.indicators || typeof simulationState.indicators !== "object") {
    simulationState.indicators = structuredClone(INDICATOR_DEFAULTS);
    return;
  }

  for (const key of INDICATOR_KEYS) {
    const value = simulationState.indicators[key];
    if (typeof value !== "number") {
      simulationState.indicators[key] = INDICATOR_DEFAULTS[key];
      continue;
    }

    simulationState.indicators[key] = clampIndicator(value);
  }
}

function genericNegativeChoices() {
  return [
    {
      id: "choice_support",
      label: "Placeholder choix 1 - Chercher du soutien",
      description: "TODO: remplacer par un texte de choix precis.",
      delta: {
        santeMentale: 4,
        estimeDeSoi: 2,
        conditionDeVie: -1,
      },
    },
    {
      id: "choice_endure",
      label: "Placeholder choix 2 - Endurer sans en parler",
      description: "TODO: remplacer par un texte de choix precis.",
      delta: {
        bonheur: -3,
        santeMentale: -4,
        affirmationDeSoi: -2,
      },
    },
    {
      id: "choice_action",
      label: "Placeholder choix 3 - Passer a l'action",
      description: "TODO: remplacer par un texte de choix precis.",
      delta: {
        affirmationDeSoi: 5,
        estimeDeSoi: 2,
        conditionDeVie: 1,
      },
    },
  ];
}

function genericPositiveChoices() {
  return [
    {
      id: "choice_capitalize",
      label: "Placeholder choix 1 - Saisir l'opportunite",
      description: "TODO: remplacer par un texte de choix precis.",
      delta: {
        bonheur: 4,
        estimeDeSoi: 3,
        conditionDeVie: 3,
      },
    },
    {
      id: "choice_share",
      label: "Placeholder choix 2 - Partager avec ses proches",
      description: "TODO: remplacer par un texte de choix precis.",
      delta: {
        bonheur: 3,
        santeMentale: 2,
        affirmationDeSoi: 2,
      },
    },
    {
      id: "choice_decline",
      label: "Placeholder choix 3 - Ne rien changer",
      description: "TODO: remplacer par un texte de choix precis.",
      delta: {},
    },
  ];
}

function isPositiveEvent(event) {
  return event.category === "positif" || event.category === "opportunites";
}

export function buildScenarioFromEvent(event) {
  const positive = isPositiveEvent(event);

  return {
    eventId: event.id,
    eventLabel: event.label,
    title: positive
      ? `Placeholder scenario positif: ${event.label}`
      : `Placeholder scenario: ${event.label}`,
    description: positive
      ? "TODO: ecrire ici la version narrative d'un evenement positif."
      : "TODO: ecrire ici la description narrative de l'evenement.",
    choices: positive ? genericPositiveChoices() : genericNegativeChoices(),
  };
}

export function applyScenarioChoice(simulationState, choice) {
  ensureIndicators(simulationState);
  const delta = choice?.delta || {};

  for (const key of INDICATOR_KEYS) {
    const shift = typeof delta[key] === "number" ? delta[key] : 0;
    simulationState.indicators[key] = clampIndicator(simulationState.indicators[key] + shift);
  }
}

export function openScenarioModal(dom, state, event) {
  if (!featureEnabled(state.flags?.ui?.showScenarioPopup)) {
    return Promise.resolve(null);
  }

  const scenario = buildScenarioFromEvent(event);

  if (!dom.scenarioModal || typeof dom.scenarioModal.showModal !== "function") {
    return Promise.resolve(scenario.choices[0]);
  }

  dom.scenarioTitle.textContent = scenario.title;
  dom.scenarioDescription.textContent = scenario.description;
  dom.scenarioEventLabel.textContent = `Evenement: ${scenario.eventLabel}`;
  dom.scenarioChoices.innerHTML = "";

  return new Promise((resolve) => {
    const cleanup = () => {
      dom.scenarioChoices.innerHTML = "";
      if (dom.scenarioModal.open) {
        dom.scenarioModal.close();
      }
    };

    for (const choice of scenario.choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scenario-choice";
      button.innerHTML = `<strong>${choice.label}</strong><span>${choice.description}</span>`;
      button.addEventListener("click", () => {
        cleanup();
        resolve(choice);
      });
      dom.scenarioChoices.appendChild(button);
    }

    dom.scenarioModal.showModal();
  });
}

function clampProbability(value) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function enabled(flagValue) {
  return flagValue !== false;
}

function mortalityProbabilityByAge(age) {
  if (age <= 1) return 0.003;
  if (age <= 14) return 0.0001;
  if (age <= 24) return 0.0003;
  if (age <= 44) return 0.0007;
  if (age <= 64) return 0.003;
  if (age <= 74) return 0.01;
  if (age <= 84) return 0.04;
  return 0.12;
}

function lifeStageByAge(age) {
  if (age < 3) return "Bebe";
  if (age < 5) return "Bambin";
  if (age < 12) return "Enfant";
  if (age < 18) return "Adolescence";
  if (age < 35) return "Jeune adulte";
  if (age < 65) return "Adulte";
  return "Senior";
}

function hasAnyTriggered(state, eventIds) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) return true;
  return eventIds.some((eventId) => state.triggeredEventIds.includes(eventId));
}

function hasAllTriggered(state, eventIds) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) return true;
  return eventIds.every((eventId) => state.triggeredEventIds.includes(eventId));
}

function canTrigger(event, state) {
  const ageMinOk = typeof event.minAge !== "number" || state.age >= event.minAge;
  const ageMaxOk = typeof event.maxAge !== "number" || state.age <= event.maxAge;
  if (!ageMinOk || !ageMaxOk) return false;

  const target = event.target || "all_women";
  if (target === "cis_women" && state.isTransWoman) return false;
  if (target === "trans_women" && !state.isTransWoman) return false;

  if (Array.isArray(event.socioEconomic) && !event.socioEconomic.includes(state.socioEconomic)) {
    return false;
  }

  if (event.unique && state.triggeredEventIds.includes(event.id)) {
    return false;
  }

  if (!hasAnyTriggered(state, event.requiresAnyTriggered)) return false;
  if (!hasAllTriggered(state, event.requiresAllTriggered)) return false;

  return true;
}

function eventProbability(event, state) {
  let probability = event.probabilityAnnual || 0;

  if (Array.isArray(event.modifiers)) {
    for (const modifier of event.modifiers) {
      const ageOk = typeof modifier.minAge !== "number" || state.age >= modifier.minAge;
      const ageMaxOk = typeof modifier.maxAge !== "number" || state.age <= modifier.maxAge;
      const transOk = typeof modifier.transWoman !== "boolean" || modifier.transWoman === state.isTransWoman;
      const socioOk = !Array.isArray(modifier.socioEconomic) || modifier.socioEconomic.includes(state.socioEconomic);
      const requiresAnyOk = hasAnyTriggered(state, modifier.requiresAnyTriggered);
      const requiresAllOk = hasAllTriggered(state, modifier.requiresAllTriggered);

      if (ageOk && ageMaxOk && transOk && socioOk && requiresAnyOk && requiresAllOk) {
        probability *= modifier.multiplier;
      }
    }
  }

  return clampProbability(probability);
}

function maybeTransitionIdentity(state, rng) {
  const events = [];

  if (state.assignedSexAtBirth === "AMAB" && !state.isTransWoman && state.age >= 11 && state.age <= 35) {
    const probability = state.age < 18 ? 0.04 : 0.02;
    if (rng() < probability) {
      state.isTransWoman = true;
      state.identity = state.age < 18 ? "fille trans" : "femme trans";
      events.push({
        id: "identity_transition_sociale",
        category: "identite",
        label: "Le personnage affirme une identite de genre feminine.",
        probabilityApplied: probability,
        sourceId: "wpath_trans_health",
        sourceCollectedAt: "2026-10-26",
      });
    }
  }

  if (state.assignedSexAtBirth === "AFAB") {
    state.identity = state.age < 18 ? "fille cis" : "femme cis";
  } else if (!state.isTransWoman) {
    state.identity = "identite en exploration";
  }

  return events;
}

function giveAName(assignedSexAtBirth) {
  const names = {
    AFAB: ["Alice", "Emma", "Léa", "Chloé", "Manon"],
    AMAB: ["Lucas", "Hugo", "Arthur", "Louis", "Gabriel"],
  };

  const nameList = names[assignedSexAtBirth] || [];
  if (nameList.length === 0) return "Inconnu-e";

  const index = Math.floor(Math.random() * nameList.length);
  return nameList[index];
}

function assignWeight() {
  return Math.random() * 2 + 3; // Poids entre 3 et 5 kg
}

function assignHeight() {
  return Math.random() * 20 + 50; // Taille entre 50 et 70 cm
}

function giveMotherName() {
  const motherNames = ["Marie", "Sophie", "Isabelle", "Catherine", "Julie"];
  const index = Math.floor(Math.random() * motherNames.length);
  return motherNames[index];
}

function giveFatherName() {
  const fatherNames = ["Jean", "Pierre", "Michel", "Jacques", "Louis"];
  const index = Math.floor(Math.random() * fatherNames.length);
  return fatherNames[index];
}

function getAppearance() {
  const randomValue = Math.random();
  if (randomValue < 0.5) return "/images/char-1.jpg";
  if (randomValue < 0.75) return "/images/char-2.jpg";
  return "/images/char-3.jpg";
}

function createDefaultIndicators() {
  return {
    bonheur: 50,
    sante: 55,
    santeMentale: 50,
    estimeDeSoi: 50,
    affirmationDeSoi: 45,
    conditionDeVie: 50,
  };
}

export function createInitialState(input = {}, simulationFlags = {}) {
  const rng = typeof input.rng === "function" ? input.rng : Math.random;
  const assignedSexAtBirth = rng() < 0.5 ? "AFAB" : "AMAB";

  const socioRoll = rng();
  let socioEconomic = "middle";
  if (socioRoll < 0.3) socioEconomic = "low";
  if (socioRoll >= 0.8) socioEconomic = "high";

  const initialIdentity = assignedSexAtBirth === "AFAB" ? "fille cis" : "identite en exploration";
  const lifeStage = lifeStageByAge(0);
  const birthDate = input.birthDate || new Date().toISOString();

  const name = input.name || giveAName(assignedSexAtBirth);
  const appearance = input.appearance || getAppearance();
  const weight = input.weight || assignWeight();
  const height = input.height || assignHeight();
  const mothername = input.mothername || giveMotherName();
  const fathername = input.fathername || giveFatherName();
  const indicators = input.indicators || createDefaultIndicators();

  return {
    age: 0,
    year: 0,
    appearance,
    name,
    weight,
    height,
    mothername,
    fathername,
    birthDate,
    alive: true,
    assignedSexAtBirth,
    socioEconomic,
    isTransWoman: false,
    identity: initialIdentity,
    lifeStage,
    indicators,
    triggeredEventIds: [],
    timeline: [
      {
        year: 0,
        age: 0,
        name,
        weight,
        height,
        mothername,
        fathername,
        birthDate,
        identity: initialIdentity,
        lifeStage,
        indicators: structuredClone(indicators),
        events: [],
      },
    ],
    simulationFlags: {
      enableIdentityTransition: enabled(simulationFlags.enableIdentityTransition),
      enableMortality: enabled(simulationFlags.enableMortality),
    },
  };
}

export function advanceOneYear(
  currentState,
  eventCatalog,
  sourceMap,
  rng = Math.random,
  simulationFlags = {}
) {
  const state = structuredClone(currentState);
  const yearEvents = [];
  const features = {
    enableIdentityTransition:
      enabled(simulationFlags.enableIdentityTransition) && enabled(state.simulationFlags?.enableIdentityTransition),
    enableMortality: enabled(simulationFlags.enableMortality) && enabled(state.simulationFlags?.enableMortality),
  };

  if (!state.alive) {
    return {
      state,
      yearEvents,
    };
  }

  state.year += 1;
  state.age += 1;
  state.lifeStage = lifeStageByAge(state.age);

  if (features.enableIdentityTransition) {
    yearEvents.push(...maybeTransitionIdentity(state, rng));
  }

  for (const event of eventCatalog) {
    if (!canTrigger(event, state)) continue;

    const probabilityApplied = eventProbability(event, state);
    if (rng() >= probabilityApplied) continue;

    state.triggeredEventIds.push(event.id);
    yearEvents.push({
      id: event.id,
      category: event.category,
      label: event.label,
      probabilityApplied,
      sourceId: event.sourceId,
      sourceCollectedAt: sourceMap[event.sourceId]?.collectedAt || null,
      note: event.note || null,
      effects: Array.isArray(event.effects) ? event.effects : [],
    });
  }

  if (features.enableMortality) {
    const deathProbability = clampProbability(mortalityProbabilityByAge(state.age));
    if (state.age >= 110 || rng() < deathProbability) {
      state.alive = false;
      yearEvents.push({
        id: "mortality",
        category: "mortalite",
        label: "Fin de vie du personnage.",
        probabilityApplied: deathProbability,
        sourceId: "insee_mortality",
        sourceCollectedAt: sourceMap.insee_mortality?.collectedAt || null,
      });
    }
  }

  state.timeline.push({
    year: state.year,
    age: state.age,
    identity: state.identity,
    lifeStage: state.lifeStage,
    indicators: structuredClone(state.indicators),
    events: yearEvents,
  });

  return {
    state,
    yearEvents,
  };
}

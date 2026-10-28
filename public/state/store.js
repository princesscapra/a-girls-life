export function featureEnabled(value) {
  return value !== false;
}

export function createStore() {
  return {
    simulationState: null,
    timerId: null,
    yearDurationMs: 5000,
    sourceById: new Map(),
    showSensitive: true,
    flags: {
      ui: {
        showBirthModal: true,
        showSensitiveFilter: true,
        showIdentityCard: true,
        showActivityLog: true,
        showScenarioPopup: true,
        showIndicators: true,
        autoStartAfterBirth: true,
      },
    },
  };
}

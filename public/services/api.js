async function parseError(response) {
  const details = await response.text();
  return `Erreur API (${response.status}): ${details}`;
}

export async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function fetchBootstrap() {
  const response = await fetch("/api/bootstrap");
  if (!response.ok) {
    throw new Error("Impossible de charger la configuration initiale.");
  }

  return response.json();
}

export async function createSimulationState() {
  return postJson("/api/state/create", {});
}

export async function advanceSimulationState(simulationState) {
  return postJson("/api/state/advance", { state: simulationState });
}

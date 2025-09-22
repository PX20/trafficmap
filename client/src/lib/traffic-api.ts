export async function getTrafficEvents() {
  const response = await fetch('/api/unified');
  if (!response.ok) {
    throw new Error(`Failed to fetch unified data: ${response.statusText}`);
  }
  return response.json();
}


export async function getIncidents() {
  const response = await fetch('/api/incidents');
  if (!response.ok) {
    throw new Error(`Failed to fetch incidents: ${response.statusText}`);
  }
  return response.json();
}


export async function getTrafficEvents() {
  const response = await fetch('/api/traffic/events');
  if (!response.ok) {
    throw new Error(`Failed to fetch traffic events: ${response.statusText}`);
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


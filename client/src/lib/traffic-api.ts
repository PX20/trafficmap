export async function getTrafficEvents() {
  const response = await fetch('/api/traffic/events');
  if (!response.ok) {
    throw new Error(`Failed to fetch traffic events: ${response.statusText}`);
  }
  return response.json();
}

export async function getTrafficCameras() {
  const response = await fetch('/api/traffic/cameras');
  if (!response.ok) {
    throw new Error(`Failed to fetch traffic cameras: ${response.statusText}`);
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

export async function getWeatherStations() {
  const response = await fetch('/api/weather');
  if (!response.ok) {
    throw new Error(`Failed to fetch weather data: ${response.statusText}`);
  }
  return response.json();
}

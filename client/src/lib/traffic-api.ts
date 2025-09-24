export async function getUnifiedIncidents() {
  const response = await fetch('/api/unified');
  if (!response.ok) {
    throw new Error(`Failed to fetch unified incidents: ${response.statusText}`);
  }
  return response.json();
}

// Legacy function - now points to unified endpoint
export async function getTrafficEvents() {
  return getUnifiedIncidents();
}

// Legacy function - now points to unified endpoint  
export async function getIncidents() {
  return getUnifiedIncidents();
}


export async function getPosts() {
  const response = await fetch('/api/posts');
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.statusText}`);
  }
  return response.json();
}

// Legacy functions - now point to posts endpoint
export async function getUnifiedIncidents() {
  return getPosts();
}

export async function getTrafficEvents() {
  return getPosts();
}

export async function getIncidents() {
  return getPosts();
}


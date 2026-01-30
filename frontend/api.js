async function apiRequest(endpoint, data) {
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`);
    }
    return result;
  } catch (error) {
    console.error(`API request failed (${endpoint}):`, error);
    throw error;
  }
}

function checkSession() {
  const authData = sessionStorage.getItem('authData');
  if (!authData) return false;
  
  const data = JSON.parse(authData);
  const now = Date.now();
  const EXPIRY_MS = 200000;
  
  return (now - data.authDate) <= EXPIRY_MS;
}

function getAuthData() {
  const data = sessionStorage.getItem('authData');
  return data ? JSON.parse(data) : null;
}

function clearSession() {
  sessionStorage.clear();
}
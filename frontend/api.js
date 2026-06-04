async function apiRequest(endpoint, data = {}, method = 'POST') { 
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method !== 'GET' ? JSON.stringify(data) : undefined
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
  const minute = 1; 
  return (now - data.authDate) <= minute;
}

function getAuthData() {
  const data = sessionStorage.getItem('authData');
  return data ? JSON.parse(data) : null;
}

function clearSession() {
  sessionStorage.clear();
}

async function getMetersByLicschet(g_licschet) {
  return await apiRequest('/meters-by-licschet', { g_licschet });
}

async function getMetersByBuilding(buildingId) {
  return await apiRequest('/meters-by-building', {buildingId});
}

function getSelectedMeter() {
  const data = sessionStorage.getItem('selectedMeter');
  return data ? JSON.parse(data) : null;
}

function saveSelectedMeter(meter) {
  sessionStorage.setItem('selectedMeter', JSON.stringify({
    meterNum: meter.meterNum,
    mountDate: meter.mountDate,
    verifyDate: meter.verifyDate,
    licschet: meter.licschet,
    id: meter.id
  }));
}

function clearSelectedMeter() {
  sessionStorage.removeItem('selectedMeter');
}

function getActiveMeter() {
  const data = sessionStorage.getItem('activeMeter');
  return data ? JSON.parse(data) : null;
}

function saveActiveMeter(meter) {
  sessionStorage.setItem('activeMeter', JSON.stringify({
    meterNum: meter.meterNum,
    mountDate: meter.mountDate,
    verifyDate: meter.verifyDate,
    licschet: meter.licschet,
    id: meter.id
  }));
}

function clearActiveMeter() {
  sessionStorage.removeItem('activeMeter');
}


function saveAllMeters(meters) {
  sessionStorage.setItem('allMeters', JSON.stringify(meters));
}

function getAllMeters() {
  const data = sessionStorage.getItem('allMeters');
  return data ? JSON.parse(data) : [];
}

function clearAllMeters() {
  sessionStorage.removeItem('allMeters');
}
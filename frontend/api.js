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
  const path = window.location.pathname.toLowerCase();
  const href = window.location.href.toLowerCase();
  if (path.includes('index.html') || path.includes('oldtokenwindow.html') || path === '/' || path === '/frontend')
  {
    return true;
  }
  const authData = getAuthData();
  const isOffline = !navigator.onLine
  if (!authData)
  {
    if (isOffline) {
      console.warn("Офлайн-режим, отсутствует подключение к сети.");
      return true;
    }
    setTimeout(() => window.location.href = 'index.html', 2000);
    return false;
  }
  const data = JSON.parse(authData);
  const now = Date.now();
  const minute = 2400000; 
  if (!isOffline && (now - authData.authDate > EXPIRY_MS)) {
    console.warn("Сессия истекла");
    return false; 
  }
  return true;
}

function getAuthData() {
  let data = sessionStorage.getItem('authData');
  if (!data)
  {
    data = localStorage.getItem('authData');
  }
  return data ? JSON.parse(data) : null;
}

function clearSession() {
  sessionStorage.clear();
}

function clearSessionAndLogout() {
  sessionStorage.clear();
  localStorage.removeItem('authData');
  localStorage.clear(); 
  window.location.href = 'index.html';
}

async function syncPendingReadings() {
  if (!navigation.onLine) return;
  if (typeof getPendingReadings !== 'function') return;
  const pending = await getPendingReadings();
  if (pending.length === 0) return;
  console.log(`Найдено ${pending.length} записей`);
  for (const record of pending) {
    try {
      const formData = new FormData();
      if (record.isViolation) {
        formData.append('meterNum', record.meterNum);
        formData.append('licschet', record.licschet);
        formData.append('violations', record.violations);
        if (record.filesData && record.filesData.length > 0) {
          record.filesData.forEach(f => formData.append('files', base64ToBlob(f.fileBase64, f.fileType), f.fileName));
        } else if (record.fileBase64) {
          formData.append('files', base64ToBlob(record.fileBase64, record.fileType), record.fileName);
        }
        const response = await fetch('http://localhost:3000/save-violation',{ method: 'POST', body: formData});
        if (response.ok)
        {
          await deletePendingReading(record.id);
          console.log(`Нарушение ID ${record.id}`);
        }
      } else {
        formData.append('ph', record.ph);
        formData.append('meter_id', record.meter_id);
        formData.append('licschet', record.licschet);
        formData.append('abonent_name', record.abonent_name);
        formData.append('description', record.description);
        if (record.filesData && record.filesData.length > 0) {
          record.filesData.forEach(f => formData.append('file', base64ToBlob(f.fileBase64, f.fileType), f.fileName));          
        } else if (record.fileBase64) { 
          formData.append('files', base64ToBlob(record.fileBase64, record.fileType), record.fileName);
        }
        const response = await fetch('http://localhost:3000/PH', { method: 'POST', body: formData});
        if (response.ok) 
        {
          await deletePendingReading(record.id);
          console.log(`Показания ID ${record.id}`);
        }
      }
    } catch (err) {
      console.error(`ошибка синхронизации ${record.id}:`, err);
    }
  }
}

async function getMetersByLicschet(g_licschet) {
  return await apiRequest('/meters-by-licschet', { g_licschet });
}

async function getMetersByBuilding(buildingId) {
  return await apiRequest('/meters-by-building', {buildingId});
}

async function getControllerAddresses(controllerId) {
  return await apiRequest('/controller-addresses', { controllerId });
}

async function updateVerifyDate(meterId, verifyDate) {
  return await apiRequest('/update-verify-date', { meterId, verifyDate });
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
// const API_BASE = window.location.hostname === 'localhost' 
//   ? 'http://localhost:3000' 
//   : (window.location.protocol.startsWith('http') ? window.location.origin : 'http://10.151.16.1:3000');

const REMOTE_SERVER_IP = '37.195.66.20'; //Ввод адреса удаленного сервера.
const PORT = '3000';
let API_BASE;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  API_BASE = `http://localhost:${PORT}`;
} else if (window.location.origin && window.location.origin !== 'null' && window.location.origin !== 'file://') {
  API_BASE = window.location.origin;
} else {
  API_BASE = `http://${REMOTE_SERVER_IP}:${PORT}`;
}

async function apiRequest(endpoint, data = {}, method = 'POST') { 
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: method !== 'GET' ? JSON.stringify(data) : undefined
    });   
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(`Сервер вернул HTML вместо JSON (Статус: ${response.status}). URL: ${endpoint}`);
    }
    if (!response.ok) {
      const err = new Error(result.error || `Ошибка сервера: ${response.status}`);
      err.status = response.status;
      err.body = result;
      console.error(`API request failed (${endpoint}): status=${response.status}`, result);
      throw err;
    }
    return result;
  } catch (error) {
    if (error && error.status) {
      console.error(`API request failed (${endpoint}): status=${error.status}`, error.body || error.message);
    } else {
      console.error(`API request failed (${endpoint}):`, error);
    }
    throw error;
  }
}

function checkSession() {
  const path = window.location.pathname.toLowerCase();
  const href = window.location.href.toLowerCase();
  if (path.includes('index.html') || path.includes('oldtokenwindow.html') || path === '/' || path === '/frontend') {
    return true;
  }
  const authData = getAuthData();
  const isOffline = !navigator.onLine;
  if (!authData) {
    if (isOffline) {
      console.warn("Офлайн-режим, отсутствует подключение к сети.");
      return true;
    }
    setTimeout(() => window.location.href = 'index.html', 2000);
    return false;
  }
  const data = JSON.parse(authData);
  const now = Date.now();
  const EXPIRY_MS = 240000000;
  if (!isOffline && (now - data.authDate > EXPIRY_MS)) {
    console.warn("Сессия истекла");
    sessionStorage.setItem('lastAuthDate', authData.authDate);
    return false; 
  }
  return true;
}

function getAuthData() {
  let data = sessionStorage.getItem('authData');
  if (!data) {
    data = localStorage.getItem('authData');
  }
  return data ? JSON.parse(data) : null;
}

function clearSession() {
  sessionStorage.clear();
}

async function clearSessionAndLogout() {
  const lastPassword = localStorage.getItem('lastPassword');
  sessionStorage.clear();
  localStorage.removeItem('authData');
  localStorage.removeItem('offlineAuthData');
  localStorage.clear();
  if (lastPassword !== null) {
    localStorage.setItem('lastPassword', lastPassword);
  }
  try {
    if (typeof clearControllerPackage === 'function') {
      await clearControllerPackage();
    } else {
      const request = indexedDB.open('MeterOfflineStorage', 4);
      request.onsuccess = (event) => {
        const db = event.target.result;
        if (db.objectStoreNames.contains('controllerPackages')) {
          const transaction = db.transaction(['controllerPackages'], 'readwrite');
          const store = transaction.objectStore('controllerPackages');
          store.clear();
        }
      };
    }
  } catch (e) {
    console.error('Ошибка очистки IndexedDB при выходе:', e);
  }  
  window.location.href = 'index.html';
}

async function syncPendingReadings() {
  if (!navigator.onLine) return;
  if (typeof getPendingReadings !== 'function') return;
  const pending = await getPendingReadings();
  if (pending.length === 0) return;
  console.log(`Найдено ${pending.length} записей`);
  for (const record of pending) {
    try {
      const formData = new FormData();
      const appendFiles = (filesData) => {
        if (!filesData || filesData.length === 0) return;
        filesData.forEach(f => {
          let blob;
          if (f.fileBuffer && f.fileBuffer instanceof ArrayBuffer) {
            blob = new Blob([f.fileBuffer], { type: f.fileType || 'application/octet-stream' });
          } else if (f.fileBase64) {
            blob = base64ToBlob(f.fileBase64, f.fileType);
          } else {
            return;
          }
          formData.append('files', blob, f.fileName);
        });
      };    
      if (record.isViolation) {
        formData.append('meterNum', record.meterNum);
        formData.append('licschet', record.licschet);
        formData.append('violations', record.violations);
        appendFiles(record.filesData);       
        const response = await fetch(`${API_BASE}/save-violation`, { 
          method: 'POST', 
          body: formData 
        });
        if (response.ok) {
          await deletePendingReading(record.id);
          console.log(`Нарушение ID ${record.id} синхронизировано`);
        }
      } else {
        formData.append('ph', record.ph);
        formData.append('meter_id', record.meter_id);
        formData.append('licschet', record.licschet);
        formData.append('abonent_name', record.abonent_name);
        formData.append('description', record.description);
        if (record.actId) formData.append('act_id', record.actId);
        if (record.controllerId) formData.append('controllerId', record.controllerId);
        appendFiles(record.filesData);       
        const response = await fetch(`${API_BASE}/PH`, { 
          method: 'POST', 
          body: formData 
        });
        if (response.ok) {
          await deletePendingReading(record.id);
          console.log(`Показания ID ${record.id} синхронизированы`);
        }
      }
    } catch (err) {
      console.error(`Ошибка синхронизации ${record.id}:`, err);
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
    id: meter.id,
    name: meter.name,
    groupName: meter.groupName,
    clientName: meter.clientName
  }));
}

function syncMeterSessionData(meterId, updates) {
  const updateMeter = (meter) => {
    if (!meter || String(meter.id) !== String(meterId)) return meter;
    return { ...meter, ...updates };
  };

  const activeMeter = getActiveMeter();
  if (activeMeter && String(activeMeter.id) === String(meterId)) {
    saveActiveMeter(updateMeter(activeMeter));
  }

  const selectedMeter = getSelectedMeter();
  if (selectedMeter && String(selectedMeter.id) === String(meterId)) {
    saveSelectedMeter(updateMeter(selectedMeter));
  }

  const allMeters = getAllMeters();
  if (allMeters.length) {
    saveAllMeters(allMeters.map(meter => updateMeter(meter)));
  }

  if (updates.meterNum !== undefined) {
    sessionStorage.setItem('meternum', JSON.stringify({ meterNum: updates.meterNum }));
  }
  if (updates.mountDate !== undefined) {
    sessionStorage.setItem('mountdate', JSON.stringify({ mountDate: updates.mountDate }));
  }
  if (updates.verifyDate !== undefined) {
    sessionStorage.setItem('verifydate', JSON.stringify({ verifyDate: updates.verifyDate }));
  }
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

function showAlert(message, type = 'info') {
  const existingModal = document.getElementById('custom-alert-modal');
  if (existingModal) existingModal.remove();
  const overlay = document.createElement('div');
  overlay.id = 'custom-alert-modal';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(0, 0, 0, 0.6); z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.2s ease;
  `;
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #FFFFFF; border-radius: 8px; padding: 24px 20px;
    max-width: 340px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    border: 2px solid #45B0E1; text-align: center;
    animation: slideUp 0.25s ease;
  `;
  let iconColor = '#45B0E1';
  let icon = ' ';
  if (type === 'error') { iconColor = '#C62828'; icon = ' '; }
  if (type === 'success') { iconColor = '#28a745'; icon = ' '; }
  modal.innerHTML = `
    <div style="font-size: 40px; color: ${iconColor}; margin-bottom: 12px;">${icon}</div>
    <div style="font-size: 16px; color: #333333; line-height: 1.5; margin-bottom: 20px; word-break: break-word;">
      ${message.replace(/\n/g, '<br>')}
    </div>
    <button id="custom-alert-ok" style="
      width: 100%; padding: 12px 16px; font-size: 16px; font-weight: 600;
      color: #FFFFFF; background-color: #45B0E1; border: 2px solid #45B0E1;
      border-radius: 4px; cursor: pointer; touch-action: manipulation;
    ">OK</button>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const close = () => {
    overlay.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => overlay.remove(), 180);
  };
  const okBtn = modal.querySelector('#custom-alert-ok');
  okBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  setTimeout(() => okBtn.focus(), 50);
}

if (!document.getElementById('custom-alert-styles')) {
  const style = document.createElement('style');
  style.id = 'custom-alert-styles';
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `;
  document.head.appendChild(style);
}

window.alert = function(message) {
  showAlert(message, 'info');
};

(() => {
  const targetPages = [
    'checkownerwindow', 'representativewindow', 'ownerwindow', 
    'boilerwindow', 'violationwindow', 'violationmain', 
    'violationform', 'main.html', 'metervaluewindow'
  ];
  const path = window.location.pathname.toLowerCase();
  const isTarget = targetPages.some(p => path.includes(p));
  if (!isTarget) return;
  if (!document.getElementById('global-info-header-styles')) {
    const style = document.createElement('style');
    style.id = 'global-info-header-styles';
    style.textContent = `
      .global-info-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: #e7e6e6;
        border-bottom: 1px solid #cccccc;
        padding: 8px 12px;
        font-size: 14px;
        line-height: 1.6;
        color: #000000;
        z-index: 9999;
        box-sizing: border-box;
        word-break: break-word;
      }
      .global-info-header div {
        margin-bottom: 2px;
      }
      .global-info-header div:last-child { margin-bottom: 0; }
      .global-info-header strong {
        color: #000000;
      }
      body {
        padding-top: 110px !important;
      }
    `;
    document.head.appendChild(style);
  }
  const headerDiv = document.createElement('div');
  headerDiv.id = 'global-info-header';
  headerDiv.className = 'global-info-header';
  headerDiv.style.display = 'none';
  headerDiv.innerHTML = `
    <div><strong>Адрес:</strong> <span id="info-address">-</span></div>
    <div><strong>№ счётчика:</strong> <span id="info-meter-num">-</span></div>
    <div><strong>Тип услуги:</strong> <span id="info-service">-</span></div>
    <div><strong>Место установки:</strong> <span id="info-location">-</span></div>
  `;
  function insertHeader() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return false;
    const pageHeader = appContainer.querySelector('.page-header');
    const h1 = appContainer.querySelector('h1');
    const formContainer = appContainer.querySelector('.form-container');
    if (pageHeader) {
      pageHeader.parentNode.insertBefore(headerDiv, pageHeader);
      return true;
    } else if (h1) {
      h1.parentNode.insertBefore(headerDiv, h1);
      return true;
    } else if (formContainer) {
      formContainer.parentNode.insertBefore(headerDiv, formContainer);
      return true;
    } else {
      appContainer.insertBefore(headerDiv, appContainer.firstChild);
      return true;
    }
  }
  function updateGlobalInfoHeader() {
    const container = document.getElementById('global-info-header');
    if (!container) return;      
    let address = "-";
    let meterNum = "-";
    let service = "-";
    let location = "-";
    let hasData = false;
    try {
      const addrData = JSON.parse(sessionStorage.getItem('userAddress') || '{}');
      if (addrData.street || addrData.house) {
        const street = addrData.street || '';
        const house = addrData.house ? `д. ${addrData.house}` : '';
        const apparts = (addrData.apparts && addrData.apparts !== '-1' && addrData.apparts !== '') ? `кв. ${addrData.apparts}` : '';
        address = [street, house, apparts].filter(Boolean).join(', ');
        hasData = true;
      }
    } catch(e) {}
    let currentMeterNum = null;
    let currentMeterId = null;
    try {
      const active = JSON.parse(sessionStorage.getItem('activeMeter') || 'null');
      if (active) {
        currentMeterId = active.id;
        currentMeterNum = active.meterNum;
      }
    } catch(e) {}
    if (!currentMeterNum) {
      try {
        const selected = JSON.parse(sessionStorage.getItem('selectedMeter') || 'null');
        if (selected) {
          currentMeterId = selected.id;
          currentMeterNum = selected.meterNum;
        }
      } catch(e) {}
    }
    if (!currentMeterNum) {
      try {
        const mNum = JSON.parse(sessionStorage.getItem('meternum') || '{}');
        if (mNum.meterNum) {
          currentMeterNum = mNum.meterNum;
        }
      } catch(e) {}
    }
    if (currentMeterNum) {
      meterNum = currentMeterNum;
      hasData = true;
      try {
        const allMeters = JSON.parse(sessionStorage.getItem('allMeters') || '[]');
        let foundInAll = null;        
        if (currentMeterId) {
          foundInAll = allMeters.find(m => String(m.id) === String(currentMeterId));
        }
        if (!foundInAll && currentMeterNum) {
          foundInAll = allMeters.find(m => String(m.meterNum) === String(currentMeterNum));
        }       
        if (foundInAll) {
          service = foundInAll.groupName || service;
          location = foundInAll.name || location;
        }
      } catch(e) {}
    }
    if (hasData) {
      document.getElementById('info-address').textContent = address;
      document.getElementById('info-meter-num').textContent = meterNum;
      document.getElementById('info-service').textContent = service;
      document.getElementById('info-location').textContent = location;
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  }
  window.updateGlobalInfoHeader = updateGlobalInfoHeader;
  const relevantKeys = ['userAddress', 'activeMeter', 'selectedMeter', 'allMeters', 'meternum'];
  const originalSetItem = sessionStorage.setItem;
  sessionStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (relevantKeys.includes(key)) {
      setTimeout(updateGlobalInfoHeader, 0);
    }
  };
  const originalRemoveItem = sessionStorage.removeItem;
  sessionStorage.removeItem = function(key) {
    originalRemoveItem.apply(this, arguments);
    if (relevantKeys.includes(key)) {
      setTimeout(updateGlobalInfoHeader, 0);
    }
  };
  const originalClear = sessionStorage.clear;
  sessionStorage.clear = function() {
    originalClear.apply(this, arguments);
    setTimeout(updateGlobalInfoHeader, 0);
  };
  function tryInsertWithRetry(attempts = 0) {
    if (attempts > 20) return;
    if (insertHeader()) {
      updateGlobalInfoHeader();
    } else {
      setTimeout(() => tryInsertWithRetry(attempts + 1), 100);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tryInsertWithRetry());
  } else {
    tryInsertWithRetry();
  }
  window.addEventListener('storage', (e) => {
    if (relevantKeys.includes(e.key)) {
      updateGlobalInfoHeader();
    }
  });
})();
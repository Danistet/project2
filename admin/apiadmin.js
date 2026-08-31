const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : (window.location.protocol.startsWith('http') ? window.location.origin : 'http://10.151.16.1:3000');

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
    console.error(`API request failed (${endpoint}):`, error);
    throw error;
  }
}

async function getMetersByLicschet(g_licschet) {
  return await apiRequest('/meters-by-licschet', { g_licschet });
}

async function getMetersByBuilding(buildingId) {
  return await apiRequest('/meters-by-building', { buildingId });
}

async function getControllerAddresses(controllerId) {
  return await apiRequest('/controller-addresses', { controllerId });
}

async function updateVerifyDate(meterId, verifyDate) {
  return await apiRequest('/update-verify-date', { meterId, verifyDate });
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
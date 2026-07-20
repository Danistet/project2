const DB_NAME = 'MeterOfflineStorage';
const STORE_NAME = 'pendingReadings';
const DB_VERSION = 2;

function openLocalDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (db.objectStoreNames.contains('pendiReadings')) {
        db.deleteObjectStore('pendiReadings');
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function saveReadingLocally(readingData) {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(readingData);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getPendingReadings() {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deletePendingReading(id) {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function generateFileName(meterNum, originalname) {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = originalname.split('.').pop() || 'jpg';
  return `METER_${meterNum}_${dateStr}_${randomStr}.${ext}`;
}

function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: mimeType });
}

const { createApp, ref, watch } = Vue;
createApp({
  setup() {
    const password = ref('');
    const response = ref('');
    const error = ref('');
    const meternum = ref('');
    const mountdate = ref('');
    const verifydate = ref('');
    const towns = ref([]);
    const streets = ref([]);
    const buildings = ref([]);
    const currentBuildingLicschet = ref(null);
    const apparts = ref([]);
    const selectedTownId = ref(null);
    const selectedStreetId = ref(null);
    const selectedBuildingId = ref(null);
    const selectedAppartId = ref(null);
    const houseInput = ref('');
    const townSearch = ref('');
    const streetSearch = ref('');
    const houseSearch = ref('');
    const appartsSearch = ref('');
    const showApparts = ref(true); 
    const PH = ref('');
    const PHData = ref('');
    const meters = ref([]);
    const showMeterSelect = ref(false);
    const selectedMeter = ref(null);        
    const isLoading = ref(false);    
    const { onMounted } = Vue;

    watch(townSearch, (newVal) => {
      if (!newVal || newVal.trim() === '') {
        streetSearch.value = '';
        houseSearch.value = '';
        selectedStreetId.value = null;
        selectedBuildingId.value = null;
        streets.value = [];
        buildings.value = [];
      }
    });

    watch(streetSearch, (newVal) => {
      if (!newVal || newVal.trim() === '') {
        houseSearch.value = '';
        selectedBuildingId.value = null;
        buildings.value = [];
      }
    });

    watch(houseSearch, (newVal) => {
      if (!newVal || newVal.trim() === '') {
        appartsSearch.value = '';
        selectedAppartId.value = null;
        apparts.value = [];
      }
    });

    watch(showApparts, (newVal) => {
      if (!newVal) {
        appartsSearch.value = '';
        selectedAppartId.value = null;
        sessionStorage.removeItem('licschet');
        if (selectedBuildingId.value) {
          loadMeterByBuilding(selectedBuildingId.value);
        }
      } else {
        setTimeout(() => {
          const input = document.getElementById('appartsInput');
          if (input) input.focus();
        }, 100);
      }
    });

    const formatWithThousands = (value) => {
      if (!value && value !== 0) return '';
      const str = String(value).trim();
      if (!str) return '';
      if (/[,\.]\d+/.test(str)) return str.replace('.', ',');
      if (/^\d+$/.test(str)) return `${str},000`;
      return str.replace('.', ',');
    };

    const NewPH = async () => {
      try {
        const inputEl = document.getElementById('newPH');
        const rawValue = inputEl?.value?.trim() || '';            
        if (!rawValue) { alert("Введите показания"); return; }              
        const formatted = formatWithThousands(rawValue);
        const numericValue = parseFloat(rawValue.replace(',', '.'));
        if (isNaN(numericValue)) { alert('Некорректное число'); return; }                 
        const meterData = JSON.parse(sessionStorage.getItem('activeMeter') || sessionStorage.getItem('meternum') || '{}');
        const meter_id = meterData.meterNum;            
        if (!meter_id) { alert('Не найден серийный номер счётчика'); return; }                
        const fileInput = document.getElementById('fileInput');
        const file = fileInput?.files?.[0];
        const addressData = JSON.parse(sessionStorage.getItem('userAddress') || '{}');
        const licschet = addressData.g_licschet || meterData.licschet || '';                        
        let fileDataForStorage = null;
        let fileNameForServer = 'no_file.jpg';
        let fileType = 'image/jpeg';        
        if (file) {
          fileNameForServer = generateFileName(meter_id, file.name);
          fileType = file.type;                    
          fileDataForStorage = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        }
        const payload = {
          ph: numericValue, meter_id, licschet,
          abonent_name: addressData.town || '', description: 'NARUSHENIE',
          fileName: fileNameForServer, fileType, fileBase64: fileDataForStorage,
          createdate: new Date().toISOString().replace('T', ' ').slice(0, 19)
        };        
        await saveReadingLocally(payload);        
        if (navigator.onLine) {          
          const formData = new FormData();
          formData.append('ph', payload.ph); formData.append('meter_id', payload.meter_id);
          formData.append('licschet', payload.licschet); formData.append('abonent_name', payload.abonent_name);
          formData.append('description', payload.description);          
          if (payload.fileBase64) {
            const blob = base64ToBlob(payload.fileBase64, payload.fileType);
            formData.append('file', blob, payload.fileName);
          }
          const response = await fetch('http://localhost:3000/PH', { method: 'POST', body: formData });                  
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || `HTTP error, status: ${response.status}`);                  
          alert(result.message || 'Показания и фото успешно переданы на сервер!');
        } else {          
          alert('Интернет отсутствует. Показания и фото СОХРАНЕНЫ ВНУТРИ ПРИЛОЖЕНИЯ.');
        }        
        const phElement = document.getElementById('PH');
        if (phElement) phElement.textContent = formatted;
        sessionStorage.setItem('ph', JSON.stringify({ PH: formatted }));                        
        if (fileInput) {
          fileInput.value = ''; fileInput.classList.remove('file-selected');
          document.getElementById('previewContainer').innerHTML = '';
        }                     
        const violationsForm = document.getElementById('violationsForm');
        if (violationsForm) {
          violationsForm.style.display = 'none';
          const appartsCheck = document.getElementById('appartscheck');
          if (appartsCheck) appartsCheck.checked = false;
          document.getElementById('violation1').value = "";
          document.getElementById('violation2').value = "";
          document.getElementById('violation3').value = "";
        }        
        inputEl.value = '';
      } catch (err) {
        console.error('Error:', err);
        alert('Ошибка: ' + (err.message || 'Неизвестная ошибка') + '. Данные сохранены локально.');
      }
    };

    const saveAddressAndContinue = async () => {
      if (!townSearch.value?.trim() || !selectedTownId.value) {
        alert("Выберите город из списка"); document.getElementById('townInput')?.focus(); return;
      }
      if (!streetSearch.value?.trim() || !selectedStreetId.value) {
        alert("Выберите улицу из списка"); document.getElementById('streetInput')?.focus(); return;
      }     
      let houseValue = houseInput.value?.trim();
      if (!houseValue) {
        alert("Введите номер дома");
        const input = document.getElementById('houseInput');
        if (input) { input.focus(); input.select(); } return;
      }
      if (!selectedBuildingId.value) {
        alert("Несуществующий номер дома");
        const input = document.getElementById('houseInput');
        if (input) { input.focus(); input.select(); } return;
      }    
      let appartsValue = null;
      let appartsIdValue = null;
      if (showApparts.value) {
        if (!appartsSearch.value?.trim()) {
          alert("Введите номер квартиры");
          const input = document.getElementById('appartsInput');
          if (input) { input.focus(); input.select(); } return;
        }
        if (!selectedAppartId.value) {
          alert("Несуществующий номер квартиры");
          const input = document.getElementById('appartsInput');
          if (input) { input.focus(); input.select(); } return;
        }
        const selectedAppart = apparts.value.find(a => String(a.id) === String(selectedAppartId.value));
        appartsValue = selectedAppart?.rawHouse || appartsSearch.value?.trim();
        appartsIdValue = selectedAppartId.value;
      } else {
        appartsValue = "-1";
        appartsIdValue = null;
      }            
      isLoading.value = true;
      let allMeters = [];
      try {
        if (showApparts.value && selectedAppartId.value) {
          const selectedAppart = apparts.value.find(a => String(a.id) === String(selectedAppartId.value));
          if (selectedAppart?.g_licschet) allMeters = await getMetersByLicschet(selectedAppart.g_licschet);
        } else if (currentBuildingLicschet.value && !showApparts.value) {
          allMeters = await getMetersByLicschet(currentBuildingLicschet.value);
        } else if (selectedBuildingId.value) {
          allMeters = await getMetersByBuilding(selectedBuildingId.value);
          if (!showApparts.value) {
            allMeters = allMeters.filter(m => !m.apparts || String(m.apparts).trim() === '');
          }
        }      
      } catch (err) {
        console.warn('Failed to load meters list:', err);
        allMeters = [];
      } finally {        
        isLoading.value = false;
      }
      if (!allMeters || allMeters.length === 0) {
        clearMeterDataToSession();
        alert(!showApparts.value ? "Для выбранного дома не найдено счётчиков." : "Для выбранной квартиры не найдено счётчиков.");
        return; 
      }
      saveAllMeters(allMeters);
      const g_licschet = allMeters[0]?.licschet || null;
      if (allMeters.length === 1) {
        saveMeterDataToSession(allMeters[0]);
      } else {
        clearMeterDataToSession();
      }
      const addressData = {
        town: townSearch.value || '', townId: selectedTownId.value,
        street: streetSearch.value || '', streetId: selectedStreetId.value,
        house: houseInput.value || '', apparts: appartsValue, appartsId: appartsIdValue, 
        g_licschet, buildingId: selectedBuildingId.value
      };
      sessionStorage.setItem('userAddress', JSON.stringify(addressData));
      window.location.href = 'checkownerwindow.html';
    };

    const loadTowns = async () => {
      try {
        const result = await apiRequest('/cities');
        towns.value = result;
      } catch (err) { console.error('Failed to load towns:', err); }
    };

    const loadStreets = async (townId) => {
      isLoading.value = true;
      try {
        const response = await fetch(`http://localhost:3000/streets?townId=${townId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }
        });
        streets.value = await response.json();
      } catch (err) { console.error('Failed to load streets:', err); }
      finally { isLoading.value = false; }
    };

    const loadBuildings = async (streetId) => {
      if (!streetId) { buildings.value = []; return; }
      isLoading.value = true;
      try {
        const result = await apiRequest(`/buildings?streetId=${streetId}`);
        buildings.value = result;
      } catch (err) { console.error('Failed to load buildings:', err); }
      finally { isLoading.value = false; }
    };

    const loadApparts = async (buildingId) => {
      if (!buildingId) { 
        apparts.value = []; currentBuildingLicschet.value = null; return; 
      }
      isLoading.value = true;
      try {
        const result = await apiRequest(`/apparts?buildingId=${buildingId}`);
        const emptyAppart = result.find(appr => (!appr.house || appr.house.trim() === '') && appr.g_licschet);
        currentBuildingLicschet.value = emptyAppart?.g_licschet || null;
        apparts.value = result
          .filter(appr => appr.house && appr.house.trim() !== '') 
          .map(appr => {
            const baseName = appr.house;
            const uniqueName = appr.g_licschet ? `${baseName} (Л/С: ${appr.g_licschet})` : baseName;
            return { ...appr, displayHouse: uniqueName, rawHouse: baseName };
          });
      } catch (err) {
        console.error('Failed to load apartments:', err);
        currentBuildingLicschet.value = null; apparts.value = [];
      } finally { isLoading.value = false; }
    };

    const onTownInput = async (e) => {
      const val = e.target.value;
      const option = [...document.querySelectorAll('#resultsTown option')].find(o => o.value === val);
      if (option) selectedTownId.value = option.dataset.id;
    };

    const onTownChange = (e) => {
      const val = e.target.value;
      const option = [...document.querySelectorAll('#resultsTown option')].find(o => o.value === val);
      selectedTownId.value = option?.dataset.id || null;
      if (selectedTownId.value) loadStreets(selectedTownId.value);
      else { streets.value = []; buildings.value = []; }
    };

    const onStreetInput = (e) => {
      const val = e.target.value;
      const option = [...document.querySelectorAll('#resultsStreet option')].find(o => o.value === val);
      if (option) selectedStreetId.value = option.dataset.id;
    };

    const onStreetChange = (e) => {
      const val = e.target.value;
      const option = [...document.querySelectorAll('#resultsStreet option')].find(o => o.value === val);
      selectedStreetId.value = option?.dataset.id || null;
      if (selectedStreetId.value) loadBuildings(selectedStreetId.value);
      else buildings.value = [];
    };

    const onHouseInput = (e) => {
      houseInput.value = e.target.value;
      const option = [...document.querySelectorAll('#resultsHome option')].find(o => o.value === e.target.value);
      if (option) selectedBuildingId.value = option.dataset.id;
    };

    const onHouseChange = (e) => {
      const val = e.target.value;
      const option = [...document.querySelectorAll('#resultsHome option')].find(o => o.value === val);
      selectedBuildingId.value = option?.dataset.id || null;
      houseInput.value = val;
      if (selectedBuildingId.value) loadApparts(selectedBuildingId.value);
      else apparts.value = [];
    };

    const getSelectedOptionData = (e, dataListId) => {
      const val = e.target.value;
      if (!val) return null;
      const options = document.querySelectorAll(`#${dataListId} option`);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if(opt.value === val || opt.dataset.id === String(val)) {
          return { id: opt.dataset.id, licschet: opt.dataset.licschet, text: opt.text || opt.value };
        }
      }
      return null;
    };

    const onAppartsInput = (e) => {
      const data = getSelectedOptionData(e, 'resultsApparts');
      selectedAppartId.value = data ? data.id : null;
    };

    const clearMeterDataToSession = () => {
      sessionStorage.setItem('meternum', JSON.stringify({meterNum: null }));
      sessionStorage.setItem('mountdate', JSON.stringify({mountDate: null }));
      sessionStorage.setItem('verifydate', JSON.stringify({verifyDate: null })); 
      sessionStorage.removeItem('licschet');
    };

    const saveMeterDataToSession = (data) => { 
      if (!data?.found) { clearMeterDataToSession(); return; } 
      sessionStorage.setItem('meternum', JSON.stringify({ meterNum: data.meterNum || null }));
      sessionStorage.setItem('mountdate', JSON.stringify({ mountDate: data.mountDate || null }));
      sessionStorage.setItem('verifydate', JSON.stringify({ verifyDate: data.verifyDate || null }));        
      if (data.licschet && data.licschet.trim() !== '') {
        sessionStorage.setItem('licschet', JSON.stringify({ g_licschet: data.licschet }));
      } else { sessionStorage.removeItem('licschet'); }
    };

    const loadMeterByBuilding = async (buildingId) => {
      if (!buildingId) { clearMeterDataToSession(); return; }
      try {
        const meterData = await apiRequest('/meter-by-building', { buildingId });
        saveMeterDataToSession(meterData);
      } catch (err) { console.error("error building lookup", err); clearMeterDataToSession(); }
    };

    const loadMetersByBuilding = async (buildingId) => {
      if (!buildingId) { meters.value = []; clearMeterDataToSession(); return; }
      try {
        const meterList = await apiRequest('/meters-by-building', {buildingId});
        meters.value = meterList;
        if (meterList.length === 1) selectMeter(meterList[0]);
        else if (meterList.length > 1) showMeterSelect.value = true;
        else { clearMeterDataToSession(); showMeterSelect.value = false; }
      } catch (err) { console.error("error:" , err); meters.value = []; clearMeterDataToSession(); showMeterSelect.value = false; }
    };

    const loadMetersByLicschet = async (g_licschet) => {
      if (!g_licschet?.trim()) { meters.value = []; clearMeterDataToSession(); return; }
      try {
        const meterList = await apiRequest('/meters-by-licschet', { g_licschet });
        meters.value = meterList;      
        if (meterList.length === 1) selectMeter(meterList[0]);
        else if (meterList.length > 1) showMeterSelect.value = true;
        else { clearMeterDataToSession(); showMeterSelect.value = false; }
      } catch (err) { console.error("error:", err); meters.value = []; clearMeterDataToSession(); showMeterSelect.value = false; }
    };

    const selectMeter = (meter) => {
      selectedMeter.value = meter;
      saveSelectedMeter(meter);
      saveMeterDataToSession(meter);
      showMeterSelect.value = false;
      const addressData = JSON.parse(sessionStorage.getItem('userAddress') || '{}');
      addressData.selectedMeterId = meter.id;
      addressData.selectMeterNum = meter.meterNum;
      sessionStorage.setItem('userAddress', JSON.stringify(addressData));
    };

    const onAppartsChange = async (e) => {
      const data = getSelectedOptionData(e, 'resultsApparts');      
      selectedAppartId.value = data?.id || null;
      appartsSearch.value = data?.text || e.target.value; 
      showMeterSelect.value = false;
      selectedMeter.value = null;
      const g_licschet = data?.licschet?.trim();
      if (selectedAppartId.value && g_licschet) await loadMetersByLicschet(g_licschet);
      else if (!selectedAppartId.value && selectedBuildingId.value && currentBuildingLicschet.value) await loadMetersByLicschet(currentBuildingLicschet.value);
      else if (!selectedAppartId.value && selectedBuildingId.value) await loadMetersByBuilding(selectedBuildingId.value);
      else { meters.value = []; clearMeterDataToSession(); showMeterSelect.value = false; }
    };

    const login = async (e) => {
      error.value = ''; response.value = '';
      const passwordValue = password.value.trim();
      if (!passwordValue) { error.value = 'Пароль обязателен'; return; }
      if (passwordValue.length < 8) { error.value = 'Пароль минимум 8 символов'; return; }   
      try {
        const result = await apiRequest('/auth', { userpswd: password.value, meternum: meternum.value });
        sessionStorage.setItem('authData', JSON.stringify({ token: result.token, authDate: result.authDate }));
        sessionStorage.setItem('meternum', JSON.stringify({ meterNum: result.meterNum }));
        sessionStorage.setItem('mountdate', JSON.stringify({ mountDate: result.mountDate }));
        sessionStorage.setItem('verifydate', JSON.stringify({ verifyDate: result.verifyDate }));
        window.location.href = 'ActWindow.html'; 
      } catch (err) { error.value = `Ошибка: ${err.message}`; console.error(err); }
    };

    onMounted(() => { loadTowns(); });

    return { 
      password, response, error, meternum, mountdate, verifydate,
      towns, streets, buildings, apparts, PHData, PH,
      selectedTownId, selectedStreetId, selectedBuildingId, selectedAppartId, 
      houseInput, townSearch, streetSearch, houseSearch, appartsSearch, showApparts,
      currentBuildingLicschet, meters, showMeterSelect, selectedMeter,
      selectMeter, loadMetersByBuilding, loadMetersByLicschet,
      NewPH, onTownInput, onTownChange, onStreetInput, onStreetChange,
      onHouseInput, onHouseChange, onAppartsInput, onAppartsChange,
      login, saveAddressAndContinue,
      isLoading
    };
  }
}).mount('#app');
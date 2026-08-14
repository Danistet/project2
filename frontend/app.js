const DB_NAME = 'MeterOfflineStorage';
const STORE_NAME = 'pendingReadings';
const CONTROLLER_PACKAGE_STORE = 'controllerPackages';
const DB_VERSION = 3;

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
      if (!db.objectStoreNames.contains(CONTROLLER_PACKAGE_STORE)) {
        db.createObjectStore(CONTROLLER_PACKAGE_STORE, { keyPath: 'controllerId' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function saveControllerPackage(controllerId, packageData) {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONTROLLER_PACKAGE_STORE], 'readwrite');
    const store = transaction.objectStore(CONTROLLER_PACKAGE_STORE);
    const request = store.put({
      controllerId,
      savedAt: Date.now(),
      ...packageData
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getControllerPackage(controllerId) {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONTROLLER_PACKAGE_STORE], 'readonly');
    const store = transaction.objectStore(CONTROLLER_PACKAGE_STORE);
    const request = store.get(Number(controllerId));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function downloadAndCacheControllerData(controllerId) {
  const data = await apiRequest('/controller-offline-package', { controllerId });
  await saveControllerPackage(controllerId, data);
  return data;
}

async function ensureControllerPackage(controllerId, maxAgeMs = 2400000) {
  if (!controllerId) return null;
  const existing = await getControllerPackage(controllerId);
  if (
    existing &&
    existing.savedAt &&
    Date.now() - existing.savedAt < maxAgeMs
  ) {
    return existing;
  }
  if (!navigator.onLine) {
    return existing;
  }
  try {
    return await downloadAndCacheControllerData(controllerId);
  } catch (err) {
    console.warn('Не удалось обновить офлайн-пакет контролёра:', err);
    return existing;
  }
}

async function saveReadingLocally(readingData) {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(readingData);
    request.onsuccess = () => resolve(request.result); 
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

async function clearControllerPackage() {
  try {
    const db = await openLocalDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONTROLLER_PACKAGE_STORE], 'readwrite');
      const store = transaction.objectStore(CONTROLLER_PACKAGE_STORE);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Ошибка очистки кэша контролёра:', err);
  }
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

const { createApp, ref, watch, computed } = Vue;

createApp({
  setup() {
    const password = ref(localStorage.getItem('lastPassword') || '');
    const response = ref('');
    const error = ref('');
    const meternum = ref('');
    const mountdate = ref('');
    const verifydate = ref('');
    const streets = ref([]);
    const buildings = ref([]);
    const addressCatalog = ref([]);
    const currentBuildingLicschet = ref(null);
    const apparts = ref([]);
    const selectedTownId = ref(2);
    const selectedStreetId = ref(null);
    const selectedBuildingId = ref(null);
    const selectedAppartId = ref(null);
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
    const showContinue = ref(false);
    const showOverlay = ref(false);
    const actNo = ref('');
    const actDate = ref('');   
    const { onMounted } = Vue;

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
        isAppartsOpen.value = false;        
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
        if (!rawValue) { showAlert("Введите показания", 'error'); return; }              
        const formatted = formatWithThousands(rawValue);
        const numericValue = parseFloat(rawValue.replace(',', '.'));
        if (isNaN(numericValue)) { showAlert("Некорректное число", 'error'); return; }                 
        const meterData = JSON.parse(sessionStorage.getItem('activeMeter') || sessionStorage.getItem('meternum') || '{}');
        const meter_id = meterData.meterNum;            
        if (!meter_id) { showAlert("Не найден серийный номер счётчика", 'error'); return; }                
        const fileInput = document.getElementById('fileInput');
        const files = fileInput?.files;
        if (files && files.length > 5) {    
          showAlert('Можно выбрать не более 5 файлов.', 'error');
          fileInput.value = '';
          return;
        }
        const addressData = JSON.parse(sessionStorage.getItem('userAddress') || '{}');
        const licschet = addressData.g_licschet || meterData.licschet || '';    
        const currentAct = JSON.parse(sessionStorage.getItem('currentAct') || '{}');
        const actId = currentAct?.actId || null;                    
        let filesDataForStorage = [];
        let fileNamesForServer = [];
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = generateFileName(meter_id, file.name);
            fileNamesForServer.push(fileName);
            const fileData = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve({
                fileName,
                fileType: file.type,
                fileBase64: reader.result
              });
              reader.readAsDataURL(file);
            });
            filesDataForStorage.push(fileData);
          }
        }
        const payload = {
          ph: numericValue,
          meter_id,
          licschet,
          abonent_name: addressData.town || '',
          description: 'file',
          fileNames: fileNamesForServer,
          filesData: filesDataForStorage,
          createdate: new Date().toISOString().replace('T', ' ').slice(0, 19),
          isViolation: false,
          actId
        };         
        const recordId = await saveReadingLocally(payload);         
        if (navigator.onLine) {          
          const formData = new FormData();
          formData.append('ph', payload.ph); 
          formData.append('meter_id', payload.meter_id);
          formData.append('licschet', payload.licschet); 
          formData.append('abonent_name', payload.abonent_name);
          formData.append('description', payload.description);   
          if (payload.actId) {
            formData.append('act_id', payload.actId);
          }       
          if (filesDataForStorage.length > 0) {
            filesDataForStorage.forEach(f => {
              const blob = base64ToBlob(f.fileBase64, f.fileType);
              formData.append('files', blob, f.fileName);
            });
          }
          const response = await fetch(`${API_BASE}/PH`, {
            method: 'POST',
            body: formData
          });                 
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || `HTTP error, status: ${response.status}`);                  
          if (recordId) {
            await deletePendingReading(recordId);
          }
          showAlert(result.message || 'Показания и фото успешно переданы на сервер!', 'success');
        } else {          
          showAlert('Интернет отсутствует. Показания сохранены локально.', 'info');          
        }       
        const phElement = document.getElementById('PH');
        if (phElement) phElement.textContent = formatted;
        sessionStorage.setItem('ph', JSON.stringify({ PH: formatted }));                        
        if (fileInput) {
          fileInput.value = ''; 
          fileInput.classList.remove('file-selected');
          document.getElementById('previewContainer').innerHTML = '';
        }                     
        const violationsForm = document.getElementById('violationsForm');
        if (violationsForm) {          
          const appartsCheck = document.getElementById('appartscheck');
          if (appartsCheck) appartsCheck.checked = false;
          document.getElementById('violation1').value = "";
          document.getElementById('violation2').value = "";
          document.getElementById('violation3').value = "";
        }        
        inputEl.value = '';
      } catch (err) {
        console.error('Error:', err);
        showAlert('Ошибка: ' + (err.message || 'Неизвестная ошибка'), 'error' + '. Данные сохранены локально.');
      }
    };

    const saveAddressAndContinue = async () => {
      const authData = JSON.parse(sessionStorage.getItem('authData') || '{}');
      const now = Date.now();
      const EXPIRY_MS = 24000000;
      if (!authData || !authData.token || (now - authData.authDate > EXPIRY_MS)) {
        error.value = 'Истёк срок сессии. Пожалуйста, войдите снова.';
        showContinue.value = true;
        return;
      }
      if (!streetSearch.value?.trim() || !selectedStreetId.value) {
        showAlert('Выберите улицу из списка.', 'info'); 
        document.getElementById('streetInput')?.focus(); return;        
      }
      let houseValue = houseSearch.value?.trim();
      if (!houseValue) {
        showAlert('Введите номер дома.', 'info');
        const input = document.getElementById('houseInput');
        if (input) { input.focus(); input.select(); } return;
      }
      if (!selectedBuildingId.value) {
        showAlert('Несуществующий номер дома', 'error');
        const input = document.getElementById('houseInput');
        if (input) { input.focus(); input.select(); } return;
      }
      let appartsValue = null;
      let appartsIdValue = null;
      if (showApparts.value) {
        if (!appartsSearch.value?.trim()) {
          showAlert('Введите номер квартиры', 'info');
          const input = document.getElementById('appartsInput');
          if (input) { input.focus(); input.select(); } return;
        }
        if (!selectedAppartId.value) {
          showAlert('Несуществующий номер квартиры', 'error');
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
      try {
        let actResult;
        const isOffline = !navigator.onLine;
          if (isOffline) {
            const d = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const formatDate = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
            const formatDateTime = (dt) => `${formatDate(dt)} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;              
            actResult = {
              actId: null,
              actNo: 'Офлайн',
              actDate: formatDateTime(d),
              actBdate: formatDate(d),
              actEdate: formatDate(d)
            };
          } else {
            actResult = await apiRequest('/generate-act', {});
            await apiRequest('/update-act-building', {
              actId: actResult.actId,
              buildingId: selectedBuildingId.value
            });
          }
          actNo.value = actResult.actNo;
          actDate.value = actResult.actDate;          
          sessionStorage.setItem('currentAct', JSON.stringify({
            actId: actResult.actId,
            actNo: actResult.actNo,
            actDate: actResult.actDate,
            actBdate: actResult.actBdate,
            actEdate: actResult.actEdate,
            buildingId: selectedBuildingId.value
          }));
          let allMeters = [];          
          try {
            if (showApparts.value && selectedAppartId.value) {
              const selectedAppart = apparts.value.find(a => String(a.id) === String(selectedAppartId.value));
              if (selectedAppart?.g_licschet) {
                allMeters = isOffline 
                ? await getOfflineMetersByLicschet(selectedAppart.g_licschet) 
                : await getMetersByLicschet(selectedAppart.g_licschet);
              }
            } else if (currentBuildingLicschet.value && !showApparts.value) {
              allMeters = isOffline 
              ? await getOfflineMetersByLicschet(currentBuildingLicschet.value) 
              : await getMetersByLicschet(currentBuildingLicschet.value);
            } else if (selectedBuildingId.value) {
              allMeters = isOffline 
              ? await getOfflineMetersByBuilding(selectedBuildingId.value) 
              : await getMetersByBuilding(selectedBuildingId.value);                      
              if (!showApparts.value) {
                allMeters = allMeters.filter(m => !m.apparts || String(m.apparts).trim() === '');
              }
            }
          } catch (meterErr) {
            console.warn('Ошибка загрузки счетчиков, попытка взять из офлайн-кэша:', meterErr);
            if (showApparts.value && selectedAppartId.value) {
              const selectedAppart = apparts.value.find(a => String(a.id) === String(selectedAppartId.value));
              if (selectedAppart?.g_licschet) allMeters = await getOfflineMetersByLicschet(selectedAppart.g_licschet);
            } else if (currentBuildingLicschet.value && !showApparts.value) {
              allMeters = await getOfflineMetersByLicschet(currentBuildingLicschet.value);
            } else if (selectedBuildingId.value) {
              allMeters = await getOfflineMetersByBuilding(selectedBuildingId.value);
              if (!showApparts.value) {
                allMeters = allMeters.filter(m => !m.apparts || String(m.apparts).trim() === '');
              }
            }
          }
          if (!allMeters || allMeters.length === 0) {
            clearMeterDataToSession();
            showAlert(!showApparts.value ? "Для выбранного дома не найдено счётчиков." : "Для выбранной квартиры не найдено счётчиков.", 'error');
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
            town: 'Лянтор',
            townId: 2,
            street: streetSearch.value || '',
            streetId: selectedStreetId.value,
            house: houseSearch.value || '',
            apparts: appartsValue,
            appartsId: appartsIdValue,
            g_licschet,
            buildingId: selectedBuildingId.value
          };
          sessionStorage.setItem('userAddress', JSON.stringify(addressData));
          showOverlay.value = true;
      } catch (err) {
        console.error('Error during address save:', err);
        showAlert('Ошибка: ' + (err.message || 'Неизвестная ошибка'), 'error');
      } finally {
        isLoading.value = false;
      }
    };

    const continueFromOverlay = () => {
      showOverlay.value = false;
      window.location.href = 'checkownerwindow.html';
    };

    async function getOfflineControllerAddresses(controllerId) {
      if (typeof getControllerPackage !== 'function') return [];
      const pkg = await getControllerPackage(controllerId);
      if (!pkg || !Array.isArray(pkg.meters)) return [];
      const rows = [];
      pkg.meters.forEach(meter => {
        if (String(meter.CONTROLER_ID) !== String(controllerId)) return;
        const abonents = pkg.abonents?.find(
          a => String(a.G_LICSCHET) === String(meters.LS)
        );
        if (!abonent) return;
        const client = pkg.clients?.find(c => c.ID === abonents.CLIENT_ID);
        const building = pkg.buildings?.find(d => d.ID === abonents.BUILDINGS_ID);
        if (!building) return;
        const street = pkg.street?.find(s => s.ID === building.STREET_ID);
        if (!street) return;
        const letterPart = client?.NAME || 'ФИО не указано';
        const phonePart = client?.PHONE ? `, тел: ${client.PHONE}` : '';
        const streetName = `${street.STREET_TYPE || ''} ${street.STREET || ''}`.trim();
        const corpsPart = building.CORPS ? ` ${building.CORPS}` : '';
        const houseName = `${building.HOUSE || ''}${corpsPart}`.trim();
        rows.push({
          meterId: meter.ID,
          controllerId: meter.CONTROLER_ID,
          verifyDate: meter.VERIFY_DATE,
          buildingsId: building.ID,
          streetId: street.ID,
          streetName,
          houseName,
          displayText: `${appartsPart}, ${namePart}${phonePart}`
        });
      });
      return rows;
    }

    const loadStreets = async (townId = null) => {
      isLoading.value = true;
      try {
        const authData = JSON.parse(sessionStorage.getItem('authData') || '{}');
        const controllerId =
          sessionStorage.getItem('controllerId') || authData.controllerId;
        if (!controllerId) {
          streets.value = [];
          addressCatalog.value = [];
          return;
        }
        let data = [];
        if (!navigator.onLine) {
          data = await getOfflineControllerAddresses(controllerId);
        } else {
          try {
            data = await getControllerAddresses(controllerId);
          } catch (e) {
            console.warn('Ошибка сети, загрузка адресов из офлайн-кэша', e);
            data = await getOfflineControllerAddresses(controllerId);
          }
        }
        addressCatalog.value = Array.isArray(data) ? data : [];
        const streetMap = new Map();
        addressCatalog.value.forEach(addr => {
          if (!addr || addr.streetId === null || addr.streetId === undefined) return;
          if (!streetMap.has(addr.streetId)) {
            streetMap.set(addr.streetId, addr.streetName);
          }
        });
        streets.value = Array.from(streetMap, ([id, name]) => ({ id, name }))
          .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru'));
      } catch (err) {
        console.error('Failed to load streets:', err);
        streets.value = [];
        addressCatalog.value = [];
      } finally {
        isLoading.value = false;
      }
    };

    const loadBuildings = async (streetId) => {
      if (!streetId) {
        buildings.value = [];
        return;
      }
      isLoading.value = true;
      try {
        if (!addressCatalog.value.length) {
          await loadStreets(selectedTownId.value);
        }
        const buildingMap = new Map();
        addressCatalog.value
          .filter(a => String(a.streetId) === String(streetId))
          .forEach(a => {
            if (a.buildingsId === null || a.buildingsId === undefined) return;
            if (!buildingMap.has(a.buildingsId)) {
              buildingMap.set(a.buildingsId, a.houseName);
            }
          });
        buildings.value = Array.from(buildingMap, ([id, house]) => ({ id, house }))
          .sort((a, b) =>
            String(a.house).localeCompare(String(b.house), 'ru', { numeric: true })
          );
      } catch (err) {
        console.error('Failed to load buildings:', err);
        buildings.value = [];
      } finally {
        isLoading.value = false;
      }
    };

    const loadApparts = async (buildingId) => {
      if (!buildingId) {
        apparts.value = []; currentBuildingLicschet.value = null; return;
      }
      isLoading.value = true;
      try {
        const authData = JSON.parse(sessionStorage.getItem('authData') || '{}');
        const controllerId = sessionStorage.getItem('controllerId') || authData.controllerId;
        if (!navigator.onLine) {
          const pkg = controllerId ? await getControllerPackage(controllerId) : null;
          if (pkg && pkg.abonents) {
            const buildingAbonents = pkg.abonents.filter(a => a.BUILDINGS_ID == buildingId);                  
            const result = buildingAbonents.map(a => {
              const letterPart = a.LETTER ? ` ${a.LETTER}` : '';
              const house = a.APPARTS == null ? `${letterPart}`.trim() : `кв. ${a.APPARTS}${letterPart}`.trim();
              return { id: a.ID, house: house, g_licschet: a.G_LICSCHET };
            });                    
            const emptyAppart = result.find(appr => (!appr.house || appr.house.trim() === '') && appr.g_licschet);
            currentBuildingLicschet.value = emptyAppart?.g_licschet || null;                    
            apparts.value = result
            .filter(appr => appr.house && appr.house.trim() !== '')
            .map(appr => {
              const baseName = appr.house;
              const uniqueName = appr.g_licschet ? `${baseName} (Л/С: ${appr.g_licschet})` : baseName;
              return { ...appr, displayHouse: uniqueName, rawHouse: baseName };
            });
            return;
          }
        }
        const result = await apiRequest(`/apparts?buildingId=${buildingId}&controllerId=${controllerId}`);
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
        const authData = JSON.parse(sessionStorage.getItem('authData') || '{}');
        const controllerId = sessionStorage.getItem('controllerId') || authData.controllerId;
        const pkg = controllerId ? await getControllerPackage(controllerId) : null;
        if (pkg && pkg.abonents) {
          const buildingAbonents = pkg.abonents.filter(a => a.BUILDINGS_ID == buildingId);
          const result = buildingAbonents.map(a => {
            const letterPart = a.LETTER ? ` ${a.LETTER}` : '';
            const house = a.APPARTS == null ? `${letterPart}`.trim() : `кв. ${a.APPARTS}${letterPart}`.trim();
            return { id: a.ID, house: house, g_licschet: a.G_LICSCHET };
          });
          const emptyAppart = result.find(appr => (!appr.house || appr.house.trim() === '') && appr.g_licschet);
          currentBuildingLicschet.value = emptyAppart?.g_licschet || null;
          apparts.value = result
            .filter(appr => appr.house && appr.house.trim() !== '')
            .map(appr => {
              const baseName = appr.house;
              const uniqueName = appr.g_licschet ? `${baseName} (Л/С: ${appr.g_licschet})` : baseName;
              return { ...appr, displayHouse: uniqueName, rawHouse: baseName };
            });
        } else {
          currentBuildingLicschet.value = null; 
          apparts.value = [];
        }
      } finally { 
        isLoading.value = false; 
      }
    };

      const isStreetOpen = ref(false);
      const isHouseOpen = ref(false);
      const isAppartsOpen = ref(false);

      const filteredStreets = computed(() => {
        if (!streetSearch.value) return streets.value;
        const term = streetSearch.value.toLowerCase();
        return streets.value.filter(s => s.name.toLowerCase().includes(term));
      });

      const filteredBuildings = computed(() => {
        if (!houseSearch.value) return buildings.value;
        const term = houseSearch.value.toLowerCase();
        return buildings.value.filter(b => b.house.toLowerCase().includes(term));
      });

      const filteredApparts = computed(() => {
        if (!appartsSearch.value) return apparts.value;
        const term = appartsSearch.value.toLowerCase();
        return apparts.value.filter(a => (a.displayHouse || '').toLowerCase().includes(term));
      });

      const refreshMeters = async () => {
        showMeterSelect.value = false;
        selectedMeter.value = null;
        
        if (selectedAppartId.value && showApparts.value) {
          const appr = apparts.value.find(a => String(a.id) === String(selectedAppartId.value));
          if (appr?.g_licschet) {
            await loadMetersByLicschet(appr.g_licschet);
          }
        } else if (selectedBuildingId.value) {
          if (currentBuildingLicschet.value && !showApparts.value) {
            await loadMetersByLicschet(currentBuildingLicschet.value);
          } else {
            await loadMetersByBuilding(selectedBuildingId.value);
          }
        } else {
          meters.value = [];
          clearMeterDataToSession();
        }
      };

      const selectStreet = (street) => {
        streetSearch.value = street.name;
        selectedStreetId.value = street.id;
        isStreetOpen.value = false;
        loadBuildings(street.id);
      };

      const selectHouse = (bld) => {
        houseSearch.value = bld.house;
        selectedBuildingId.value = bld.id;
        isHouseOpen.value = false;
        loadApparts(bld.id);
      };

      const selectAppart = async (appr) => {
        appartsSearch.value = appr.displayHouse;
        selectedAppartId.value = appr.id;
        isAppartsOpen.value = false;
        await refreshMeters();
      };

      const closeStreet = () => {
        isStreetOpen.value = false;
        if (streetSearch.value) {
          const match = streets.value.find(s => s.name === streetSearch.value);
          if (!match) {
            selectedStreetId.value = null;
            houseSearch.value = '';
            selectedBuildingId.value = null;
            buildings.value = [];
            appartsSearch.value = '';
            selectedAppartId.value = null;
            apparts.value = [];
          }
        }
        refreshMeters();
      };

      const closeHouse = () => {
        isHouseOpen.value = false;
        if (houseSearch.value) {
          const match = buildings.value.find(b => b.house === houseSearch.value);
          if (!match) {
            selectedBuildingId.value = null;
            appartsSearch.value = '';
            selectedAppartId.value = null;
            apparts.value = [];
          }
        }
        refreshMeters();
      };

      const closeAppart = () => {
        isAppartsOpen.value = false;
        if (appartsSearch.value && showApparts.value) {
          const match = apparts.value.find(a => a.displayHouse === appartsSearch.value);
          if (!match) {
            selectedAppartId.value = null;
          }
        }
        refreshMeters();
      };

      const clearStreet = () => {
        streetSearch.value = '';
        closeStreet();
      };

      const clearHouse = () => {
        houseSearch.value = '';
        closeHouse();
      };

      const clearAppart = () => {
        appartsSearch.value = '';
        closeAppart();
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
        let meterData;
        if (!navigator.onLine) {
          const offlineMeters = await getOfflineMetersByBuilding(buildingId);
          meterData = offlineMeters.length > 0 ? { found: true, ...offlineMeters[0] } : { found: false };
        } else {
          meterData = await apiRequest('/meter-by-building', { buildingId });
        }
        saveMeterDataToSession(meterData);
      } catch (err) { 
        console.error("error building lookup", err); 
        try {
          const offlineMeters = await getOfflineMetersByBuilding(buildingId);
          const meterData = offlineMeters.length > 0 ? { found: true, ...offlineMeters[0] } : { found: false };
          saveMeterDataToSession(meterData);
        } catch(e) {
          clearMeterDataToSession(); 
        }
      }
    };

    const loadMetersByBuilding = async (buildingId) => {
      if (!buildingId) { meters.value = []; clearMeterDataToSession(); return; }
      try {
        let meterList;
        if (!navigator.onLine) {
          meterList = await getOfflineMetersByBuilding(buildingId);
        } else {
          meterList = await apiRequest('/meters-by-building', {buildingId});
        }
        meters.value = meterList;
        if (meterList.length === 1) selectMeter(meterList[0]);
        else if (meterList.length > 1) showMeterSelect.value = true;
        else { clearMeterDataToSession(); showMeterSelect.value = false; }
      } catch (err) { 
        console.error("error:" , err); 
        try {
          const offlineMeters = await getOfflineMetersByBuilding(buildingId);
          meters.value = offlineMeters;
          if (offlineMeters.length === 1) selectMeter(offlineMeters[0]);
          else if (offlineMeters.length > 1) showMeterSelect.value = true;
          else { clearMeterDataToSession(); showMeterSelect.value = false; }
        } catch (e) {
          meters.value = []; clearMeterDataToSession(); showMeterSelect.value = false; 
        }
      }
    };  

    const loadMetersByLicschet = async (g_licschet) => {
      if (!g_licschet?.trim()) {
        meters.value = [];
        clearMeterDataToSession();
        return;
      }
      try {
        if (!navigator.onLine) {
          const offlineMeters = await getOfflineMetersByLicschet(g_licschet.trim());
          meters.value = offlineMeters;
          if (offlineMeters.length === 1) {
            selectMeter(offlineMeters[0]);
          } else if (offlineMeters.length > 1) {
            showMeterSelect.value = true;
          } else {
            clearMeterDataToSession();
            showMeterSelect.value = false;
          }
          return;
        }
        const meterList = await apiRequest('/meters-by-licschet', { g_licschet });
        meters.value = meterList;
        if (meterList.length === 1) {
          selectMeter(meterList[0]);
        } else if (meterList.length > 1) {
          showMeterSelect.value = true;
        } else {
          clearMeterDataToSession();
          showMeterSelect.value = false;
        }
      } catch (err) {
        console.error('error:', err);
        try {
          const offlineMeters = await getOfflineMetersByLicschet(g_licschet.trim());
          meters.value = offlineMeters;
          if (offlineMeters.length === 1) {
            selectMeter(offlineMeters[0]);
          } else if (offlineMeters.length > 1) {
            showMeterSelect.value = true;
          } else {
            clearMeterDataToSession();
            showMeterSelect.value = false;
          }
        } catch (offlineErr) {
          console.error('offline fallback error:', offlineErr);
          meters.value = [];
          clearMeterDataToSession();
          showMeterSelect.value = false;
        }
      }
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

    

    const submitViolationReport = async () => {
      if (isLoading.value) return;
      isLoading.value = true;
      try {  
        const meterData = JSON.parse(sessionStorage.getItem('meternum') || '{}');
        const meterNum = meterData.meterNum; 
        const addressData = JSON.parse(sessionStorage.getItem('userAddress') || '{}');
        const licschet = addressData.g_licschet || '';
        if (!meterNum) {
          showAlert('Не найден серийный номер счётчика', 'error');
          return;
        }
        const violations = [];
        const v1 = document.getElementById('violation1')?.value;
        if (v1 && v1 !== "") violations.push({ name: 'Механические повреждения', description: v1 });
        const v2 = document.getElementById('violation2')?.value;
        if (v2 && v2 !== "") violations.push({ name: 'Проблемы с отображением', description: v2 });
        const v3 = document.getElementById('violation3')?.value;
        if (v3 && v3 !== "") violations.push({ name: 'Поверка', description: v3 });
        const techCheck = document.getElementById('techcheck')?.checked;
        if (techCheck) {
          const t1 = document.getElementById('techcheck1')?.value;
          if (t1 && t1 !== "") violations.push({ name: 'Ошибочная дата проверки', description: t1 });
          const t2 = document.getElementById('techcheck2')?.value;
          if (t2 && t2 !== "") violations.push({ name: 'Серийный номер счетчика', description: t2 });
        }
        if (violations.length === 0) {
          showAlert('Пожалуйста, выберите хотя бы одно нарушение', 'info');
          return;
        }       
        const fileInput = document.getElementById('fileInput');
        const files = fileInput?.files;
        if (files && files.length > 5) {
          showAlert('Можно выбрать не более 5 файлов.', 'info');
          fileInput.value = '';
          document.getElementById('previewContainer').innerHTML = '';
          return;
        }
        let filesDataForStorage = [];
        let fileNamesForServer = [];      
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = generateFileName(meterNum, file.name);
            fileNamesForServer.push(fileName);          
            const fileData = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve({
                fileName,
                fileType: file.type,
                fileBase64: reader.result
              });
              reader.readAsDataURL(file);
            });
            filesDataForStorage.push(fileData);
          }
        }
        const payload = {
          meterNum,
          licschet,
          violations: JSON.stringify(violations),
          fileNames: fileNamesForServer,
          filesData: filesDataForStorage,
          isViolation: true 
        };       
        const recordId = await saveReadingLocally(payload);     
        if (navigator.onLine) {
          const formData = new FormData();
          formData.append('meterNum', meterNum);
          formData.append('licschet', licschet);
          formData.append('violations', JSON.stringify(violations));         
          if (filesDataForStorage.length > 0) {
            filesDataForStorage.forEach(f => {
              const blob = base64ToBlob(f.fileBase64, f.fileType);
              formData.append('files', blob, f.fileName);
            });
          }        
          const response = await fetch(`${API_BASE}/save-violation`, {
            method: 'POST',
            body: formData
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Ошибка сервера');
          if (recordId) {
            await deletePendingReading(recordId);
          }
          showAlert(result.message || 'Отчет о нарушении успешно отправлен!', 'success');
        } else {
          showAlert('Интернет отсутствует, сохранено локально, ожидание сети', 'info');
        }     
        document.getElementById('violationsForm')?.reset();
        document.getElementById('techcheckForm')?.reset();
        document.getElementById('techcheckForm').style.display = 'none';
        if (fileInput) {
          fileInput.value = '';
          fileInput.classList.remove('file-selected');
        }
        document.getElementById('previewContainer').innerHTML = '';
      } catch (err) {
        console.error('Error submitting:', err);
        showAlert('Ошибка: ' + (err.message || 'Неизвестная ошибка'), 'error');
      } finally {
        isLoading.value = false;
      }
    };

    const login = async (e) => {
      error.value = ''; response.value = '';
      const passwordValue = password.value.trim();
      if (!passwordValue) { error.value = 'Пароль обязателен'; return; }
      if (passwordValue.length < 4) { error.value = 'Пароль минимум 4 символов'; return; }
      try {
        if (!navigator.onLine) {
          const offlineDataStr = localStorage.getItem('offlineAuthData');
          if (offlineDataStr) {
            const offlineData = JSON.parse(offlineDataStr);
            if (offlineData.password === passwordValue) {
              const authPayLoad = {
                token: offlineData.token || 'offline-token',
                authDate: Date.now(),
                controllerId: offlineData.controllerId
              };
              sessionStorage.setItem('authData', JSON.stringify(authPayLoad));
              localStorage.setItem('authData', JSON.stringify(authPayLoad));
              sessionStorage.setItem('controllerId', offlineData.controllerId);
              localStorage.setItem('lastPassword', passwordValue);                      
              window.location.href = 'ActWindow.html';
              return;
            } else {
              error.value = 'Неверный пароль (офлайн-режим)';
              return;
            }
          } else {
            error.value = 'Офлайн-вход невозможен: нет сохранённых данных. Подключитесь к сети для первого входа.';
            return;
          }
        }          
        const result = await apiRequest('/auth', { userpswd: passwordValue, meternum: meternum.value });
        const authPayLoad = {
          token: result.token,
          authDate: result.authDate,
          controllerId: result.controllerId
        };          
        sessionStorage.setItem('authData', JSON.stringify(authPayLoad));
        localStorage.setItem('authData', JSON.stringify(authPayLoad));
        sessionStorage.setItem('controllerId', result.controllerId);
        localStorage.setItem('offlineAuthData', JSON.stringify({
          password: passwordValue,
          token: result.token, 
          controllerId: result.controllerId
        }));
        localStorage.setItem('lastPassword', passwordValue);          
        sessionStorage.setItem('meternum', JSON.stringify({ meterNum: result.meterNum }));
        sessionStorage.setItem('mountdate', JSON.stringify({ mountDate: result.mountDate }));
        sessionStorage.setItem('verifydate', JSON.stringify({ verifyDate: result.verifyDate }));          
        if (navigator.onLine && result.controllerId) {
          ensureControllerPackage(result.controllerId).catch(err => console.warn('Ошибка сохранения офлайн-пакета:', err));
        }          
        window.location.href = 'ActWindow.html';
      } catch (err) { 
        error.value = `Ошибка: ${err.message}`; 
        console.error(err); 
      }
    };

    const checkSession = () => {
      const path = window.location.pathname.toLowerCase();
      const href = window.location.href.toLowerCase();
      if (
        path.includes('index.html') || 
        path.includes('oldtokenwindow.html') || 
        href.includes('index.html') || 
        href.includes('oldtokenwindow.html') ||
        path === '/' || 
        path === '/frontend' ||    
        path === '/frontend/' 
      ) {
        return true;
      }
      const authData = getAuthData ? getAuthData() : JSON.parse(sessionStorage.getItem('authData'));
      if (!authData) {
        error.value = 'Сессия не найдена';
        showContinue.value = true;
        setTimeout(() => window.location.href = 'index.html', 2000);
        return false;
      }
      const now = Date.now();
      const EXPIRY_MS = 24000000;
      if (now - authData.authDate > EXPIRY_MS)
      {
        error.value = 'Истёк срок сессии';
        showContinue.value = true;
        sessionStorage.setItem('lastAuthDate', authData.authDate);
        return false;
      }
      showContinue.value = false;
      return true;
    };

    const cont = () => {
      sessionStorage.removeItem('authData');
      window.location.href = 'oldtokenwindow.html';
    };

    function mapOfflineMeter(pkg, meterRow) {
      const abonent = pkg.abonents?.find(a => String(a.G_LICSCHET) === String(meterRow.LS)) || null;
      const client = abonent
        ? pkg.clients?.find(c => c.ID === abonent.CLIENT_ID)
        : null;
      const meterType = meterRow.METER_TYPE
        ? pkg.meterTypes?.find(t => t.ID === meterRow.METER_TYPE)
        : null;
      const service = meterType
        ? pkg.services?.find(s => s.ID === meterType.LOW_QUALITY_GRP_TARIFF)
        : null;
      return {
        found: true,
        id: meterRow.ID,
        meterNum: meterRow.METER_NUM,
        name: meterRow.NAME || '',
        seal: meterRow.SEAL || '',
        manfDate: meterRow.MANFDATE || '',
        mountDate: meterRow.MOUNT_DATE,
        verifyDate: meterRow.VERIFY_DATE,
        licschet: meterRow.LS,
        groupName: service?.GROUP_NAME || null,
        clientName: client?.NAME || null,
        apparts: abonent?.APPARTS || null 
      };
    }

    async function getOfflineMetersByLicschet(g_licschet) {
      const auth = typeof getAuthData === 'function'
        ? getAuthData()
        : JSON.parse(sessionStorage.getItem('authData') || 'null');
      if (!auth?.controllerId) return [];
      const pkg = await getControllerPackage(auth.controllerId);
      if (!pkg || !Array.isArray(pkg.meters)) return [];
      return pkg.meters
        .filter(m => String(m.LS) === String(g_licschet))
        .map(m => mapOfflineMeter(pkg, m));
    }

    async function getOfflineMetersByBuilding(buildingId) {
      const auth = typeof getAuthData === 'function'
        ? getAuthData()
        : JSON.parse(sessionStorage.getItem('authData') || 'null');
      if (!auth?.controllerId) return [];
      const pkg = await getControllerPackage(auth.controllerId);
      if (!pkg || !Array.isArray(pkg.meters) || !Array.isArray(pkg.abonents)) return [];
      const buildingAbonents = pkg.abonents.filter(a => String(a.BUILDINGS_ID) === String(buildingId));
      const licschets = buildingAbonents.map(a => String(a.G_LICSCHET));
      return pkg.meters
        .filter(m => licschets.includes(String(m.LS)))
        .map(m => mapOfflineMeter(pkg, m));
    } 

    onMounted(() => {
      selectedTownId.value = 2;
      const sessionValid = checkSession();
      const path = window.location.pathname.toLowerCase();
      const isAddressPage = path.includes('address.html');
      if (sessionValid && isAddressPage) {
        loadStreets(selectedTownId.value);
      }
      if (sessionValid) {
        const auth = typeof getAuthData === 'function'
          ? getAuthData()
          : JSON.parse(sessionStorage.getItem('authData') || 'null');
        if (auth?.controllerId) {
          ensureControllerPackage(auth.controllerId).catch(() => {});
        }
      }
      window.addEventListener('online', () => {
        if (typeof syncPendingReadings === 'function') {
          syncPendingReadings();
        }
        const auth = typeof getAuthData === 'function'
          ? getAuthData()
          : JSON.parse(sessionStorage.getItem('authData') || 'null');
        if (auth?.controllerId) {
          ensureControllerPackage(auth.controllerId).catch(() => {});
        }
        if (isAddressPage) {
          loadStreets(selectedTownId.value);
        }
      });
    });

    return { 
      password, response, error, meternum, mountdate, verifydate,
      streets, buildings, apparts, PHData, PH,
      selectedTownId, selectedStreetId, selectedBuildingId, selectedAppartId, 
       streetSearch, houseSearch, appartsSearch, showApparts,
      currentBuildingLicschet, meters, showMeterSelect, selectedMeter,
      selectMeter, loadMetersByBuilding, loadMetersByLicschet,
      NewPH, 
      isStreetOpen, isHouseOpen, isAppartsOpen,
      filteredStreets, filteredBuildings, filteredApparts,
      selectStreet, selectHouse, selectAppart,
      closeStreet, closeHouse, closeAppart,
      clearStreet, clearHouse, clearAppart,
      login, saveAddressAndContinue,
      submitViolationReport,
      showOverlay, actNo, actDate,
      isLoading,
      showContinue,
      continueFromOverlay,
      cont
    };
  }
}).mount('#app');
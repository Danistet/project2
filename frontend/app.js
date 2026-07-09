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
    const { onMounted } = Vue;

    // Сброс зависимых полей (улица, дом) при очистке поля "Город"
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

    // Сброс зависимых полей (дом) при очистке поля "Улица"
    watch(streetSearch, (newVal) => {
      if (!newVal || newVal.trim() === '') {
        houseSearch.value = '';
        selectedBuildingId.value = null;
        buildings.value = [];
      }
    });

    // Сброс зависимых полей (квартира) при очистке поля "Дом"
    watch(houseSearch, (newVal) => {
      if (!newVal || newVal.trim() === '') {
        appartsSearch.value = '';
        selectedAppartId.value = null;
        apparts.value = [];
      }
    });

    // Отслеживание переключения режима "вводить квартиру" / "не вводить".
    // Если режим выключен, пытаемся загрузить счётчик по зданию, иначе фокусируемся на поле квартиры.
    watch(showApparts, (newVal) => {
      if (!newVal)
      {
        appartsSearch.value = '';
        selectedAppartId.value = null;
        sessionStorage.removeItem('licschet');
        if (selectedBuildingId.value) {
          loadMeterByBuilding(selectedBuildingId.value);
        }
      }
      else
      {
        setTimeout(() => {
          const input = document.getElementById('appartsInput');
          if (input) input.focus();
        }, 100);
      }
    });
    // заменяем точку на запятую, добавляем ",000", если дробной части нет.
    const formatWithThousands = (value) => {
      if (!value && value !== 0) return '';
      const str = String(value).trim();
      if (!str) return '';
      if (/[,\.]\d+/.test(str)) return str.replace('.', ',');
      if (/^\d+$/.test(str)) return `${str},000`;
      return str.replace('.', ',');
    };
    
    //Считывает значение из поля, форматирует его, валидирует и отправляет на сервер
    const NewPH = async () => {
      try {
        const inputEl = document.getElementById('newPH');
        const rawValue = inputEl?.value?.trim() || '';            
        if (!rawValue) {
          alert("Введите показания");
          return;
        }      
        const formatted = formatWithThousands(rawValue);
        const numericValue = parseFloat(rawValue.replace(',', '.'));
        if (isNaN(numericValue)) {
          alert('Некорректное число');
          return;
        }   
        // сначала ищем 'activeMeter', если нет - берём 'meternum', если и его нет - пустой объект.     
        const meterData = JSON.parse(sessionStorage.getItem('activeMeter') || sessionStorage.getItem('meternum') || '{}');
        const meter_id = meterData.meterNum;;            
        if (!meter_id) {
          alert('Не найден серийный номер счётчика');
          return;
        }
        sessionStorage.setItem('ph', JSON.stringify({ PH: formatted }));
        PH.value = formatted;
        const result = await apiRequest('/PH', { 
          ph: numericValue,
          meter_id: meter_id 
        });               
        alert((result.message || 'Показания переданы'));  
        const phElement = document.getElementById('PH');
        if (phElement) {
          phElement.textContent = formatted;
        }
        sessionStorage.setItem('ph', JSON.stringify({ PH: formatted }));     
      } catch (err) {
        console.error('Error:', err);
        alert('error: ' + (err.message || 'Неизвестная ошибка'));
      }
    };

    // Валидирует введённый адрес (город, улица, дом, квартира) и сохраняет его в sessionStorage.
    // В зависимости от режима (с квартирой или без) загружает список подходящих счётчиков
    // и перенаправляет пользователя на main.html.
    const saveAddressAndContinue = async () => {
      if (!townSearch.value?.trim() || !selectedTownId.value) {
     alert("Выберите город из списка");
        document.getElementById('townInput')?.focus();
        return;
      }
      if (!streetSearch.value?.trim() || !selectedStreetId.value) {
        alert("Выберите улицу из списка");
        document.getElementById('streetInput')?.focus();
        return;
      }     
      let houseValue = houseInput.value?.trim();
      if (!houseValue) {
        alert("Введите номер дома");
        const input = document.getElementById('houseInput');
        if (input) { input.focus(); input.select(); }
        return;
      }
      if (!selectedBuildingId.value) {
        alert("Несуществующий номер дома");
        const input = document.getElementById('houseInput');
        if (input) { input.focus(); input.select(); }
        return;
      }    
      let appartsValue = null;
      let appartsIdValue = null;
      if (showApparts.value) {
        appartsValue = appartsSearch.value?.trim();
        if (!appartsValue) {
          alert("Введите номер квартиры");
          const input = document.getElementById('appartsInput');
          if (input) { input.focus(); input.select(); }
          return;
        }
        if (!selectedAppartId.value) {
          alert("Несуществующий номер квартиры");
          const input = document.getElementById('appartsInput');
          if (input) { input.focus(); input.select(); }
          return;
        }
        appartsIdValue = selectedAppartId.value;
      } else {
        appartsValue = "-1";
        appartsIdValue = null;
      }
      // 1. Если выбрана квартира и у неё есть лицевой счёт - ищем по л/с.
      // 2. Если квартира не выбрана, но у здания есть дефолтный л/с - ищем по нему.
      // 3. Иначе ищем все счётчики по зданию (фильтруя пустые квартиры, если режим без квартир).
      let allMeters = [];
      try {
        if (showApparts.value && selectedAppartId.value) {
          const selectedAppart = apparts.value.find(a => String(a.id) === String(selectedAppartId.value));
          const licschet = selectedAppart?.g_licschet;          
          if (licschet) {
            allMeters = await getMetersByLicschet(licschet);
          }
        } 
        else if (currentBuildingLicschet.value && !showApparts.value) {
          allMeters = await getMetersByLicschet(currentBuildingLicschet.value);
        } 
        else if (selectedBuildingId.value) {
          allMeters = await getMetersByBuilding(selectedBuildingId.value);
          if (!showApparts.value) {
            allMeters = allMeters.filter(m => !m.apparts || String(m.apparts).trim() === '');
          }
        }      
      } catch (err) {
        console.warn('Failed to load meters list:', err);
        allMeters = [];
      }

      if (!allMeters || allMeters.length === 0) {
        clearMeterDataToSession();
        if (!showApparts.value) {
          alert("Для выбранного дома не найдено счётчиков.");
        } else {
          alert("Для выбранной квартиры не найдено подходящих счётчиков.");
        }
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
        town: townSearch.value || '',
        townId: selectedTownId.value,
        street: streetSearch.value || '',
        streetId: selectedStreetId.value,
        house: houseInput.value || '',
        apparts: appartsValue,
        appartsId: appartsIdValue, 
        g_licschet,
        buildingId: selectedBuildingId.value
      };
      sessionStorage.setItem('userAddress', JSON.stringify(addressData));
      window.location.href = 'checkownerwindow.html';
    };

    const loadTowns = async () => {
      try {
        const result = await apiRequest('/cities');
        towns.value = result;
      } catch (err) {
        console.error('Failed to load towns:', err);
      }
    };

    const loadStreets = async (townId) => {
      try {
        const response = await fetch(`http://localhost:3000/streets?townId=${townId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        streets.value = data;
      } catch (err) {
        console.error('Failed to load streets:', err);
      }
    };

    const loadBuildings = async (streetId) => {
      if (!streetId) { buildings.value = []; return; }
      try {
        const result = await apiRequest(`/buildings?streetId=${streetId}`);
        buildings.value = result;
      } catch (err) {
        console.error('Failed to load buildings:', err);
      }
    };

    const loadApparts = async (buildingId) => {
      if (!buildingId) { 
        apparts.value = []; 
        currentBuildingLicschet.value = null;
        return; 
      }
      try {
        const result = await apiRequest(`/apparts?buildingId=${buildingId}`);
        apparts.value = result;
        const emptyAppart = result.find(appr => 
          (!appr.house || appr.house.trim() === '') && appr.g_licschet
        );
        currentBuildingLicschet.value = emptyAppart?.g_licschet || null;              
      } catch (err) {
        console.error('Failed to load apartments:', err);
        currentBuildingLicschet.value = null;
      }
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
      if (selectedBuildingId.value) {
        loadApparts(selectedBuildingId.value);
      } else {
        apparts.value = [];
      }
    };

    const onAppartsInput = (e) => {
      const val = e.target.value;
      const option = [...document.querySelectorAll('#resultsApparts option')]
        .find(o => o.value === val);
      if (option) selectedAppartId.value = option.dataset.id;
    };

    const clearMeterDataToSession = () => {
      sessionStorage.setItem('meternum', JSON.stringify({meterNum: null }));
      sessionStorage.setItem('mountdate', JSON.stringify({mountDate: null }));
      sessionStorage.setItem('verifydate', JSON.stringify({verifyDate: null })); 
      sessionStorage.removeItem('licschet');
    };

    const saveMeterDataToSession = (data) => { 
      if (!data?.found) {
        console.warn('No meter found');
        clearMeterDataToSession();
        return;
      } 
      sessionStorage.setItem('meternum', JSON.stringify({ meterNum: data.meterNum || null }));
      sessionStorage.setItem('mountdate', JSON.stringify({ mountDate: data.mountDate || null }));
      sessionStorage.setItem('verifydate', JSON.stringify({ verifyDate: data.verifyDate || null }));        
      if (data.licschet && data.licschet.trim() !== '') {
        sessionStorage.setItem('licschet', JSON.stringify({ g_licschet: data.licschet }));
      } else {
        sessionStorage.removeItem('licschet');
      }
    };

    // Загружает ОДИН счётчик по ID здания через /meter-by-building
    // и сохраняет его данные в sessionStorage.
    const loadMeterByBuilding = async (buildingId) => {
      if (!buildingId) {
        clearMeterDataToSession();
        return;
      }
      try {
        const meterData = await apiRequest('/meter-by-building', { 
          buildingId: buildingId 
        });
        saveMeterDataToSession(meterData);
      } catch (err) {
        console.error("error building lookup", err);
        clearMeterDataToSession();
      }
    };

    // Загружает СПИСОК счётчиков по ID здания через /meters-by-building.
    // Если найден один счётчик — автоматически выбирает его.
    // Если несколько — показывает диалог выбора. Если ни одного — очищает данные.
    const loadMetersByBuilding = async (buildingId) => {
      if (!buildingId) {
        meters.value = [];
        clearMeterDataToSession();
        return;
      }
      try {
        const meterList = await apiRequest('/meters-by-building', {buildingId});
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
        console.error("error:" , err);
        meters.value = [];
        clearMeterDataToSession();
        showMeterSelect.value = false;
      }
    };

    //Загружает СПИСОК счётчиков по лицевому счёту через /meters-by-licschet.
    const loadMetersByLicschet = async (g_licschet) => {
      if (!g_licschet?.trim()) {
        meters.value = [];
        clearMeterDataToSession();
        return;
      }
      try {
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
        console.error("error:", err);
        meters.value = [];
        clearMeterDataToSession();
        showMeterSelect.value = false;
      }
    };

    // Финализирует выбор конкретного счётчика: сохраняет его в sessionStorage,
    // обновляет адресные данные и скрывает диалог выбора.
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
      const val = e.target.value;
      let option = [...document.querySelectorAll('#resultsApparts option')]
        .find(o => o.value === val && o.dataset.id);    
      selectedAppartId.value = option?.dataset.id || null;
      appartsSearch.value = val; 
      showMeterSelect.value = false;
      selectedMeter.value = null;
      if (selectedAppartId.value && option?.dataset?.licschet?.trim()) {
        const g_licschet = option.dataset.licschet;
        await loadMetersByLicschet(g_licschet);
      } 
      else if (!selectedAppartId.value && selectedBuildingId.value && currentBuildingLicschet.value) {   
        await loadMetersByLicschet(currentBuildingLicschet.value);
      }
      else if (!selectedAppartId.value && selectedBuildingId.value) {
        await loadMetersByBuilding(selectedBuildingId.value);
      }
      else {
        meters.value = [];
        clearMeterDataToSession();
        showMeterSelect.value = false;
      }
    };

    const login = async (e) => {
      error.value = '';
      response.value = '';
      const passwordValue = password.value.trim();
      if (!password.value.trim()) {
        error.value = 'Пароль обязателен для заполнения';
        return;
      }
      if (passwordValue.length < 8) {
        error.value = 'Пароль должен содержать минимум 8 символов';
        return;
      }   
      try {
        let result;      
          result = await apiRequest('/auth', {
            userpswd: password.value,
            meternum: meternum.value
          });
        sessionStorage.setItem('authData', JSON.stringify({
          token: result.token,
          authDate: result.authDate
        }));
        sessionStorage.setItem('meterNum', JSON.stringify({
          meterNum: result.meterNum
        }));
        sessionStorage.setItem('mountDate', JSON.stringify({
          mountDate: result.mountDate
        }));
        sessionStorage.setItem('verifyDate', JSON.stringify({
          verifyDate: result.verifyDate
        }));        
        if (!result.token) {
          throw new Error('Сервер не вернул token');
        }
        if (!result.authDate) {
          throw new Error('Сервер не вернул authDate');
        }
        const authData = {
          token: result.token,
          authDate: result.authDate
        };
        const meterNum = {
          meterNum: result.meterNum
        };
        const mountDate = {
          mountDate: result.mountDate
        };
        const verifyDate = {
          verifyDate: result.verifyDate
        };
        sessionStorage.setItem('authData', JSON.stringify(authData));
        sessionStorage.setItem('meternum', JSON.stringify(meterNum));
        sessionStorage.setItem('mountdate', JSON.stringify(mountDate));
        sessionStorage.setItem('verifydate', JSON.stringify(verifyDate));
        window.location.href = 'checktypewindow.html'; 
      } catch (err) {
        error.value = `Ошибка: ${err.message}`;
        console.error(err);
      }
    };

    onMounted(() => {
      loadTowns();
    });

    return { 
      password, response, error, meternum, mountdate, verifydate,
      towns, streets, buildings, apparts, PHData, PH,
      selectedTownId, selectedStreetId, selectedBuildingId, selectedAppartId, 
      houseInput, townSearch, streetSearch, houseSearch, appartsSearch, showApparts,
      currentBuildingLicschet,
      meters, showMeterSelect, selectedMeter,
      selectMeter, loadMetersByBuilding, loadMetersByLicschet,
      NewPH,
      onTownInput,
      onTownChange,
      onStreetInput,
      onStreetChange,
      onHouseInput,
      onHouseChange,
      onAppartsInput,
      onAppartsChange,
      login,
      saveAddressAndContinue
    };
  }
}).mount('#app');
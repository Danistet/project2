const { createApp, ref, watch } = Vue;
createApp({
  setup() {
    const phone = ref('');
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
      if (!newVal)
      {
        appartsSearch.value = '';
        selectedAppartId.value = null;
        sessionStorage.removeItem('licschet');
      }
      else
      {
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
        const meterData = JSON.parse(sessionStorage.getItem('meternum') || '{}');
        const meter_id = meterData.meterNum;            
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

    const saveAddressAndContinue = () => {
      if (showApparts.value && (!appartsSearch.value || appartsSearch.value.trim() === '')) {
        alert("Введите номер квартиры");
        const input = document.getElementById('appartsInput');
        if (input) input.focus();
        return;
      }
      let g_licschet = null;
      try {
        const licschetData = JSON.parse(sessionStorage.getItem('licschet') || '{}');
        if (licschetData?.g_licschet?.trim()) {
          g_licschet = licschetData.g_licschet;
        }
      } catch (e) {
        console.warn('Failed to parse licschet', e);
      }
      if (!g_licschet && currentBuildingLicschet.value?.trim()) {
        g_licschet = currentBuildingLicschet.value;
      }
      const addressData = {
        town: townSearch.value || document.getElementById('townInput')?.value || '',
        townId: selectedTownId.value,
        street: streetSearch.value || document.getElementById('streetInput')?.value || '',
        streetId: selectedStreetId.value,
        house: houseInput.value || document.getElementById('houseInput')?.value || '',        
        apparts: showApparts.value ? (appartsSearch.value?.trim() || null) : null,
        appartsId: showApparts.value ? selectedAppartId.value : null,
        g_licschet,
        buildingId: selectedBuildingId.value
      };
      sessionStorage.setItem('userAddress', JSON.stringify(addressData));
      if (townSearch.value?.trim() && streetSearch.value?.trim() && houseInput.value?.trim())
      {
        //console.log("2", addressData.g_licschet);
        window.location.href = 'main.html';
      }
      else
      {
        alert("Введите данные");
      }
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

    const onAppartsChange = async (e) => {
      const val = e.target.value;
      let option = [...document.querySelectorAll('#resultsApparts option')]
        .find(o => o.value === val && o.dataset.id);    
      selectedAppartId.value = option?.dataset.id || null;
      appartsSearch.value = val;
      if (selectedAppartId.value && option?.dataset?.licschet?.trim()) {
        const g_licschet = option.dataset.licschet;
        try {
          const meterData = await apiRequest('/meter-by-licschet', { g_licschet });
          console.log('[DEBUG] /meter-by-licschet response:', meterData);
          saveMeterDataToSession(meterData);
        } catch (err) {
          console.error("error", err);
          clearMeterDataToSession();
        }
      } 
      else if (!selectedAppartId.value && selectedBuildingId.value && currentBuildingLicschet.value) {   
        try {
          const meterData = await apiRequest('/meter-by-licschet', { 
            g_licschet: currentBuildingLicschet.value 
          });
          saveMeterDataToSession(meterData);
        } catch (err) {
          console.error("error", err);
          clearMeterDataToSession();
        }
      }
      else if (!selectedAppartId.value && selectedBuildingId.value) {
        try {
          const meterData = await apiRequest('/meter-by-building', { 
            buildingId: selectedBuildingId.value 
          });
          saveMeterDataToSession(meterData);
        } catch (err) {
          console.error("error building lookup", err);
          clearMeterDataToSession();
        }
      }
      else {
        clearMeterDataToSession();
      }
    };

    const login = async (mode = 'login') => {
      error.value = '';
      response.value = '';
      if (!phone.value.trim() || !password.value.trim()) {
        error.value = 'Логин и пароль обязательны для заполнения';
        return;
      }   
      try {
        let result;
        if (mode === 'register') {    
          result = await apiRequest('/register', {
            phone: phone.value,
            userpswd: password.value,
            meternum: meternum.value,
          });
          response.value = 'Пользователь зарегистрирован';
        } else {
          result = await apiRequest('/auth', {
            phone: phone.value,
            userpswd: password.value,
            meternum: meternum.value
          });
        }
        sessionStorage.setItem('authData', JSON.stringify({
          phone: result.phone,
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

        if (!result.phone) {
          throw new Error('Сервер не вернул phone');
        }
        if (!result.token) {
          throw new Error('Сервер не вернул token');
        }
        if (!result.authDate) {
          throw new Error('Сервер не вернул authDate');
        }
        const authData = {
          phone: result.phone,
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
        window.location.href = 'address.html';                     
      } catch (err) {
        error.value = `Ошибка: ${err.message}`;
        console.error(err);
      }
    };
    onMounted(() => {
      loadTowns();
    });
    return { 
      phone, password, response, error, meternum, mountdate, verifydate,
      towns, streets, buildings, apparts, PHData, PH,
      selectedTownId, selectedStreetId, selectedBuildingId, selectedAppartId, 
      houseInput, townSearch, streetSearch, houseSearch, appartsSearch, showApparts,
      currentBuildingLicschet,
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

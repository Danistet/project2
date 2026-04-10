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

    const NewPH = () => {
      const phValue = document.getElementById('newPH')?.value || '';
      sessionStorage.setItem('ph', JSON.stringify({ PH: phValue }));
      PH.value = phValue;
    };

    const saveAddressAndContinue = () => {
      const addressData = {
        town: townSearch.value || document.getElementById('townInput')?.value || '',
        townId: selectedTownId.value,
        street: streetSearch.value || document.getElementById('streetInput')?.value || '',
        streetId: selectedStreetId.value,
        house: houseInput.value || document.getElementById('houseInput')?.value || '',
        buildingId: selectedBuildingId.value,
        apparts: showApparts.value ? appartsSearch.value : null,
        appartsId: showApparts.value ? selectedAppartId.value : null
      };
      sessionStorage.setItem('userAddress', JSON.stringify(addressData));
      if (townSearch.value != "" && streetSearch.value != "" && houseInput.value !="")
      {
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
      if (!buildingId) { apparts.value = []; return; }
      try {
        const result = await apiRequest(`/apparts?buildingId=${buildingId}`);
        apparts.value = result;
      } catch (err) {
        console.error('Failed to load apartments:', err);
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

    const onAppartsChange = (e) => {
      const val = e.target.value;
      const option = [...document.querySelectorAll('#resultsApparts option')]
        .find(o => o.value === val);
      selectedAppartId.value = option?.dataset.id || null;
      appartsSearch.value = val;
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
        console.log('Ответ сервера:', result);

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
      towns, streets, buildings, apparts, PHData,
      selectedTownId, selectedStreetId, selectedBuildingId, selectedAppartId, 
      houseInput, townSearch, streetSearch, houseSearch, appartsSearch, showApparts,
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

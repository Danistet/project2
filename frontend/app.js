const { createApp, ref } = Vue;
createApp({
  setup() {
    const phone = ref('');
    const password = ref('');
    const response = ref('');
    const error = ref('');
    const meternum = ref('');
    const mountdate = ref('');
    const towns = ref([]);
    const streets = ref([]);
    const buildings = ref([]);
    const selectedTownId = ref(null);
    const selectedStreetId = ref(null);
    const selectedBuildingId = ref(null);
    const houseInput = ref('');
    const townSearch = ref('');
    const streetSearch = ref('');
    const houseSearch = ref('');
    const { onMounted } = Vue;

    const saveAddressAndContinue = () => {
      const addressData = {
        town: townSearch.value || document.getElementById('townInput')?.value || '',
        townId: selectedTownId.value,
        street: streetSearch.value || document.getElementById('streetInput')?.value || '',
        streetId: selectedStreetId.value,
        house: houseInput.value || document.getElementById('houseInput')?.value || '',
        buildingId: selectedBuildingId.value
      };
      sessionStorage.setItem('userAddress', JSON.stringify(addressData));
      console.log('Адрес сохранён:', addressData);
      window.location.href = 'main.html';
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
      if (!townId) { streets.value = []; return; }
      try {
        const result = await apiRequest(`/streets?townId=${townId}`);
        streets.value = result;
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

    const onTownInput = (e) => {
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
                
        console.log('Сохраняем в sessionStorage:',"authData", authData,"meternum", meterNum,"mountdate", mountDate);
        sessionStorage.setItem('authData', JSON.stringify(authData));
        sessionStorage.setItem('meternum', JSON.stringify(meterNum));
        sessionStorage.setItem('mountdate', JSON.stringify(mountDate));
        console.log('authData:', sessionStorage.getItem('authData'));
        console.log('meterNum:', sessionStorage.getItem('meterNum'));
        console.log('mountDate:', sessionStorage.getItem('mountDate')); 
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
      phone, password, response, error, meternum, mountdate,
      towns, streets, buildings,
      selectedTownId, selectedStreetId, selectedBuildingId, houseInput, townSearch, streetSearch, houseSearch,
      onTownInput, onTownChange, onStreetInput, onStreetChange, onHouseInput, onHouseChange,
      login,
      saveAddressAndContinue 
    };
  }
}).mount('#app');

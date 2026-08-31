const { createApp, ref, watch, computed, onMounted } = Vue;

createApp({
  setup() {
    const password = ref('');
    const response = ref('');
    const error = ref('');
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
    const todayOnly = ref(false);
    const meters = ref([]);
    const isLoading = ref(false); 
    const showOverlay = ref(false);
    const actNo = ref('');
    const actDate = ref(''); 
    const showMeterSelect = ref(false);
    const selectedMeter = ref(null);

    const isVerifyDateToday = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const today = new Date();
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    };

    const formatWithThousands = (value) => {
      if (!value && value !== 0) return '';
      const str = String(value).trim();
      if (!str) return '';
      if (/[,\.]\d+/.test(str)) return str.replace('.', ',');
      if (/^\d+$/.test(str)) return `${str},000`;
      return str.replace('.', ',');
    };

    const login = async (e) => {
      error.value = ''; response.value = '';
      const passwordValue = password.value.trim();
      if (!passwordValue) { error.value = 'Пароль обязателен'; return; }     
      try {         
        const result = await apiRequest('/auth', { userpswd: passwordValue });
        sessionStorage.setItem('controllerId', result.controllerId);          
        window.location.href = 'adminActWindow.html';
      } catch (err) { 
        error.value = `Ошибка: ${err.message}`; 
      }
    };

    const loadStreets = async () => {
      isLoading.value = true;
      try {
        const controllerId = sessionStorage.getItem('controllerId') || '0';
        const data = await getControllerAddresses(controllerId);
        addressCatalog.value = Array.isArray(data) ? data : [];       
        const streetMap = new Map();
        addressCatalog.value.forEach(addr => {
          if (addr?.streetId !== null && addr?.streetId !== undefined) {
            streetMap.set(addr.streetId, addr.streetName);
          }
        });
        streets.value = Array.from(streetMap, ([id, name]) => ({ id, name }))
          .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru'));
      } catch (err) {
        console.error('Failed to load streets:', err);
        showAlert('Ошибка загрузки улиц. Проверьте подключение к серверу.', 'error');
        streets.value = [];
      } finally {
        isLoading.value = false;
      }
    };

    const loadBuildings = async (streetId) => {
      if (!streetId) { buildings.value = []; return; }
      isLoading.value = true;
      try {
        const buildingMap = new Map();
        addressCatalog.value
          .filter(a => String(a.streetId) === String(streetId))
          .forEach(a => {
            if (a.buildingsId !== null && a.buildingsId !== undefined) {
              buildingMap.set(a.buildingsId, a.houseName);
            }
          });
        buildings.value = Array.from(buildingMap, ([id, house]) => ({ id, house }))
          .sort((a, b) => String(a.house).localeCompare(String(b.house), 'ru', { numeric: true }));
      } catch (err) {
        console.error('Failed to load buildings:', err);
        buildings.value = [];
      } finally {
        isLoading.value = false;
      }
    };

    const loadApparts = async (buildingId) => {
      if (!buildingId) { apparts.value = []; currentBuildingLicschet.value = null; return; }
      isLoading.value = true;
      try {
        const controllerId = sessionStorage.getItem('controllerId') || '0';
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
        if (todayOnly.value) {
          const filtered = [];
          for (const appr of apparts.value) {
            if (!appr.g_licschet) continue;
            try {
              const metersForLs = await getMetersByLicschet(appr.g_licschet);
              const hasToday = Array.isArray(metersForLs) && metersForLs.some(m => isVerifyDateToday(m.verifyDate || m.VERIFY_DATE));
              if (hasToday) filtered.push(appr);
            } catch (e) { console.error(e); }
          }
          apparts.value = filtered;
        }
      } catch (err) {
        console.error('Failed to load apartments:', err);
        apparts.value = [];
      } finally {
        isLoading.value = false;
      }
    };

    const loadMetersByBuilding = async (buildingId) => {
      if (!buildingId) { meters.value = []; return; }
      isLoading.value = true;
      try {
        let meterList = await apiRequest('/meters-by-building', { buildingId });        
        if (todayOnly.value) {
          meterList = meterList.filter(m => isVerifyDateToday(m.verifyDate || m.VERIFY_DATE));
        }
        meters.value = meterList;
        if (meterList.length === 1) selectMeter(meterList[0]);
        else if (meterList.length > 1) showMeterSelect.value = true;
        else showMeterSelect.value = false;
      } catch (err) { 
        console.error("Error loading meters:", err); 
        meters.value = [];
      } finally {
        isLoading.value = false;
      }
    };  

    const loadMetersByLicschet = async (g_licschet) => {
      if (!g_licschet?.trim()) { meters.value = []; return; }
      isLoading.value = true;
      try {
        let meterList = await apiRequest('/meters-by-licschet', { g_licschet });        
        if (todayOnly.value) {
          meterList = meterList.filter(m => isVerifyDateToday(m.verifyDate || m.VERIFY_DATE));
        }      
        meters.value = meterList;
        if (meterList.length === 1) selectMeter(meterList[0]);
        else if (meterList.length > 1) showMeterSelect.value = true;
        else showMeterSelect.value = false;
      } catch (err) {
        console.error('Error loading meters:', err);
        meters.value = [];
      } finally {
        isLoading.value = false;
      }
    };

    const selectMeter = (meter) => {
      selectedMeter.value = meter;
      showMeterSelect.value = false;
      sessionStorage.setItem('activeMeter', JSON.stringify(meter));
    };

    const saveAddressAndContinue = async () => {
      if (!streetSearch.value?.trim() || !selectedStreetId.value) {
        showAlert('Выберите улицу из списка.', 'info'); return;        
      }
      if (!houseSearch.value?.trim() || !selectedBuildingId.value) {
        showAlert('Введите и выберите корректный номер дома.', 'error'); return;
      }
      let appartsValue = null;
      let appartsIdValue = null;
      if (showApparts.value) {
        if (!appartsSearch.value?.trim() || !selectedAppartId.value) {
          showAlert('Введите и выберите корректный номер квартиры.', 'error'); return;
        }
        const selectedAppart = apparts.value.find(a => String(a.id) === String(selectedAppartId.value));
        appartsValue = selectedAppart?.rawHouse || appartsSearch.value?.trim();
        appartsIdValue = selectedAppartId.value;
      } else {
        appartsValue = "-1";
      }      
      
      isLoading.value = true;
      try {
        const actResult = await apiRequest('/generate-act', { serviceId: null });
        await apiRequest('/update-act-building', { actId: actResult.actId, buildingId: selectedBuildingId.value });      
        actNo.value = actResult.actNo;
        actDate.value = actResult.actDate;              
        sessionStorage.setItem('currentAct', JSON.stringify({
          actId: actResult.actId,
          actNo: actResult.actNo,
          actDate: actResult.actDate,
          buildingId: selectedBuildingId.value
        }));      
        let allMeters = [];
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
        if (todayOnly.value) {
          allMeters = allMeters.filter(m => isVerifyDateToday(m.verifyDate || m.VERIFY_DATE));
        }               
        if (!allMeters || allMeters.length === 0) {
          showAlert(!showApparts.value ? "Для выбранного дома не найдено счётчиков." : "Для выбранной квартиры не найдено счётчиков.", 'error');
          return;
        }               
        sessionStorage.setItem('allMeters', JSON.stringify(allMeters));    
        if (allMeters.length > 0 && actResult.actId) {
          const firstMeter = allMeters[0];
          sessionStorage.setItem('activeMeter', JSON.stringify(firstMeter));
        }    
        const addressData = {
          town: 'Лянтор',
          street: streetSearch.value || '',
          streetId: selectedStreetId.value,
          house: houseSearch.value || '',
          apparts: appartsValue,
          appartsId: appartsIdValue,
          g_licschet: allMeters[0]?.licschet || null,
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
    };  

    watch(streetSearch, (newVal) => {
      if (!newVal || newVal.trim() === '') {
        houseSearch.value = ''; selectedBuildingId.value = null; buildings.value = [];
      }
    });
    watch(houseSearch, (newVal) => {
      if (!newVal || newVal.trim() === '') {
        appartsSearch.value = ''; selectedAppartId.value = null; apparts.value = [];
      }
    });
    watch(showApparts, (newVal) => {
      if (!newVal) {
        appartsSearch.value = ''; selectedAppartId.value = null;
        if (selectedBuildingId.value) loadMetersByBuilding(selectedBuildingId.value);
      }
    });
    watch(todayOnly, async () => {
      streetSearch.value = ''; houseSearch.value = ''; appartsSearch.value = '';
      selectedStreetId.value = null; selectedBuildingId.value = null; selectedAppartId.value = null;
      buildings.value = []; apparts.value = []; meters.value = []; showMeterSelect.value = false;
      await loadStreets();
    });

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

    const selectStreet = (street) => {
      streetSearch.value = street.name;
      selectedStreetId.value = street.id;
      isStreetOpen.value = false;          
      buildings.value = []; selectedBuildingId.value = null; houseSearch.value = '';
      loadBuildings(street.id);
    };

    const selectHouse = (bld) => {
      houseSearch.value = bld.house;
      selectedBuildingId.value = bld.id;
      isHouseOpen.value = false;          
      apparts.value = []; selectedAppartId.value = null; appartsSearch.value = '';
      loadApparts(bld.id);
    };

    const selectAppart = async (appr) => {
      appartsSearch.value = appr.displayHouse;
      selectedAppartId.value = appr.id;
      isAppartsOpen.value = false;
      await loadMetersByLicschet(appr.g_licschet);
    };

    const closeStreet = () => {
      isStreetOpen.value = false;
      if (streetSearch.value && !streets.value.find(s => s.name === streetSearch.value)) {
        selectedStreetId.value = null; buildings.value = []; selectedBuildingId.value = null; houseSearch.value = '';
      }
    };
    const closeHouse = () => {
      isHouseOpen.value = false;
      if (houseSearch.value && !buildings.value.find(b => b.house === houseSearch.value)) {
        selectedBuildingId.value = null; apparts.value = []; selectedAppartId.value = null; appartsSearch.value = '';
      }
    };
    const closeAppart = () => {
      isAppartsOpen.value = false;
      if (appartsSearch.value && !apparts.value.find(a => a.displayHouse === appartsSearch.value)) {
        selectedAppartId.value = null;
      }
    };

    const clearStreet = () => { streetSearch.value = ''; closeStreet(); };
    const clearHouse = () => { houseSearch.value = ''; closeHouse(); };
    const clearAppart = () => { appartsSearch.value = ''; closeAppart(); };

    onMounted(() => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('address.html') || path.includes('indexadmin.html')) {
        loadStreets();
      }
    });

    return { 
      password, response, error,
      streets, buildings, apparts,
      selectedTownId, selectedStreetId, selectedBuildingId, selectedAppartId, 
      streetSearch, houseSearch, appartsSearch, showApparts, todayOnly,
      currentBuildingLicschet, meters, showMeterSelect, selectedMeter,
      selectMeter, loadMetersByBuilding, loadMetersByLicschet,
      isStreetOpen, isHouseOpen, isAppartsOpen,
      filteredStreets, filteredBuildings, filteredApparts,
      selectStreet, selectHouse, selectAppart,
      closeStreet, closeHouse, closeAppart,
      clearStreet, clearHouse, clearAppart,
      login, saveAddressAndContinue,
      showOverlay, actNo, actDate,
      isLoading,
      continueFromOverlay
    };
  }
}).mount('#app');
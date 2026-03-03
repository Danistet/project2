const { createApp, ref } = Vue;
createApp({
  setup() {
    const username = ref('');
    const password = ref('');
    const response = ref('');
    const error = ref('');
    const meternum = ref('');
    const mountdate = ref('');
    const login = async (mode = 'login') => {
      error.value = '';
      response.value = '';
      if (!username.value.trim() || !password.value.trim()) {
        error.value = 'Логин и пароль обязательны для заполнения';
        return;
      }   
      try {
        let result;
        if (mode === 'register') {    
          result = await apiRequest('/register', {
            username: username.value,
            userpswd: password.value,
            meternum: meternum.value
          });
          response.value = 'Пользователь зарегистрирован';
        } else {
          result = await apiRequest('/auth', {
            username: username.value,
            userpswd: password.value,
            meternum: meternum.value
          });
        }
        sessionStorage.setItem('authData', JSON.stringify({
          username: result.username,
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

        if (!result.username) {
          throw new Error('Сервер не вернул username');
        }
        if (!result.token) {
          throw new Error('Сервер не вернул token');
        }
        if (!result.authDate) {
          throw new Error('Сервер не вернул authDate');
        }
        if (!result.meterNum) {
          throw new Error('Сервер не вернул meterNum');
        }
        if (!result.mountDate) {
          throw new Error('Сервер не вернул mountDate');
        }
        const authData = {
          username: result.username,
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
        window.location.href = 'main.html';              
      } catch (err) {
        error.value = `Ошибка: ${err.message}`;
        console.error(err);
      }
    };
    return { username, password,  meternum, mountdate, login, response, error,};
  }
}).mount('#app');

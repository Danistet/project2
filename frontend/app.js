const { createApp, ref } = Vue;
createApp({
  setup() {
    const username = ref('');
    const password = ref('');
    const response = ref('');
    const meternum = ref('');
    const mountdate = ref('');
    const error = ref('');
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
            userpswd: password.value
          });
          response.value = 'Пользователь зарегистрирован';
        } else {
          result = await apiRequest('/auth', {
            username: username.value,
            userpswd: password.value
          });
        }

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
        const authData = {
          username: result.username,
          token: result.token,
          authDate: result.authDate
        };
        
        console.log('Сохраняем в sessionStorage:', authData);
        sessionStorage.setItem('authData', JSON.stringify(authData));
        sessionStorage.setItem('meternum', meternum.value);
        sessionStorage.setItem('mountdate', mountdate.value); 
        console.log('authData:', sessionStorage.getItem('authData'));
        console.log('meternum:', sessionStorage.getItem('meternum'));
        console.log('mountdate:', sessionStorage.getItem('mountdate'));         
        window.location.href = 'main.html';              
      } catch (err) {
        error.value = `Ошибка: ${err.message}`;
        console.error(err);
      }
    };
    return { username, password, login, response, error, meternum, mountdate };
  }
}).mount('#app');

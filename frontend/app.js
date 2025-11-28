const { createApp, ref } = Vue;

createApp({
  setup() {
    const username = ref('');
    const password = ref('');
    const response = ref('');
    const error = ref('');

    const login = async () => {
      error.value = '';
      response.value = '';

        if (!username.value.trim() || !password.value.trim()) {
          error.value = 'Логин и пароль обязательны для заполнения';
          return;
        }   
      try {
        const url = `http://localhost:3000/auth?username=${encodeURIComponent(username.value)}&userpswd=${encodeURIComponent(password.value)}`;
        const res = await fetch(url);

        if (res.ok) {
          response.value = await res.text();
        } else {
          error.value = `Ошибка: ${res.status} ${res.statusText}`;
        }
      } catch (err) {
        error.value = 'Не удалось подключиться к серверу';
        console.error(err);
      }
    };

    return { username, password, login, response, error };
  }
}).mount('#app');
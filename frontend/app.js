const { createApp, ref } = Vue;

createApp({
  setup() {
    const username = ref('');
    const password = ref('');
    const response = ref('');
    const error = ref('');
    const reg = ref(false);

    const login = async () => {
      error.value = '';
      response.value = '';

        if (!username.value.trim() || !password.value.trim()) {
          error.value = 'Логин и пароль обязательны для заполнения';
          return;
        }   
      try {
        if (reg.value) {
          const res = await fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: username.value,
              userpswd: password.value
            })
          });

          if (res.ok) {
            response.value = 'Пользователь зарегистрирован';
          } else {
            const msg = await res.text();
            error.value = `Ошибка регистрации: ${res.status} — ${msg}`;
          }
        } else {
          const url = `http://localhost:3000/auth?username=${encodeURIComponent(username.value)}&userpswd=${encodeURIComponent(password.value)}`;
          const res = await fetch(url);

          if (res.ok) {
            response.value = await res.text();
          } else {
            error.value = `Ошибка входа: ${res.status} ${res.statusText}`;
          }
        }
      } catch (err) {
        error.value = 'Не удалось подключиться к серверу';
        console.error(err);
      }
    };

    return { username, password, reg, login, response, error };
  }
}).mount('#app');
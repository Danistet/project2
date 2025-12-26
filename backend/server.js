const express = require('express');
const firebird = require('node-firebird');
const cors = require('cors');
const crypto = require('crypto');
const config = require('./config');

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

app.get('/auth', async (req, res) => {
  const { username, userpswd } = req.query;

  if (!username || !userpswd) {
    return res.status(400).send('Missing username or userpswd');
  }

  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).send('Database connection error');
    }

    const query = 'SELECT TOKEN, AUTHDATE FROM NEW_TABLE WHERE USERNAME = ? AND USERPSWD = ?';
    db.query(query, [username, userpswd], (err, result) => {
      if (err) {
        db.detach();
        console.error('error:', err);
        return res.status(500).send('error');
      }

      if (result.length === 0) {
        db.detach();
        res.status(401).send('Invalid username or password');
      }

        const row = result[0];
        let token = row.TOKEN;
        const authDate = row.AUTHDATE;
        //const now = new Date().toISOString().replace('T', ' ').substring(0, 23);
        const now = Date.now();
        const minute = 60000;

        if (now - authDate > minute)
        {
          const newToken = crypto.randomBytes(32).toString('hex');
          const newDate = now;
          const updateQuery = 'UPDATE NEW_TABLE SET TOKEN = ?, AUTHDATE = ? WHERE USERNAME = ?';
          db.query(updateQuery, [newToken, newDate, username], (upderr) =>{
            db.detach();

            if (upderr)
            {
              console.log("update error", upderr);
              return res.status(500).send('update error');
            }

            else
            {
              //const text = `Status: OK \nДата ответа: ${new Date().toISOString().replace('T', ' ').substring(0, 23)}\nТокен: ${newToken}`;
              const text = `Status: OK\nToken: ${newToken}\nAuthDate: ${newDate}`;
               res.set('Content-Type', 'text/plain; charset=utf-8');
               res.status(200).send(text);
            }
          });
        }

        else
        {
          db.detach();
          const text = `Status: OK\nToken: ${row.TOKEN}\nAuthDate: ${row.AUTHDATE}`;
          res.set('Content-Type', 'text/plain; charset=utf-8');
          res.status(200).send(text);
        }
    });
  });
});

app.post('/register', (req, res) => {
  const { username, userpswd } = req.body;

  if (!username || !userpswd) {
    return res.status(400).send('Missing username or userpswd');
  }

  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).send('DB connect error');
    }

    const checkQuery = 'SELECT 1 FROM NEW_TABLE WHERE USERNAME = ?';
    db.query(checkQuery, [username], (err, result) => {
      if (err) {
        db.detach();
        console.error('Ошибка проверки пользователя:', err);
        return res.status(500).send('Ошибка при проверке логина');
      }

      if (result.length > 0) {
        db.detach();
        return res.status(409).send('Пользователь уже существует');
      }
      
      function generatetoken() 
      {
        return crypto.randomBytes(32).toString('hex');
      }
       const token = generatetoken(32);
       const authDate =  Date.now();
      //console.log(token);

      const insert = 'INSERT INTO NEW_TABLE (USERNAME, USERPSWD, TOKEN, AUTHDATE) VALUES (?, ?, ?, ?)';
      db.query(insert, [username, userpswd, token, authDate], (err) => {
        db.detach();

        if (err) {
          console.error('Ошибка вставки:', err);
          return res.status(500).send('Не удалось создать пользователя');
        }
        //const text = `Status: OK\nДата ответа: ${new Date().toISOString().replace('T', ' ').substring(0, 23)}\nТокен: ${token}`;
        const text = `Status: OK\nToken: ${token}\nAuthDate: ${authDate}`;
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.status(201).send(text);
      });
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}/auth`);
});
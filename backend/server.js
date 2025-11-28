const express = require('express');
const firebird = require('node-firebird');
const cors = require('cors');
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

    const query = 'SELECT * FROM NEW_TABLE WHERE USERNAME = ? AND USERPSWD = ?';
    db.query(query, [username, userpswd], (err, result) => {
      db.detach();

      if (err) {
        console.error('error:', err);
        return res.status(500).send('error');
      }

      if (result.length > 0) {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 23);
        res.status(200).send(`Ответ: OK\nДата ответа: ${now}`);
      } else {
        res.status(401).send('Invalid username or password');
      }
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}/auth`);
});
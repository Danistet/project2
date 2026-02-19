const express = require('express');
const firebird = require('node-firebird');
const cors = require('cors');
const crypto = require('crypto');
const config = require('./config');
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

app.post('/test', (req, res) => {
  const { meternum, mountdate } = req.body;

  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('Firebird connection error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }    
    const query = 'SELECT METER_NUM, MOUNT_DATE FROM METERS WHERE METER_NUM = ? AND MOUNT_DATE = ?';
    
    db.query(query, [meternum, mountdate], (err, result) => {
      if (err) {
        console.error('Query error:', err);
        db.detach();
        return res.status(500).json({ error: 'Query failed' });
      }      
      console.log('Query result:', result);
      db.detach();  
      return res.status(200).json({ 
        success: true, 
        data: result 
      });
    });
  });
});

app.post('/update-token', (req, res) => {
  const { username, token } = req.body;
  
  if (!username || !token) {
    return res.status(400).json({ error: 'Missing username or token' });
  }
  
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }    
    const query = 'SELECT TOKEN, AUTHDATE FROM NEW_TABLE WHERE USERNAME = ? AND TOKEN = ?';
    
    db.query(query, [username, token], (err, result) => {
      if (err) {
        db.detach();
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Database query error' });
      }
      
      if (result.length === 0) {
        db.detach();
        return res.status(401).json({ error: 'Invalid token or username' });
      }
      
      const now = Date.now();
      const newToken = token;
      const newAuthDate = now;
      const updateQuery = 'UPDATE NEW_TABLE SET TOKEN = ?, AUTHDATE = ? WHERE USERNAME = ?';
        
      db.query(updateQuery, [newToken, newAuthDate, username], (upderr) => {
        db.detach();         
        if (upderr) {
          console.error('Update error:', upderr);
          return res.status(500).json({ error: 'Token update error' });
        }          
        res.json({ 
          status: 'OK', 
          username, 
          token, 
          authDate: now 
        });
      });
    });
  });
});

app.post('/auth', (req, res) => {
  const { username, userpswd } = req.body;
  
  if (!username || !userpswd) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }
    
    const query = 'SELECT TOKEN, AUTHDATE FROM NEW_TABLE WHERE USERNAME = ? AND USERPSWD = ?';

    db.query(query, [username, userpswd], (err, result) => {
      if (err) {
        db.detach();
        return res.status(500).json({ error: 'Query error' });
      }
      
      if (result.length === 0) {
        db.detach();
        return res.status(401).json({ error: 'Invalid username or password'});
      }
      
      const { TOKEN: existingToken, AUTHDATE: existingAuthDate } = result[0];
      const now = Date.now();
      const minute = 2000;
      const respond = (token, authDate) => {
        db.detach();
        res.json({ 
          status: 'OK', 
          username, 
          token, 
          authDate 
        });
      };

      if (now - existingAuthDate > minute) {
        const newToken = crypto.randomBytes(32).toString('hex');
        const newAuthDate = now;        
        const updateQuery = 'UPDATE NEW_TABLE SET TOKEN = ?, AUTHDATE = ? WHERE USERNAME = ?';      
        db.query(updateQuery, [newToken, newAuthDate, username], (upderr) => {
          db.detach();         
          if (upderr) {
            return res.status(500).json({ error: 'Update error'});
          }       
          respond(newToken, now);
        });
      } else {
        const updateQuery = 'UPDATE NEW_TABLE SET AUTHDATE = ? WHERE USERNAME = ?';       
        db.query(updateQuery, [now, username], (upderr) => {
          db.detach();
          
          if (upderr) {
            console.error('Update error', upderr);
            return res.status(500).json({ error: 'Update error'});
          }     
          respond(existingToken, now);
        });
      }
    });
  });
});

app.post('/register', (req, res) => {
  const { username, userpswd } = req.body;
  if (!username || !userpswd) {
    return res.status(400).json({ error: 'Missing username or userpswd'});
  }
  
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'DB connect error'});
    }
    const checkQuery = 'SELECT 1 FROM NEW_TABLE WHERE USERNAME = ?';
    db.query(checkQuery, [username], (err, result) => {
      if (err) {
        db.detach();
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login error'});
      }
      
      if (result.length > 0) {
        db.detach();
        return res.status(409).json({ error: 'User already exists'});
      }   
      
      const token = crypto.randomBytes(32).toString('hex');
      const authDate = Date.now();
      const insert = 'INSERT INTO NEW_TABLE (USERNAME, USERPSWD, TOKEN, AUTHDATE) VALUES (?, ?, ?, ?)';     
      db.query(insert, [username, userpswd, token, authDate], (err) => {
        db.detach();
        
        if (err) {
          console.error('Error:', err);
          return res.status(500).json({ error: 'Unable to create user'});
        }      
        res.status(201).json({ 
          status: 'OK', 
          username, 
          token, 
          authDate
        });   
      });
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



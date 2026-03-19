const express = require('express');
const firebird = require('node-firebird');
const cors = require('cors');
const crypto = require('crypto');
const iconv = require('iconv-lite');
const config = require('./config');
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());


function convertResult(result) {
  if (!result || !Array.isArray(result)) return result;
  
  return result.map(row => {
    const converted = {};
    for (const key in row) {
      const value = row[key];
      if (typeof value === 'string') {
        const buffer = Buffer.from(value, 'binary');
        converted[key] = iconv.decode(buffer, 'win1251');
      } else {
        converted[key] = value;
      }
    }
    return converted;
  });
}

function queryWithConvert(db, query, params, callback) {
  db.query(query, params, (err, result) => {
    if (err) return callback(err, null);
    const converted = convertResult(result);
    callback(null, converted);
  });
}

app.post('/cities', (req, res) => {
  firebird.attach(config, (err, db) => {
    if (err) return res.status(500).json({ error: 'DB connection failed' });
    
    queryWithConvert(db,'SELECT ID, NAME FROM PAS_RTOWN ORDER BY NAME', (err, result) => {
      db.detach();
      if (err) return res.status(500).json({ error: 'Query failed' });
      const raw = result[1]?.NAME;
      console.log('=== ОТЛАДКА КОДИРОВКИ ===');
      console.log('1. Тип значения:', typeof raw);
      console.log('2. Строка как есть:', raw);
      console.log('3. Длина строки:', raw?.length);
      
      // Пробуем разные способы получить байты
      if (raw) {
        console.log('4. Buffer.from(str, "latin1"):', Buffer.from(raw, 'latin1'));
        console.log('5. iconv.decode(latin1):', iconv.decode(Buffer.from(raw, 'latin1'), 'win1251'));
        
        console.log('6. Buffer.from(str, "utf8"):', Buffer.from(raw, 'utf8'));
        console.log('7. iconv.decode(utf8):', iconv.decode(Buffer.from(raw, 'utf8'), 'win1251'));
        
        // Пробуем обратную конвертацию: если строка уже "испорчена"
        console.log('8. iconv.encode(str, "win1251"):', iconv.encode(raw, 'win1251'));
        console.log('9. decode(win1251 buffer):', iconv.decode(iconv.encode(raw, 'win1251'), 'win1251'));
      }
      console.log('==========================');
      res.json(result.map(r => ({ id: r.ID, name: r.NAME })));
    });
  });
});

app.post('/streets', (req, res) => {
  const townId = req.query.townId;
  if (!townId) return res.status(400).json({ error: 'townId required' });
  
  firebird.attach(config, (err, db) => {
    if (err) return res.status(500).json({ error: 'DB connection failed' });
    
    const query = `
      SELECT ID, STREET, STREET_TYPE 
      FROM RSTREETS 
      WHERE TOWN_ID = ? 
      ORDER BY STREET_TYPE, STREET
    `;
    queryWithConvert(db,query, [townId], (err, result) => {
      db.detach();
      if (err) return res.status(500).json({ error: 'Query failed' });
      res.json(result.map(r => ({ 
        id: r.ID, 
        name: `${r.STREET_TYPE} ${r.STREET}`.trim() 
      })));
    });
  });
});

app.post('/buildings', (req, res) => {
  const streetId = req.query.streetId;
  if (!streetId) return res.status(400).json({ error: 'streetId required' });
  
  firebird.attach(config, (err, db) => {
    if (err) return res.status(500).json({ error: 'DB connection failed' });
    
    const query = `
      SELECT ID, HOUSE 
      FROM BUILDINGS 
      WHERE STREET_ID = ? 
      ORDER BY HOUSE
    `;
    queryWithConvert(db,query, [streetId], (err, result) => {
      db.detach();
      if (err) return res.status(500).json({ error: 'Query failed' });
      res.json(result.map(r => ({ id: r.ID, house: r.HOUSE })));
    });
  });
});

app.post('/meters', (req, res) => {//////not using
  const { meternum, mountdate } = req.body;
  
  console.log('Запрос /meters:', { meternum, mountdate });

  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('Firebird connection error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }    
    const query = `
      SELECT METER_NUM, MOUNT_DATE 
      FROM METERS 
      WHERE METER_NUM = ? 
        AND MOUNT_DATE = CAST(? AS DATE)
    `;
    let dateStr = mountdate;
    if (mountdate instanceof Date) {
      dateStr = mountdate.toISOString().split('T')[0];
    } else if (typeof mountdate === 'string') {      
      dateStr = mountdate.split('T')[0];
    }

    queryWithConvert(db,query, [meternum, dateStr], (err, result) => {
      if (err) {
        console.error('Query error:', err);
        db.detach();
        return res.status(500).json({ error: 'Query failed' });
      }
      db.detach();

      return res.status(200).json({ 
        success: true, 
        data: result || [],
        debug: {
          received: { meternum, mountdate },
          usedForQuery: { meternum, dateStr },
          found: result?.length || 0
        }
      });
    });
  });
});////////not using

app.post('/update-token', (req, res) => {
  const { phone, token } = req.body;
  
  if (!phone || !token) {
    return res.status(400).json({ error: 'Missing phone or token' });
  }
  
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }    
    const query = 'SELECT TOKEN, AUTHDATE FROM NEW_TABLE WHERE USERNAME = ? AND TOKEN = ?';
    
    queryWithConvert(db,query, [phone, token], (err, result) => {
      if (err) {
        db.detach();
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Database query error' });
      }
      
      if (result.length === 0) {
        db.detach();
        return res.status(401).json({ error: 'Invalid token or phone' });
      }
      
      const now = Date.now();
      const newToken = token;
      const newAuthDate = now;
      const updateQuery = 'UPDATE NEW_TABLE SET TOKEN = ?, AUTHDATE = ? WHERE USERNAME = ?';
        
      queryWithConvert(db,updateQuery, [newToken, newAuthDate, phone], (upderr) => {
        db.detach();         
        if (upderr) {
          console.error('Update error:', upderr);
          return res.status(500).json({ error: 'Token update error' });
        }          
        res.json({ 
          status: 'OK', 
          phone, 
          token, 
          authDate: now 
        });
      });
    });
  });
});

app.post('/auth', (req, res) => {
  const { phone, userpswd } = req.body;
  
  if (!phone || !userpswd) {
    return res.status(400).json({ error: 'Missing phone or password' });
  }
  
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }      
    const authQuery = 'SELECT TOKEN, AUTHDATE FROM NEW_TABLE WHERE USERNAME = ? AND USERPSWD = ?';
    
    queryWithConvert(db,authQuery, [phone, userpswd], (err, authResult) => {
      if (err) {
        db.detach();
        return res.status(500).json({ error: 'Query error' });
      }
      
      if (authResult.length === 0) {
        db.detach();
        return res.status(401).json({ error: 'Invalid phone or password'});
      }      
      const { TOKEN: existingToken, AUTHDATE: existingAuthDate } = authResult[0];                  
      const meterQuery = 'SELECT METER_NUM, MOUNT_DATE FROM METERS';      
      queryWithConvert(db,meterQuery, [phone], (err, meterResult) => {        
        const now = Date.now();
        const minute = 2000;        
        const finishResponse = (token, authDate, meterNum, mountDate) => {
          db.detach();
          res.json({ 
            status: 'OK', 
            phone, 
            token, 
            authDate,
            meterNum,
            mountDate
          });
        };        
        const meterNum = meterResult?.[0]?.METER_NUM || null;
        const mountDate = meterResult?.[0]?.MOUNT_DATE || null;                
        if (now - existingAuthDate > minute) {
          const newToken = crypto.randomBytes(32).toString('hex');
          const newAuthDate = now;        
          const updateQuery = 'UPDATE NEW_TABLE SET TOKEN = ?, AUTHDATE = ? WHERE USERNAME = ?';      
          queryWithConvert(db,updateQuery, [newToken, newAuthDate, phone], (upderr) => {
            if (upderr) {
              db.detach();
              console.error('Update error:', upderr);
              return res.status(500).json({ error: 'Update error'});
            }       
            finishResponse(newToken, now, meterNum, mountDate);
          });
        } else {
          const updateQuery = 'UPDATE NEW_TABLE SET AUTHDATE = ? WHERE USERNAME = ?';       
          queryWithConvert(db,updateQuery, [now, phone], (upderr) => {
            if (upderr) {
              db.detach();
              console.error('Update error', upderr);
              return res.status(500).json({ error: 'Update error'});
            }     
            finishResponse(existingToken, now, meterNum, mountDate);
          });
        }
      });
    });
  });
});

app.post('/register', (req, res) => {
  const { phone, userpswd, fname, sname, lname, townId, streetId, buildingId, house  } = req.body;
  
  if (!phone || !userpswd) {
    return res.status(400).json({ error: 'Missing phone or userpswd' });
  }
  
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'DB connect error' });
    }
    const checkQuery = 'SELECT 1 FROM NEW_TABLE WHERE USERNAME = ?';
    queryWithConvert(db,checkQuery, [phone], (err, result) => {
      if (err) {
        console.error('Check user error:', err);
        db.detach();
        return res.status(500).json({ error: 'Login error' });
      }
      
      if (result.length > 0) {
        db.detach();
        return res.status(409).json({ error: 'User already exists' });
      }   
      const token = crypto.randomBytes(32).toString('hex');
      const authDate = Date.now();
      const insertUser = 'INSERT INTO NEW_TABLE (USERNAME, USERPSWD, TOKEN, AUTHDATE) VALUES (?, ?, ?, ?)';
      queryWithConvert(db,insertUser, [phone, userpswd, token, authDate], (err) => {
        if (err) {
          console.error('Insert user error:', err);
          db.detach();
          return res.status(500).json({ error: 'Unable to create user' });
        }                        
        const meterQuery = 'SELECT METER_NUM, MOUNT_DATE FROM METERS';
        queryWithConvert(db,meterQuery, [phone], (err, meterResult) => {
          const meterNum = meterResult?.[0]?.METER_NUM || null;
          const mountDate = meterResult?.[0]?.MOUNT_DATE || null;       
          db.detach();
          res.status(201).json({ 
            status: 'OK', 
            phone, 
            token, 
            authDate,
            meterNum,
            mountDate,
            message: 'User registered successfully'
          });     
        });
      });
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



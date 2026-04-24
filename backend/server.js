const express = require('express');
const firebird = require('node-firebird');
const cors = require('cors');
const crypto = require('crypto');
const config = require('./config');
const { error } = require('console');
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

app.post('/cities', (req, res) => {
  firebird.attach(config, (err, db) => {
    if (err) return res.status(500).json({ error: 'DB connection failed' });
    db.query(`SELECT ID, CAST(NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS NAME FROM PAS_RTOWN ORDER BY NAME`, (err, result) => {
      db.detach();
      if (err) return res.status(500).json({ error: 'Query failed' });     
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
      SELECT 
      ID, 
      CAST(STREET AS VARCHAR(100) CHARACTER SET WIN1251) AS STREET,
      CAST(STREET_TYPE AS VARCHAR(50) CHARACTER SET WIN1251) AS STREET_TYPE
      FROM RSTREETS 
      WHERE TOWN_ID = ? 
      ORDER BY STREET_TYPE, STREET
    `;
    db.query(query, [townId], (err, result) => {
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
      SELECT 
      ID,
      CAST(HOUSE AS VARCHAR(10) CHARACTER SET WIN1251) AS HOUSE, 
      CAST(CORPS AS VARCHAR(10) CHARACTER SET WIN1251) AS CORPS 
      FROM BUILDINGS 
      WHERE STREET_ID = ? 
      ORDER BY HOUSE
    `;
    db.query(query, [streetId], (err, result) => {
      db.detach();
      if (err) return res.status(500).json({ error: 'Query failed' });
      res.json(result.map(r => { 
        const corpsPart = r.CORPS ? ` ${r.CORPS}` : '';
        return {
          id: r.ID,
          house: `${r.HOUSE} ${corpsPart}`.trim()
        };
      }));
    });
  });
});

app.post('/apparts', (req, res) => {
  const buildingId = req.query.buildingId;
  if (!buildingId) return res.status(400).json({ error: 'buildingId required' });
  
  firebird.attach(config, (err, db) => {
    if (err) return res.status(500).json({ error: 'DB connection failed' });   
    const query = `
      SELECT 
      A.ID, 
      CAST(A.APPARTS AS VARCHAR(20) CHARACTER SET WIN1251) AS APPARTS,
      CAST(A.LETTER AS VARCHAR(10) CHARACTER SET WIN1251) AS LETTER,
      A.G_LICSCHET
      FROM ABONENTS A
      WHERE A.BUILDINGS_ID = ?
      ORDER BY A.APPARTS, A.LETTER
    `;    
    db.query(query, [buildingId], (err, result) => {
      db.detach();
      if (err) return res.status(500).json({ error: 'Query failed' });     
      res.json(result.map(r => { 
        const letterPart = r.LETTER ? ` ${r.LETTER}` : '';
        if (r.APPARTS == null)
        {
          return {
            id: r.ID,
            house: `${letterPart}`.trim(),
            g_licschet: r.G_LICSCHET
          };
        }//////////////////////////////если квартира не указана то первая дата, не надо так
        else
        {
          return {
            id: r.ID,
            house: `кв. ${r.APPARTS}${letterPart}`.trim(),
            g_licschet: r.G_LICSCHET
          };
        }       
      }));
    });
  });
});

app.post('/PH', (req, res) => {
  const ph = req.query.ph;
  if (!ph) return res.status(400).json({ error: 'ph required' });
////////////////////////////////////////METER_IND
  const query = `
    SELECT
    PH,
    METER_ID
    FROM METER_IND
    WHERE METER_ID = ?
    ORDER BY PH, METER_ID
  `;
  firebird.attach(config, (err, db) => {
    db.query(query, [ph], (err, result) =>{
      if (err) return res.status(500).json({ error: 'Query failed' });  
      console.log('query',query , 'ph', ph);
      res.json(result.map(r => {
        return {
          meter_id: r.METER_ID,
          ph: r.PH
        };
      }));
    });
  });
});

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
    const query = `SELECT TOKEN, AUTHDATE FROM NEW_TABLE WHERE USERNAME = ? AND TOKEN = ?`;  
    db.query(query, [phone, token], (err, result) => {
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
      const updateQuery = `UPDATE NEW_TABLE SET TOKEN = ?, AUTHDATE = ? WHERE USERNAME = ?`;    
      db.query(updateQuery, [newToken, newAuthDate, phone], (upderr) => {
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
    const authQuery = `SELECT TOKEN, AUTHDATE FROM NEW_TABLE WHERE USERNAME = ? AND USERPSWD = ?`;
    
    db.query(authQuery, [phone, userpswd], (err, authResult) => {
      if (err) {
        db.detach();
        return res.status(500).json({ error: 'Query error' });
      }

      if (authResult.length === 0) {
        db.detach();
        return res.status(401).json({ error: 'Invalid phone or password'});
      }      
      const { TOKEN: existingToken, AUTHDATE: existingAuthDate } = authResult[0];                  
      const meterQuery = `SELECT METER_NUM, MOUNT_DATE, VERIFY_DATE FROM METERS`;      
      db.query(meterQuery, [phone], (err, meterResult) => {        
        const now = Date.now();
        const minute = 600000;        
        const finishResponse = (token, authDate, meterNum, mountDate, verifyDate) => {
          db.detach();
          res.json({ 
            status: 'OK', 
            phone, 
            token, 
            authDate,
            meterNum,
            verifyDate,
            mountDate
          });
        };        
        const meterNum = meterResult?.[0]?.METER_NUM || null;
        const mountDate = meterResult?.[0]?.MOUNT_DATE || null;
        const verifyDate = meterResult?.[0]?.VERIFY_DATE || null;                
        if (now - existingAuthDate > minute) {
          const newToken = crypto.randomBytes(32).toString('hex');
          const newAuthDate = now;        
          const updateQuery = `UPDATE NEW_TABLE SET TOKEN = ?, AUTHDATE = ? WHERE USERNAME = ?`;      
          db.query(updateQuery, [newToken, newAuthDate, phone], (upderr) => {
            if (upderr) {
              db.detach();
              console.error('Update error:', upderr);
              return res.status(500).json({ error: 'Update error'});
            }       
            finishResponse(newToken, now, meterNum, mountDate, verifyDate);
          });
        } else {
          const updateQuery = `UPDATE NEW_TABLE SET AUTHDATE = ? WHERE USERNAME = ?`;       
          db.query(updateQuery, [now, phone], (upderr) => {
            if (upderr) {
              db.detach();
              console.error('Update error', upderr);
              return res.status(500).json({ error: 'Update error'});
            }     
            finishResponse(existingToken, now, meterNum, mountDate, verifyDate);
          });
        }
      });
    });
  });
});

app.post('/register', (req, res) => {
  const { phone, userpswd } = req.body;
  
  if (!phone || !userpswd) {
    return res.status(400).json({ error: 'Missing phone or userpswd' });
  }
  
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'DB connect error' });
    }
    const checkQuery = `SELECT 1 FROM NEW_TABLE WHERE USERNAME = ?`;
    db.query(checkQuery, [phone], (err, result) => {
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
      const insertUser = `INSERT INTO NEW_TABLE (USERNAME, USERPSWD, TOKEN, AUTHDATE) VALUES (?, ?, ?, ?)`;
      db.query(insertUser, [phone, userpswd, token, authDate], (err) => {
        if (err) {
          console.error('Insert user error:', err);
          db.detach();
          return res.status(500).json({ error: 'Unable to create user' });
        }                        
        const meterQuery = `SELECT METER_NUM, MOUNT_DATE, VERIFY_DATE FROM METERS`;
        db.query(meterQuery, [phone], (err, meterResult) => {
          const meterNum = meterResult?.[0]?.METER_NUM || null;
          const mountDate = meterResult?.[0]?.MOUNT_DATE || null;
          const verifyDate = meterResult?.[0]?.VERIFY_DATE || null;        
          db.detach();
          res.status(201).json({ 
            status: 'OK', 
            phone, 
            token, 
            authDate,
            meterNum,
            mountDate,
            verifyDate,
            message: 'User registered successfully'
          });     
        });
      });
    });
  });
});

app.post('/meter-by-licschet', (req, res) => {
  const {g_licschet} = req.body;
  if (!g_licschet) {
    return res.status(400).json({error: "g_licschet req"});
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error', err);
      return res.status(500).json({error: 'DB connect error'});
    }
    const query = `
      SELECT
      METER_NUM,
      MOUNT_DATE,
      VERIFY_DATE,
      LS
      FROM METERS
      WHERE LS = ?
    `;
    db.query(query, [g_licschet], (err, result) => {
      db.detach();
      if (err) 
      {
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Query failed' });
      }
      if (result.length === 0) 
      {
        return res.json ({
          found: false,
          meterNum: null,
          mountDate: null,
          verifyDate: null
        });
      }
      res.json({
        found: true,
        meterNum: result[0].METER_NUM,
        mountDate: result[0].MOUNT_DATE,
        verifyDate: result[0].VERIFY_DATE
      });
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



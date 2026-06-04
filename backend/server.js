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
        CAST(A.LETTER AS VARCHAR(5) CHARACTER SET WIN1251) AS LETTER,
        A.G_LICSCHET
      FROM ABONENTS A
      WHERE A.BUILDINGS_ID = ?
        AND (
          NOT EXISTS (
            SELECT 1 FROM METERS M WHERE M.LS = A.G_LICSCHET
          )
          OR
          EXISTS (
            SELECT 1 
            FROM METERS M
            INNER JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
            INNER JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
            INNER JOIN RMETER_STATUS RS ON M.STATUS = RS.ID
            WHERE M.LS = A.G_LICSCHET
              AND RS.ID = 1
              AND S.GROUP_ID IN (537, 555, 597)
          )
        )
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
        }
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
  const { ph, meter_id } = req.body;
  if (ph === undefined || ph === null || !meter_id) {
    return res.status(400).json({ error: 'ph и meter_id обязательны' });
  }
  const createdate = new Date().toISOString().replace('T', ' ').slice(0, 19);
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const checkQuery = `SELECT ID FROM METERS WHERE METER_NUM = ?`; 
    db.query(checkQuery, [meter_id], (err, checkResult) => {
      if (err) {
        db.detach();
        console.error('Check meter error:', err);
        return res.status(500).json({ error: 'Database query error' });
      }
      if (checkResult.length === 0) {
        db.detach();
        return res.status(404).json({ error: 'Счётчик не найден' });
      }
      const insertQuery = `
        INSERT INTO METERS_IND (ID, PH, METER_ID, CREATEDATE) 
        VALUES (GEN_ID(METERS_IND_GEN, 1), ?, ?, ?)
      `;          
      db.query(insertQuery, [ph, meter_id, createdate], (err) => {
        db.detach();  
        if (err) {
          console.error('Insert error:', err);
          return res.status(500).json({ 
            error: 'Не удалось сохранить показание',
            details: err.message
          });
        }
        res.json({
          status: 'OK',
          message: 'Показание сохранено',
          action: 'INSERT',
          data: { 
            ph, 
            meter_id, 
            createdate 
          }
        });
      });
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
    const query = `SELECT TOKEN, AUTHDATE FROM CONTROLLERS WHERE CONTROLLE_RHONE = ? AND TOKEN = ?`;  
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
      const updateQuery = `UPDATE CONTROLLERS SET TOKEN = ?, AUTHDATE = ? WHERE CONTROLLE_RHONE = ?`;    
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
    const authQuery = `SELECT TOKEN, AUTHDATE FROM CONTROLLERS WHERE CONTROLLE_RHONE = ? AND CONTROLLER_PSWD = ?`;  
    db.query(authQuery, [phone, userpswd], (err, authResult) => {
      if (err) {
        db.detach();
        return res.status(500).json({ error: 'Query error' });
      }
      if (authResult.length === 0) {
        db.detach();
        return res.status(401).json({ error: 'неправильный телефон или пароль'});
      }      
      const { TOKEN: existingToken, AUTHDATE: existingAuthDate } = authResult[0];                  
      const meterQuery = `SELECT METER_NUM, MOUNT_DATE, VERIFY_DATE FROM METERS`;      
      db.query(meterQuery, [phone], (err, meterResult) => {        
        const now = Date.now();
        const minute = 1200000;        
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
          const updateQuery = `UPDATE CONTROLLERS SET TOKEN = ?, AUTHDATE = ? WHERE CONTROLLE_RHONE = ?`;      
          db.query(updateQuery, [newToken, newAuthDate, phone], (upderr) => {
            if (upderr) {
              db.detach();
              console.error('Update error:', upderr);
              return res.status(500).json({ error: 'Update error'});
            }       
            finishResponse(newToken, now, meterNum, mountDate, verifyDate);
          });
        } else {
          const updateQuery = `UPDATE CONTROLLERS SET AUTHDATE = ? WHERE CONTROLLE_RHONE = ?`;       
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
    const checkQuery = `SELECT 1 FROM CONTROLLERS WHERE CONTROLLE_RHONE = ?`;
    db.query(checkQuery, [phone], (err, result) => {
      if (err) {
        console.error('Check user error:', err);
        db.detach();
        return res.status(500).json({ error: 'Login error' });
      }    
      if (result.length > 0) {
        db.detach();
        return res.status(409).json({ error: 'Пользователь уже существует' });
      }   
      const token = crypto.randomBytes(32).toString('hex');
      const authDate = Date.now();
      const insertUser = `INSERT INTO CONTROLLERS (CONTROLLE_RHONE, CONTROLLER_PSWD, TOKEN, AUTHDATE) VALUES (?, ?, ?, ?)`;
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
  const {g_licschet, buildingId} = req.body;
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error', err);
      return res.status(500).json({error: 'DB connect error'});
    }
    const query = `
      SELECT
        M.METER_NUM,
        M.MOUNT_DATE,
        M.VERIFY_DATE,
        M.LS,
        CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS GROUP_NAME
      FROM METERS M
      INNER JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
      INNER JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
      INNER JOIN RMETER_STATUS RS ON M.STATUS = RS.ID
      WHERE M.LS = ?
        AND RS.ID = 1
        AND S.GROUP_ID IN (537, 555, 597)
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
          verifyDate: null,
          groupName: null
        });
      }
      res.json({
        found: true,
        meterNum: result[0].METER_NUM,
        mountDate: result[0].MOUNT_DATE,
        verifyDate: result[0].VERIFY_DATE,
        licschet: result[0].LS,
        groupName: result[0].GROUP_NAME
      });
    });
  });
});

app.post('/meters-by-licschet', (req, res) => {
  const {g_licschet} = req.body;
  if (!g_licschet)
  {
    return res.status(400).json({ error: 'g_licschet required'});
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'DB connect error:', err});
    }
    const query = `
      SELECT 
        M.METER_NUM, 
        M.MOUNT_DATE, 
        M.VERIFY_DATE, 
        M.LS, 
        M.ID,
        CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS GROUP_NAME
      FROM METERS M
      INNER JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
      INNER JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
      INNER JOIN RMETER_STATUS RS ON M.STATUS = RS.ID
      WHERE M.LS = ?
        AND RS.ID = 1
        AND S.GROUP_ID IN (537, 555, 597)
      ORDER BY M.MOUNT_DATE DESC
    `;
    db.query(query, [g_licschet], (err, result) =>{
      db.detach();
      if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Query failed' });  
      }
      res.json(result.map(r => ({
        found: true,
        meterNum: r.METER_NUM,
        mountDate: r.MOUNT_DATE,
        verifyDate: r.VERIFY_DATE,
        licschet: r.LS,
        id: r.ID,
        groupName: r.GROUP_NAME
      })));
    });
  });
});

app.post('/meter-by-building', (req, res) => {
  const { buildingId } = req.body;
  if (!buildingId) {
    return res.status(400).json({ error: 'buildingId required' });
  } 
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const query = `
      SELECT 
        M.METER_NUM, 
        M.MOUNT_DATE, 
        M.VERIFY_DATE, 
        M.LS,
        CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS GROUP_NAME
      FROM METERS M
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      INNER JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
      INNER JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
      INNER JOIN RMETER_STATUS RS ON M.STATUS = RS.ID
      WHERE A.BUILDINGS_ID = CAST(? AS INTEGER)
        AND RS.ID = 1
        AND S.GROUP_ID IN (537, 555, 597)
        AND (A.APPARTS IS NULL OR TRIM(A.APPARTS) = '')
      ORDER BY M.MOUNT_DATE DESC
      ROWS 1
    `;
    const buildingIdNum = parseInt(buildingId, 10);
    if (isNaN(buildingIdNum)) {
      db.detach();
      return res.status(400).json({ error: 'Invalid buildingId' });
    }   
    db.query(query, [buildingIdNum], (err, result) => {
      db.detach();
      if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Query failed' });
      }
      if (!result || result.length === 0) {
        return res.json({
          found: false,
          meterNum: null,
          mountDate: null,
          verifyDate: null,
          groupName: null
        });        
      }
      res.json({
        found: true,
        meterNum: result[0].METER_NUM,
        mountDate: result[0].MOUNT_DATE,
        verifyDate: result[0].VERIFY_DATE,
        licschet: result[0].LS,
        groupName: result[0].GROUP_NAME
      });
    });
  });
});

app.post('/meters-by-building', (req, res) => {
  const { buildingId } = req.body;
  if (!buildingId) {
    return res.status(400).json({error: 'buildingId required'});
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const query = `
      SELECT 
        M.METER_NUM, 
        M.MOUNT_DATE, 
        M.VERIFY_DATE, 
        M.LS, 
        M.ID,
        CAST(A.APPARTS AS VARCHAR(20) CHARACTER SET WIN1251) AS APPARTS,
        CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS GROUP_NAME
      FROM METERS M
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      INNER JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
      INNER JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
      INNER JOIN RMETER_STATUS RS ON M.STATUS = RS.ID
      WHERE A.BUILDINGS_ID = CAST(? AS INTEGER)
        AND RS.ID = 1
        AND S.GROUP_ID IN (537, 555, 597)
      ORDER BY M.MOUNT_DATE DESC
    `;
    const buildingIdNum = parseInt(buildingId, 10);
    if (isNaN(buildingIdNum)) {
      db.detach();
      return res.status(400).json({ error: 'Invalid buildingId' });
    }
    db.query(query, [buildingIdNum], (err, result) => {
      db.detach();
      if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Query failed' });
      }
      res.json(result.map(r => ({
        found: true,
        meterNum: r.METER_NUM,
        mountDate: r.MOUNT_DATE,
        verifyDate: r.VERIFY_DATE,
        licschet: r.LS,
        id: r.ID,
        apparts: r.APPARTS,
        groupName: r.GROUP_NAME
      })));
    });
  });
});

app.get('/PH/last', (req, res) => {
  const { meter_id } = req.query;
  if (!meter_id) {
    return res.status(400).json({ error: 'meter_id required' });
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const query = `
      SELECT FIRST 1 PH, CREATEDATE, ID
      FROM METERS_IND 
      WHERE METER_ID = ? 
      ORDER BY ID DESC
    `; 
    db.query(query, [meter_id], (err, result) => {
      db.detach();
      if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Query failed' });
      }  
      if (result.length === 0) {
        return res.json({ found: false, ph: null, date: null });
      }
      const phRaw = result[0].PH;
      const phFormatted = phRaw !== null && phRaw !== undefined
        ? Number(phRaw).toLocaleString('ru-RU', { 
            minimumFractionDigits: 3, 
            maximumFractionDigits: 3 
          })
      : null;     
      res.json({
        found: true,
        ph: phFormatted,
        phRaw: phRaw,
        date: result[0].CREATEDATE,
        id: result[0].ID
      });
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



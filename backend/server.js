const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const firebird = require('node-firebird');
const crypto = require('crypto');
const cors = require('cors');
const config = require('./config');
const { error } = require('console');
const app = express();
const PORT = 3000;
const uploadDir = path.join(__dirname, 'images');
const frontendDir = path.join(__dirname, '..', 'frontend');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {recursive: true});
}
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({
  storage: storage,
  limits: {fileSize: 10 * 1024 * 1024}
});
app.use(cors());
app.use(express.json()); 
app.use('/frontend', express.static(frontendDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));
app.get('/', (req, res) => {
  res.redirect('/frontend/index.html');
});


app.post('/auth', (req, res) => {
  const { userpswd } = req.body; 
  if (!userpswd) {
    return res.status(400).json({ error: 'Missing password' });
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }      
    const authQuery = `SELECT ID, TOKEN, AUTHDATE FROM CONTROLLERS WHERE CONTROLLER_PSWD = ?`;  
    db.query(authQuery, [userpswd], (err, authResult) => {
      if (err) {
        db.detach();
        return res.status(500).json({ error: 'Query error' });
      }
      if (authResult.length === 0) {
        db.detach();
        return res.status(401).json({ error: 'wrong password'});
      }      
      const { TOKEN: existingToken, AUTHDATE: existingAuthDate } = authResult[0];                  
      const meterQuery = `SELECT METER_NUM, MOUNT_DATE, VERIFY_DATE FROM METERS`;      
      db.query(meterQuery, (err, meterResult) => {                          
        const now = Date.now();
        const minute = 24000000;        
        const finishResponse = (token, authDate, meterNum, mountDate, verifyDate, controllerId) => {
          db.detach();
          res.json({ 
            status: 'OK', 
            token, 
            authDate,
            meterNum,
            verifyDate,
            mountDate,
            controllerId
          });
        };    
        const controllerId = authResult[0].ID;    
        const meterNum = meterResult?.[0]?.METER_NUM || null;
        const mountDate = meterResult?.[0]?.MOUNT_DATE || null;
        const verifyDate = meterResult?.[0]?.VERIFY_DATE || null;                     
        if (now - existingAuthDate > minute) {
          const newToken = crypto.randomBytes(32).toString('hex');
          const newAuthDate = now;        
          const updateQuery = `UPDATE CONTROLLERS SET TOKEN = ?, AUTHDATE = ? WHERE CONTROLLER_PSWD = ?`;      
          db.query(updateQuery, [newToken, newAuthDate, userpswd], (upderr) => {
            if (upderr) {
              db.detach();
              console.error('Update error:', upderr);
              return res.status(500).json({ error: 'Update error'});
            }       
            finishResponse(newToken, now, meterNum, mountDate, verifyDate, controllerId);
          });
        } else {
          const updateQuery = `UPDATE CONTROLLERS SET AUTHDATE = ? WHERE CONTROLLER_PSWD = ?`;       
          db.query(updateQuery, [now, userpswd], (upderr) => {
            if (upderr) {
              db.detach();
              console.error('Update error', upderr);
              return res.status(500).json({ error: 'Update error'});
            }     
            finishResponse(existingToken, now, meterNum, mountDate, verifyDate, controllerId);
          });
        }
      });
    });
  });
});

app.post('/controller-addresses', (req, res) => {
  const { controllerId } = req.body;
  if (!controllerId) {
    return res.status(400).json({ error: 'controllerId required' });
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const query = `
      SELECT
        M.ID AS METER_ID,
        M.VERIFY_DATE,
        A.APPARTS,
        A.LETTER,
        A.BUILDINGS_ID,
      CAST(C.NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS CLIENT_NAME,
      CAST(C.PHONE AS VARCHAR(50) CHARACTER SET WIN1251) AS CLIENT_PHONE,
      CAST(RS.STREET_TYPE AS VARCHAR(50) CHARACTER SET WIN1251) AS STREET_TYPE,
      CAST(RS.STREET AS VARCHAR(100) CHARACTER SET WIN1251) AS STREET_NAME,
      RS.ID AS STREET_ID,
      CAST(B.HOUSE AS VARCHAR(10) CHARACTER SET WIN1251) AS HOUSE,
      CAST(B.CORPS AS VARCHAR(10) CHARACTER SET WIN1251) AS CORPS
      FROM METERS M
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
      INNER JOIN BUILDINGS B ON A.BUILDINGS_ID = B.ID
      INNER JOIN RSTREETS RS ON B.STREET_ID = RS.ID
      WHERE M.CONTROLER_ID = CAST(? AS INTEGER)
      ORDER BY RS.STREET_TYPE, RS.STREET, B.HOUSE, A.APPARTS, A.LETTER
    `;        
    const ctrlIdNum = parseInt(controllerId, 10);
    if (isNaN(ctrlIdNum)) {
      db.detach();
      return res.status(400).json({ error: 'Invalid controllerId' });
    }
    db.query(query, [ctrlIdNum], (err, result) => {
      db.detach();
      if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Query failed' });
      }            
      res.json(result.map(r => {
        const letterPart = r.LETTER ? ` ${r.LETTER}` : '';
        const appartsPart = r.APPARTS ? `кв. ${r.APPARTS}${letterPart}` : letterPart.trim();
        const namePart = r.CLIENT_NAME || `ФИО не указано`;
        const phonePart = r.CLIENT_PHONE ? `, тел: ${r.CLIENT_PHONE}` : '';
        const streetName = `${r.STREET_TYPE} ${r.STREET_NAME}`.trim();
        const corpsPart = r.CORPS ? ` ${r.CORPS}` : '';
        const houseName = `${r.HOUSE} ${corpsPart}`.trim();
        return {
          meterId: r.METER_ID,
          verifyDate: r.VERIFY_DATE,
          buildingsId: r.BUILDINGS_ID,
          streetId: r.STREET_ID,
          streetName: streetName,
          houseName: houseName,
          displayText: `${appartsPart}, ${namePart}${phonePart}`
        };
      }));
    });
  });
});

app.post('/update-verify-date', (req, res) => {
  const { meterId, verifyDate } = req.body;
  if (!meterId) {
    return res.status(400).json({ error: 'meterId required' });
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const updateQuery = `UPDATE METERS SET VERIFY_DATE = ? WHERE ID = ?`;
    db.query(updateQuery, [verifyDate || null, meterId], (err) => {
      db.detach();
      if (err) {
        console.error('Update error:', err);
        return res.status(500).json({ error: 'Update failed', details: err.message });
      }
      res.json({ status: 'OK', message: 'Дата проверки обновлена' });
    });
  });
});

app.post('/add-representative', (req, res) => {
  const {name, phone, mail} = req.body;
  if(!name || !name.trim()) {
    return res.status(400).json({ error: 'Missing Name'});
  }
  const createdate = new Date().toISOString().replace('T', ' ').slice(0, 19);
  firebird.attach(config, (err, db) => {
    if(err){
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }
    const insertQuery = `
      INSERT INTO CLIENTS (ID, NAME, PHONE, MAIL, IMPORT, CREATEDATE)
      VALUES (GEN_ID(CLIENTS_GEN, 1), ?,?,?,1,?)
      RETURNING ID
    `;
    db.query(insertQuery, [
      name.trim(),
      phone && phone.trim() ? phone.trim() : null,
      mail && mail.trim() ? mail.trim() : null,
      createdate
    ], (err, result) =>{
      db.detach();
      if (err) {
        console.error('Insert error', err);
        return res.status(500).json({
          error: 'unable to save data',
          details: err.message
        });
      }
      const newId = result && result[0] ? result[0].ID : null;
      res.json({
        status:  'OK',
        message: 'Data saved',
        id: newId
      });
    });
  });
});

app.post('/get-owner-data', (req, res) => {
  const { g_licschet } =req.body;
  if (!g_licschet)
  {
    return res.status(400).json({error: 'g_licschet required'});
  }
  firebird.attach(config, (err, db) =>{
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({error: 'Database connection error'});
    }
    const query = `
      SELECT 
        C.NAME AS OWNER_NAME,
        C.PHONE,
        C.MAIL,
        C.ID AS CLIENT_ID
      FROM ABONENTS A
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
      WHERE A.G_LICSCHET = ? 
    `;
    db.query(query, [g_licschet], (err, result) => {
      db.detach();
      if (err)
      {
        console.error('Query error', err);
        return res.status(500).json({error: 'Query failed'});
      }
      if (result.length === 0)
      {
        return res.json({ found: false }); 
      }
      res.json({
        found: true,
        ownerName: result[0].OWNER_NAME,
        phone: result[0].PHONE,
        mail: result[0].MAIL,
        clientId: result[0].CLIENT_ID 
      });
    });
  });
});

app.post('/update-owner-data', (req, res) => {
  const { g_licschet, clientId, ownerName, phone, mail } = req.body;
  if (!g_licschet) {
    return res.status(400).json({ error: 'g_licschet required' });
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }
    if (clientId) {
      const updateClientQuery = `UPDATE CLIENTS SET NAME = ?, PHONE = ?, MAIL = ? WHERE ID = ?`;
      db.query(updateClientQuery, [ownerName, phone, mail, clientId], (err) => {
        db.detach();
        if (err) {
          console.error('Update client error:', err);
          return res.status(500).json({ error: 'Update failed', details: err.message });
        }
        res.json({ status: 'OK', message: 'Data updated' });
      });
    } else {
      db.detach();
      res.json({ status: 'OK', message: 'Data updated (no client records)' });
    }
  });  
});

app.post('/update-token', (req, res) => {
  const { token } = req.body;  
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }  
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }    
    const query = `SELECT TOKEN, AUTHDATE FROM CONTROLLERS WHERE TOKEN = ?`;  
    db.query(query, [token], (err, result) => {
      if (err) {
        db.detach();
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Database query error' });
      }    
      if (result.length === 0) {
        db.detach();
        return res.status(401).json({ error: 'Invalid token' });
      }    
      const now = Date.now();
      const newToken = token;
      const newAuthDate = now;      
      const updateQuery = `UPDATE CONTROLLERS SET AUTHDATE = ? WHERE TOKEN = ?`;    
      db.query(updateQuery, [newAuthDate, token], (upderr) => {
        db.detach();         
        if (upderr) {
          console.error('Update error:', upderr);
          return res.status(500).json({ error: 'Token update error' });
        }          
        res.json({ 
          status: 'OK', 
          token, 
          authDate: now 
        });
      });
    });
  });
});

app.post('/generate-act', (req, res) => {
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatDate = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const formatDateTime = (d) =>
      `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const year = now.getFullYear();
    const month = now.getMonth();
    const actBdate = new Date(year, month, 1);
    const actEdate = new Date(year, month + 1, 0);
    const bdateStr = formatDate(actBdate);
    const edateStr = formatDate(actEdate);
    const actDateStr = formatDateTime(now);
    const maxQuery = `
      SELECT MAX(CAST(ACT_NO AS INTEGER)) AS MAX_NO
      FROM BUILD_MAINT_ACTS
      WHERE ACT_BDATE >= ? AND ACT_BDATE < ?
    `;
    db.query(maxQuery, [bdateStr, edateStr], (err, result) => {
      if (err) {
        db.detach();
        console.error('Max query error:', err);
        return res.status(500).json({ error: 'Query failed' });
      }
      const maxNo = (result && result[0] && result[0].MAX_NO) || 0;
      const newActNo = String(maxNo + 1).padStart(5, '0');
      db.query('SELECT GEN_ID(BUILD_MAINT_ACTS_GEN, 1) AS NEW_ID FROM RDB$DATABASE', (err, idResult) => {
        if (err) {
          db.detach();
          console.error('Generator error:', err);
          return res.status(500).json({ error: 'Generator failed' });
        }
        const newId = idResult && idResult[0] && idResult[0].NEW_ID;
        if (!newId) {
          db.detach();
          console.error('Generator returned empty');
          return res.status(500).json({ error: 'Generator returned empty' });
        }
        const insertQuery = `
          INSERT INTO BUILD_MAINT_ACTS
            (ID, ACT_NO, ACT_BDATE, ACT_EDATE, ACT_DATE, CREATEDATE)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.query(
          insertQuery,
          [newId, newActNo, bdateStr, edateStr, actDateStr, actDateStr],
          (err) => {
            db.detach();
            if (err) {
              console.error('Insert error:', err);
              return res.status(500).json({ error: 'Insert failed', details: err.message });
            }
            res.json({
              actId: newId,
              actNo: newActNo,
              actDate: actDateStr,
              actBdate: bdateStr,
              actEdate: edateStr
            });
          }
        );
      });
    });
  });
});

app.post('/update-act-building', (req, res) => {
  const { actId, buildingId } = req.body;
  if (!actId || !buildingId) {
    return res.status(400).json({ error: 'actId и buildingId required' });
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const updateQuery = `
      UPDATE BUILD_MAINT_ACTS
      SET BUILDING_ID = ?
      WHERE ID = ?
    `;
    db.query(updateQuery, [buildingId, actId], (err, result) => {
      db.detach();
      if (err) {
        console.error('Update error:', err);
        return res.status(500).json({ error: 'Update failed', details: err.message });
      }
      res.json({
        status: 'OK',
        message: 'BUILDING_ID updated',
        actId,
        buildingId
      });
    });
  });
});

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
  const controllerId = req.query.controllerId;
  if (!buildingId) return res.status(400).json({ error: 'buildingId required' });
  firebird.attach(config, (err, db) => {
    if (err) return res.status(500).json({ error: 'DB connection failed' });    
    const query = `
      SELECT 
        A.ID, 
        CAST(A.APPARTS AS VARCHAR(20) CHARACTER SET WIN1251) AS APPARTS,
        CAST(A.LETTER AS VARCHAR(5) CHARACTER SET WIN1251) AS LETTER,
        A.G_LICSCHET,
        (SELECT FIRST 1 M.CONTROLER_ID FROM METERS M WHERE M.LS = A.G_LICSCHET) AS CONTROLER_ID
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
            AND M.CONTROLER_ID = CAST(? AS INTEGER)
        )
      )
      ORDER BY CONTROLER_ID DESC NULLS LAST, A.APPARTS, A.LETTER
    `; 
    db.query(query, [buildingId, controllerId], (err, result) => {
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
        CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS GROUP_NAME,
        CAST(C.NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS CLIENT_NAME
      FROM METERS M
      INNER JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
      INNER JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
      INNER JOIN RMETER_STATUS RS ON M.STATUS = RS.ID
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
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
          groupName: null,
          clientName: null
        });
      }
      res.json({
        found: true,
        meterNum: result[0].METER_NUM,
        mountDate: result[0].MOUNT_DATE,
        verifyDate: result[0].VERIFY_DATE,
        licschet: result[0].LS,
        groupName: result[0].GROUP_NAME,
        clientName: result[0].CLIENT_NAME
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
        CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS GROUP_NAME,
        CAST(C.NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS CLIENT_NAME
      FROM METERS M
      INNER JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
      INNER JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
      INNER JOIN RMETER_STATUS RS ON M.STATUS = RS.ID
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
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
        groupName: r.GROUP_NAME,
        clientName: r.CLIENT_NAME
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
        CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS GROUP_NAME,
        CAST(C.NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS CLIENT_NAME
      FROM METERS M
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      INNER JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
      INNER JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
      INNER JOIN RMETER_STATUS RS ON M.STATUS = RS.ID
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
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
          groupName: null,
          clientName: null
        });        
      }
      res.json({
        found: true,
        meterNum: result[0].METER_NUM,
        mountDate: result[0].MOUNT_DATE,
        verifyDate: result[0].VERIFY_DATE,
        licschet: result[0].LS,
        groupName: result[0].GROUP_NAME,
        clientName: result[0].CLIENT_NAME
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
        CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS GROUP_NAME,
        CAST(C.NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS CLIENT_NAME
      FROM METERS M
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      INNER JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
      INNER JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
      INNER JOIN RMETER_STATUS RS ON M.STATUS = RS.ID
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
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
        groupName: r.GROUP_NAME,
        clientName: r.CLIENT_NAME
      })));
    });
  });
});

app.post('/PH', upload.array('files', 5), (req, res) => {
  const { ph, meter_id, licschet, abonent_name, description } = req.body;
  const { ph, meter_id, licschet, abonent_name, description } = req.body;
  const actIdRaw = req.body.act_id ?? req.body.actId ?? null;
  let actId = null;
  if (
    actIdRaw !== null &&
    actIdRaw !== undefined &&
    String(actIdRaw).trim() !== ''
  ) {
    actId = parseInt(actIdRaw, 10);
    if (isNaN(actId)) {
      return res.status(400).json({ error: 'Invalid act_id' });
    }
  }
  if (ph === undefined || ph === null || !meter_id) {
    return res.status(400).json({ error: 'ph и meter_id required' });
  }
  const createdate = new Date().toISOString().replace('T', ' ').slice(0, 19);
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const checkQuery = `SELECT ID, LS, METER_NUM FROM METERS WHERE METER_NUM = ?`;
    db.query(checkQuery, [meter_id], (err, checkResult) => {
      if (err) {
        db.detach();
        return res.status(500).json({ error: 'Database query error' });
      }
      if (checkResult.length === 0) {
        db.detach();
        return res.status(500).json({ error: 'no meter' });
      }
      const meterNum = checkResult[0].METER_NUM;
      const dbLicschet = checkResult[0].LS;
      const targetLicschet = licschet || dbLicschet;
      const insertQuery = `INSERT INTO METERS_IND (ID, PH, METER_ID, CREATEDATE, ACT_ID) VALUES (GEN_ID(METERS_IND_GEN, 1), ?, ?, ?, ?)`;
      db.query(insertQuery, [ph, meterNum, createdate, actId], (err) => {
        if (err) {
          db.detach();
          return res.status(500).json({ error: 'error', details: err.message });
        }
        if (req.files && req.files.length > 0) {
          const abonentQuery = `SELECT A.ID AS ABONENT_ID, C.NAME AS CLIENT_NAME FROM ABONENTS A LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID WHERE A.G_LICSCHET = ?`;
          db.query(abonentQuery, [targetLicschet], (err, abonentResult) => {
            if (err) {
              db.detach();
              return res.status(500).json({ error: 'error', details: err.message });
            }
            let abonentId = null;
            let clientName = abonent_name || '';
            if (abonentResult && abonentResult.length > 0) {
              abonentId = abonentResult[0].ABONENT_ID;
              if (abonentResult[0].CLIENT_NAME) clientName = abonentResult[0].CLIENT_NAME;
            }
            const insertFileQuery = `INSERT INTO ABONENTS_FILES (ID, ABONENT_ID, NAME, DATE_CRATE, DESCRIPTION, ABONENT_NAME, FILESIZE) VALUES (GEN_ID(ABONENTS_FILES_GEN, 1), ?, ?, ?, ?, ?, ?)`;
            let fileCompleted = 0;
            let fileError = null;
            req.files.forEach((file) => {
              if (fileError) return;
              const fileName = file.originalname;
              const fileSize = file.size.toString();
              const desc = description ? String(description).substring(0, 40) : 'file';
              db.query(insertFileQuery, [abonentId, fileName, createdate, desc, clientName, fileSize], (fileErr) => {
                if (fileErr && !fileError) fileError = fileErr;
                fileCompleted++;
                if (fileCompleted === req.files.length) {
                  db.detach();
                  if (fileError) return res.status(500).json({ error: 'file error:', details: fileError.message });
                  res.json({ status: 'OK', message: 'Saved', action: 'INSERT', data: { ph, meter_id, createdate, fileCount: req.files.length } });
                }
              });
            });
          });
        } else {
          db.detach();
          res.json({ status: 'OK', message: 'Saved', action: 'INSERT', data: { ph, meter_id, createdate } });
        }
      });
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

app.post('/save-violation', upload.array('files', 5), (req, res) => {
  const { meterNum, licschet, violations } = req.body;
  if (!meterNum) return res.status(400).json({ error: 'meternum required' });
  let parsedviolations = [];
  try { parsedviolations = violations ? JSON.parse(violations) : []; } 
  catch (e) { return res.status(400).json({ error: 'wrong format' }); }
  if (parsedviolations.length === 0) return res.status(400).json({ error: 'no violation' });
  firebird.attach(config, (err, db) => {
    if (err) return res.status(500).json({ error: 'Database connection failed' });
    const meterQuery = `SELECT ID, LS FROM METERS WHERE METER_NUM = ?`;
    db.query(meterQuery, [meterNum], (err, meterResult) => {
      if (err || !meterResult || meterResult.length === 0) {
        db.detach();
        return res.status(404).json({ error: 'no meter' });
      }
      const meterId = meterResult[0].ID;
      const dbLicschet = licschet || meterResult[0].LS;
      const createdate = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const abonentQuery = `SELECT A.ID AS ABONENT_ID, C.NAME AS CLIENT_NAME FROM ABONENTS A LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID WHERE A.G_LICSCHET = ?`;
      db.query(abonentQuery, [dbLicschet], (err, abonentResult) => {
        if (err) {
          db.detach();
          return res.status(500).json({ error: 'error finding abonent' });
        }
        let abonentId = null;
        let clientName = '';
        if (abonentResult && abonentResult.length > 0) {
          abonentId = abonentResult[0].ABONENT_ID;
          if (abonentResult[0].CLIENT_NAME) clientName = abonentResult[0].CLIENT_NAME;
        }
        const insertQuery = `INSERT INTO VIOLATIONS (ID, NAME, DESCRIPTION, ABONENT_ID, METERS_ID, CREATEDATE) VALUES (GEN_ID(VIOLATIONS_GEN, 1), ?, ?, ?, ?, ?)`;
        let completed = 0;
        let hasError = false;
        parsedviolations.forEach((v) => {
          db.query(insertQuery, [v.name, v.description, abonentId, meterId, createdate], (err) => {
            if (err && !hasError) {
              hasError = true;
              db.detach();
              return res.status(500).json({ error: 'error', details: err.message });
            }
            completed++;
            if (completed === parsedviolations.length && !hasError) {
              if (req.files && req.files.length > 0) {
                const insertFileQuery = `INSERT INTO ABONENTS_FILES (ID, ABONENT_ID, NAME, DATE_CRATE, DESCRIPTION, ABONENT_NAME, FILESIZE) VALUES (GEN_ID(ABONENTS_FILES_GEN, 1), ?, ?, ?, ?, ?, ?)`;
                let fileCompleted = 0;
                let fileError = null;
                req.files.forEach((file) => {
                  if (fileError) return;
                  const fileName = file.originalname;
                  const fileSize = file.size.toString();
                  const desc = 'violationfile';
                  db.query(insertFileQuery, [abonentId, fileName, createdate, desc, clientName, fileSize], (fileErr) => {
                    if (fileErr && !fileError) fileError = fileErr;
                    fileCompleted++;
                    if (fileCompleted === req.files.length) {
                      db.detach();
                      if (fileError) return res.status(500).json({ error: 'error', details: fileError.message });
                      res.json({ status: 'OK', message: 'Saved' });
                    }
                  });
                });
              } else {
                db.detach();
                res.json({ status: 'OK', message: 'Saved' });
              }
            }
          });
        });
      });
    });
  });
});

app.post('/get-meter-details', (req, res) => {
  const {meterId} = req.body;
  if (!meterId)
  {
    return res.status(400).json({error: 'meterId required'});
  }
  firebird.attach(config, (err,db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const query =`
      SELECT
      M.ID,
      M.METER_NUM,
      M.NAME,
      M.SEAL,
      M.MANFDATE,
      M.MOUNT_DATE,
      M.VERIFY_DATE,
      M.LS
      FROM METERS M
      WHERE M.ID = ?
    `;
    db.query(query, [meterId], (err, result) => {
      db.detach();
      if (err)
      {
        console.error('Query error', err);
        return res.status(500).json({error: 'Query failed'});
      }
      if (result === 0)
      {
        return res.json({found: false});
      }
      res.json({
        found: true,
        id: result[0].ID,
        meterNum: result[0].METER_NUM,
        name: result[0].NAME,
        seal: result[0].SEAL,
        manfDate: result[0].MANFDATE,
        mountDate: result[0].MOUNT_DATE,
        verifyDate: result[0].VERIFY_DATE,
        licschet: result[0].LS
      });
    });
  });
});

app.post('/update-meter', (req, res) => {
  const { meterId, meterNum, name, seal, manfDate, mountDate, verifyDate} = req.body;
  if (!meterId)
  {
    return res.status(400).json({error: 'meterId required'});
  }
  firebird.attach(config, (err,db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const updateQuery =`
      UPDATE METERS
      SET
        METER_NUM = ?,
        NAME = ?,
        SEAL = ?,
        MANFDATE = ?,
        MOUNT_DATE = ?,
        VERIFY_DATE = ?
      WHERE ID = ?  
    `;
    db.query(updateQuery, [
      meterNum || null,
      name || null,
      seal || null,
      manfDate || null,
      mountDate || null,
      verifyDate || null,
      meterId
    ], (err) => {
      db.detach();
      if (err)
      {
        console.error('Update error', err);
        return res.status(500).json({error: 'Update error', details: err.message});
      }
      res.json({
        status: 'OK',
        message: 'Data updated'
      });
    });
  });
});

app.post('/controller-offline-package', (req, res) => {
  const { controllerId } = req.body;
  const ctrlIdNum = parseInt(controllerId, 10);
  if (isNaN(ctrlIdNum)) {
    return res.status(400).json({ error: 'Invalid controllerId' });
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const query = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (queryErr, result) => {
          if (queryErr) reject(queryErr);
          else resolve(result || []);
        });
      });
    };
    const run = async () => {
      const meterByControllerFilter = `
        SELECT M.LS
        FROM METERS M
        WHERE M.CONTROLER_ID = ?
      `;
      const meters = await query(`
        SELECT
          M.ID,
          M.METER_NUM,
          M.NAME,
          M.SEAL,
          M.MANFDATE,
          M.MOUNT_DATE,
          M.VERIFY_DATE,
          M.LS,
          M.CONTROLER_ID,
          M.METER_TYPE,
          M.STATUS
        FROM METERS M
        WHERE M.CONTROLER_ID = ?
      `, [ctrlIdNum]);
      const abonents = await query(`
        SELECT
          A.ID,
          A.G_LICSCHET,
          A.CLIENT_ID,
          A.BUILDINGS_ID,
          CAST(A.APPARTS AS VARCHAR(20) CHARACTER SET WIN1251) AS APPARTS,
          CAST(A.LETTER AS VARCHAR(5) CHARACTER SET WIN1251) AS LETTER
        FROM ABONENTS A
        WHERE A.G_LICSCHET IN (${meterByControllerFilter})
      `, [ctrlIdNum]);
      const clients = await query(`
        SELECT
          C.ID,
          CAST(C.NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS NAME,
          CAST(C.PHONE AS VARCHAR(50) CHARACTER SET WIN1251) AS PHONE,
          CAST(C.MAIL AS VARCHAR(100) CHARACTER SET WIN1251) AS MAIL
        FROM CLIENTS C
        WHERE C.ID IN (
          SELECT A.CLIENT_ID
          FROM ABONENTS A
          WHERE A.G_LICSCHET IN (${meterByControllerFilter})
        )
      `, [ctrlIdNum]);
      const buildings = await query(`
        SELECT
          B.ID,
          B.STREET_ID,
          CAST(B.HOUSE AS VARCHAR(10) CHARACTER SET WIN1251) AS HOUSE,
          CAST(B.CORPS AS VARCHAR(10) CHARACTER SET WIN1251) AS CORPS
        FROM BUILDINGS B
        WHERE B.ID IN (
          SELECT A.BUILDINGS_ID
          FROM ABONENTS A
          WHERE A.G_LICSCHET IN (${meterByControllerFilter})
        )
      `, [ctrlIdNum]);
      const streets = await query(`
        SELECT
          RS.ID,
          RS.TOWN_ID,
          CAST(RS.STREET AS VARCHAR(100) CHARACTER SET WIN1251) AS STREET,
          CAST(RS.STREET_TYPE AS VARCHAR(50) CHARACTER SET WIN1251) AS STREET_TYPE
        FROM RSTREETS RS
        WHERE RS.ID IN (
          SELECT B.STREET_ID
          FROM BUILDINGS B
          WHERE B.ID IN (
            SELECT A.BUILDINGS_ID
            FROM ABONENTS A
            WHERE A.G_LICSCHET IN (${meterByControllerFilter})
          )
        )
      `, [ctrlIdNum]);
      const meterTypes = await query(`
        SELECT
          MT.ID,
          MT.LOW_QUALITY_GRP_TARIFF
        FROM METER_TYPES MT
        WHERE MT.ID IN (
          SELECT M.METER_TYPE
          FROM METERS M
          WHERE M.CONTROLER_ID = ?
        )
      `, [ctrlIdNum]);
      const services = await query(`
        SELECT
          S.ID,
          S.GROUP_ID,
          CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS GROUP_NAME
        FROM SERVICES S
        WHERE S.ID IN (
          SELECT MT.LOW_QUALITY_GRP_TARIFF
          FROM METER_TYPES MT
          WHERE MT.ID IN (
            SELECT M.METER_TYPE
            FROM METERS M
            WHERE M.CONTROLER_ID = ?
          )
        )
      `, [ctrlIdNum]);
      const meterStatuses = await query(`
        SELECT
          RS.ID
        FROM RMETER_STATUS RS
        WHERE RS.ID IN (
          SELECT M.STATUS
          FROM METERS M
          WHERE M.CONTROLER_ID = ?
        )
      `, [ctrlIdNum]);
      const meterIndLast = await query(`
        SELECT
          MI.ID,
          MI.METER_ID,
          MI.PH,
          MI.CREATEDATE,
          MI.ACT_ID
        FROM METERS_IND MI
        WHERE MI.METER_ID IN (
          SELECT M.METER_NUM
          FROM METERS M
          WHERE M.CONTROLER_ID = ?
        )
        AND MI.ID IN (
          SELECT MAX(MI2.ID)
          FROM METERS_IND MI2
          WHERE MI2.METER_ID = MI.METER_ID
        )
      `, [ctrlIdNum]);
      res.json({
        controllerId: ctrlIdNum,
        generatedAt: new Date().toISOString(),
        meters,
        abonents,
        clients,
        buildings,
        streets,
        meterTypes,
        services,
        meterStatuses,
        meterIndLast
      });
    };
    run()
      .catch(e => {
        console.error('Offline package error:', e);
        res.status(500).json({
          error: 'Failed to build controller offline package',
          details: e.message
        });
      })
      .finally(() => {
        db.detach();
      });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
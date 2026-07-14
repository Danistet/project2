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
    const authQuery = `SELECT TOKEN, AUTHDATE FROM CONTROLLERS WHERE CONTROLLER_PSWD = ?`;  
    db.query(authQuery, [userpswd], (err, authResult) => {
      if (err) {
        db.detach();
        return res.status(500).json({ error: 'Query error' });
      }
      if (authResult.length === 0) {
        db.detach();
        return res.status(401).json({ error: 'неправильный пароль'});
      }      
      const { TOKEN: existingToken, AUTHDATE: existingAuthDate } = authResult[0];                  
      const meterQuery = `SELECT METER_NUM, MOUNT_DATE, VERIFY_DATE FROM METERS`;      
      db.query(meterQuery, (err, meterResult) => {        
        const now = Date.now();
        const minute = 1200000;        
        const finishResponse = (token, authDate, meterNum, mountDate, verifyDate) => {
          db.detach();
          res.json({ 
            status: 'OK', 
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
        // Логика обновления токена: если с момента последней авторизации прошло больше 20 минут (1200000 мс),
        // генерируем новый токен. Иначе просто обновляем дату авторизации, сохраняя старый токен.               
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
            finishResponse(newToken, now, meterNum, mountDate, verifyDate);
          });
        } else {
          const updateQuery = `UPDATE CONTROLLERS SET AUTHDATE = ? WHERE CONTROLLER_PSWD = ?`;       
          db.query(updateQuery, [now, userpswd], (upderr) => {
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
      // Обновляем по токену
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
    return res.status(400).json({ error: 'actId и buildingId обязательны' });
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
        message: 'BUILDING_ID успешно обновлён',
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
  if (!buildingId) return res.status(400).json({ error: 'buildingId required' });
  firebird.attach(config, (err, db) => {
    if (err) return res.status(500).json({ error: 'DB connection failed' });
    // выбираем квартиры, для которых либо вообще нет счётчиков,
    // либо есть счётчики с определённым статусом (RS.ID = 1) и группой услуг (537, 555, 597).   
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
    // SQL-запрос ищет счётчик по зданию, игнорируя квартиры (APPARTS IS NULL),
    // и берёт только первую запись (ROWS 1), отсортированную по дате установки.
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

app.post('/PH', upload.single('file'), (req, res) => {
  const { ph, meter_id, licschet, abonent_name, description } = req.body;
  if (ph === undefined || ph === null || !meter_id) {
    return res.status(400).json({ error: 'ph и meter_id обязательны' });
  }
  // Форматируем текущую дату в формат, совместимый с Firebird (YYYY-MM-DD HH:MM:SS)
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
      const meterDbId = checkResult[0].ID;
      const dbLicschet = checkResult[0].LS;
      const taergetLicschet = licschet || dbLicschet;
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
        if (req.file) {
          const fileName = req.file.originalname;
          const fileSize = req.file.size.toString();
          const desc = description ? String(description).substring(0, 40) : 'Нарушение';
          const abName = abonent_name ? String(abonent_name).substring(0, 120) : '';
          const insertFileQuery = `
            INSERT INTO ABONENTS_FILES (ID, ABONENT_ID, NAME, DATE_CRATE, DESCRIPTION, ABONENT_NAME, FILESIZE)
            VALUES (GEN_ID(ABONENTS_FILES_GEN, 1), ?,?,?,?,?,?)
          `;
          db.query(insertFileQuery, [taergetLicschet, fileName, createdate, desc, abName, fileSize], (fileErr) => {
            db.detach();
            if (fileErr)
            {
              console.error('Insert file error', fileErr);
              return res.status(500).json({error: 'file error:', details: fileErr.message});              
            }
            res.json({
              status: 'OK',
              message: 'Показания и файл успешно сохранены',
              action: 'INSERT',
              data: {
                ph,
                meter_id,
                createdate,
                fileName
              }
            });
          });
        } else {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
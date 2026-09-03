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

app.post('/addresses-by-params', (req, res) => {
  const { streetId, houseFrom, houseTo, lastIndDateFrom, lastIndDateTo, verifyFilter } = req.body;
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    let query = `
      SELECT
        M.ID AS METER_ID,
        M.VERIFY_DATE,
        RS.ID AS STREET_ID,
        CAST(RS.STREET_TYPE AS VARCHAR(50) CHARACTER SET WIN1251) AS STREET_TYPE,
        CAST(RS.STREET AS VARCHAR(100) CHARACTER SET WIN1251) AS STREET_NAME,
        CAST(B.HOUSE AS VARCHAR(10) CHARACTER SET WIN1251) AS HOUSE,
        CAST(B.CORPS AS VARCHAR(10) CHARACTER SET WIN1251) AS CORPS,
        B.ID AS BUILDING_ID,
        CAST(A.APPARTS AS VARCHAR(20) CHARACTER SET WIN1251) AS APPARTS,
        CAST(A.LETTER AS VARCHAR(5) CHARACTER SET WIN1251) AS LETTER,
        CAST(C.NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS CLIENT_NAME,
        IND.LAST_IND_DATE
      FROM METERS M
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
      INNER JOIN BUILDINGS B ON A.BUILDINGS_ID = B.ID
      INNER JOIN RSTREETS RS ON B.STREET_ID = RS.ID
      LEFT JOIN (
        SELECT METER_ID, MAX(CREATEDATE) AS LAST_IND_DATE
        FROM METERS_IND
        WHERE (IS_DELETED = 0 OR IS_DELETED IS NULL)
        GROUP BY METER_ID
      ) IND ON TRIM(IND.METER_ID) = TRIM(M.METER_NUM)
      WHERE 1=1
    `;
    const params = [];
    if (streetId) {
      query += ` AND RS.ID = ?`;
      params.push(parseInt(streetId, 10));
    }
    if (houseFrom && houseFrom.trim() !== '') {
      query += ` AND CAST(B.HOUSE AS INTEGER) >= ?`;
      params.push(parseInt(houseFrom, 10));
    }
    if (houseTo && houseTo.trim() !== '') {
      query += ` AND CAST(B.HOUSE AS INTEGER) <= ?`;
      params.push(parseInt(houseTo, 10));
    }
    if (lastIndDateFrom && lastIndDateFrom.trim() !== '') {
      query += ` AND IND.LAST_IND_DATE >= ?`;
      params.push(lastIndDateFrom);
    }
    if (lastIndDateTo && lastIndDateTo.trim() !== '') {
      query += ` AND IND.LAST_IND_DATE <= ?`;
      params.push(lastIndDateTo);
    }
    if (verifyFilter === 'expired') {
      query += ` AND M.VERIFY_DATE < CURRENT_DATE`;
    } else if (verifyFilter === 'valid') {
      query += ` AND M.VERIFY_DATE >= CURRENT_DATE`;
    }
  query += `
      ORDER BY
        RS.STREET_TYPE, RS.STREET,
        CAST(B.HOUSE AS INTEGER),
        A.APPARTS, A.LETTER
    `;
    db.query(query, params, (err, result) => {
      db.detach();
      if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Query failed', details: err.message });
      }
      res.json(result.map(r => {
        const streetName = `${r.STREET_TYPE || ''} ${r.STREET_NAME || ''}`.trim();
        const corpsPart = r.CORPS ? ` ${r.CORPS}` : '';
        const houseName = `${r.HOUSE || ''}${corpsPart}`.trim();
        const letterPart = r.LETTER ? ` ${r.LETTER}` : '';
        const appartsPart = r.APPARTS ? `кв. ${r.APPARTS}${letterPart}` : letterPart.trim();
        const address = `${streetName}, д. ${houseName}${appartsPart ? ', ' + appartsPart : ''}`;
        return {
          meterId: r.METER_ID,
          address: address,
          fio: r.CLIENT_NAME || 'ФИО не указано',
          verifyDate: r.VERIFY_DATE,
          lastIndDate: r.LAST_IND_DATE,
          buildingId: r.BUILDING_ID,
          streetId: r.STREET_ID
        };
      }));
    });
  });
});

app.post('/meter-full-details', (req, res) => {
  const { meterId } = req.body || {};
  if (!meterId) return res.status(400).json({ error: 'meterId required' });
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const query = `
      SELECT
        M.ID AS METER_ID, M.METER_NUM, M.LS, M.NAME AS METER_NAME, M.SEAL, M.MANFDATE, M.MOUNT_DATE, M.VERIFY_DATE, M.CONTROLER_ID, M.METER_TYPE,
        C.ID AS CLIENT_ID, CAST(C.NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS CLIENT_NAME, CAST(C.PHONE AS VARCHAR(50) CHARACTER SET WIN1251) AS CLIENT_PHONE, CAST(C.MAIL AS VARCHAR(100) CHARACTER SET WIN1251) AS CLIENT_MAIL,
        RS.ID AS STREET_ID, CAST(RS.STREET_TYPE AS VARCHAR(50) CHARACTER SET WIN1251) AS STREET_TYPE, CAST(RS.STREET AS VARCHAR(100) CHARACTER SET WIN1251) AS STREET_NAME,
        CAST(B.HOUSE AS VARCHAR(10) CHARACTER SET WIN1251) AS HOUSE, CAST(B.CORPS AS VARCHAR(10) CHARACTER SET WIN1251) AS CORPS, B.ID AS BUILDING_ID,
        CAST(A.APPARTS AS VARCHAR(20) CHARACTER SET WIN1251) AS APPARTS, CAST(A.LETTER AS VARCHAR(5) CHARACTER SET WIN1251) AS LETTER,
        S.ID AS SERVICE_ID, CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS SERVICE_NAME,
        CTRL.ID AS CONTROLLER_ID, CAST(CTRL.FIO AS VARCHAR(200) CHARACTER SET WIN1251) AS CONTROLLER_FIO,
        (SELECT FIRST 1 STATUS FROM BOILER_STATUS WHERE METER_ID = M.ID ORDER BY ID DESC) AS BOILER_STATUS,
        IND.PH AS LAST_PH, IND.CREATEDATE AS LAST_PH_DATE
      FROM METERS M
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
      INNER JOIN BUILDINGS B ON A.BUILDINGS_ID = B.ID
      INNER JOIN RSTREETS RS ON B.STREET_ID = RS.ID
      LEFT JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
      LEFT JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
      LEFT JOIN CONTROLLERS CTRL ON M.CONTROLER_ID = CTRL.ID
      LEFT JOIN (
        SELECT MI1.METER_ID, MI1.PH, MI1.CREATEDATE
        FROM METERS_IND MI1
        INNER JOIN (SELECT METER_ID, MAX(ID) AS MAX_ID FROM METERS_IND WHERE (IS_DELETED=0 OR IS_DELETED IS NULL) GROUP BY METER_ID) MI2
          ON MI1.ID = MI2.MAX_ID
      ) IND ON TRIM(IND.METER_ID) = TRIM(M.METER_NUM)
      WHERE M.ID = ?
    `;
    db.query(query, [meterId], (err, result) => {
      if (err) { db.detach(); return res.status(500).json({ error: 'Query failed', details: err.message }); }
      if (!result || result.length === 0) { db.detach(); return res.status(404).json({ error: 'Meter not found' }); }
      const r = result[0];
      const getRefs = (cb) => {
        db.query(`SELECT ID, CAST(GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS GROUP_NAME FROM SERVICES ORDER BY GROUP_NAME`, [], (sErr, services) => {
          db.query(`SELECT ID, CAST(FIO AS VARCHAR(200) CHARACTER SET WIN1251) AS FIO FROM CONTROLLERS ORDER BY FIO`, [], (cErr, controllers) => {
            db.detach();
            cb(services || [], controllers || []);
          });
        });
      };
      getRefs((services, controllers) => {
        const streetName = `${r.STREET_TYPE || ''} ${r.STREET_NAME || ''}`.trim();
        const corpsPart = r.CORPS ? ` ${r.CORPS}` : '';
        const houseName = `${r.HOUSE || ''}${corpsPart}`.trim();
        const letterPart = r.LETTER ? ` ${r.LETTER}` : '';
        const appartsPart = r.APPARTS ? `кв. ${r.APPARTS}${letterPart}` : letterPart.trim();
        const address = `${streetName}, д. ${houseName}${appartsPart ? ', ' + appartsPart : ''}`;
        const formatDate = (d) => {
          if (!d) return '';
          const date = new Date(d);
          if (isNaN(date.getTime())) return '';
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };
        res.json({
          meterId: r.METER_ID, meterNum: r.METER_NUM, licschet: r.LS, address,
          verifyDate: formatDate(r.VERIFY_DATE), fio: r.CLIENT_NAME || '', clientId: r.CLIENT_ID,
          clientPhone: r.CLIENT_PHONE || '', clientMail: r.CLIENT_MAIL || '',
          controllerId: r.CONTROLLER_ID || null, serviceId: r.SERVICE_ID || null,
          seal: r.SEAL || '', boilerStatus: r.BOILER_STATUS || '',
          lastPh: (r.LAST_PH !== null && r.LAST_PH !== undefined) ? Number(r.LAST_PH).toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '',
          manfDate: formatDate(r.MANFDATE), mountDate: formatDate(r.MOUNT_DATE), meterName: r.METER_NAME || '',
          services: services.map(s => ({ id: s.ID, name: s.GROUP_NAME })),
          controllers: controllers.map(c => ({ id: c.ID, fio: c.FIO }))
        });
      });
    });
  });
});

app.post('/update-meter-full', (req, res) => {
  const d = req.body || {};
  if (!d.meterId) return res.status(400).json({ error: 'meterId required' });
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const metaQuery = `
      SELECT M.ID, M.LS, A.CLIENT_ID, M.METER_NUM, M.METER_TYPE
      FROM METERS M
      LEFT JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      WHERE M.ID = ?
    `;
    db.query(metaQuery, [d.meterId], (err, meta) => {
      if (err) {
        console.error('DB query error:', err);
        db.detach();
        return res.status(500).json({ error: 'Database query error', details: err.message });
      }
      const processMeter = (meterData) => {
        const licschet = meterData.LS;
        const clientId = meterData.CLIENT_ID;
        const meterNum = meterData.METER_NUM;
        const dbMeterId = meterData.ID;
        const oldMeterType = meterData.METER_TYPE;
        const createdate = new Date().toISOString().replace('T', ' ').slice(0, 19);
        let completed = 0;
        const total = 3;
        let hasError = false;
        const fail = (msg, details) => {
          if (hasError) return;
          hasError = true;
          db.detach();
          res.status(500).json({ error: msg, details });
        };
        const done = () => {
          completed++;
          if (completed >= total && !hasError) {
            db.detach();
            res.json({ status: 'OK', message: 'Данные обновлены' });
          }
        };
        db.query(`UPDATE METERS SET METER_NUM=?, SEAL=?, MANFDATE=?, MOUNT_DATE=?, VERIFY_DATE=?, CONTROLER_ID=? WHERE ID=?`,
          [d.meterNum || meterNum, d.seal || null, d.manfDate || null, d.mountDate || null, d.verifyDate || null, d.controllerId || null, dbMeterId], (e) => {
            if (e) return fail('Update meters error', e.message);
            if (d.serviceId && d.serviceId !== oldMeterType) {
              db.query(`SELECT ID FROM METER_TYPES WHERE LOW_QUALITY_GRP_TARIFF = ?`, [d.serviceId], (e2, mt) => {
                if (e2) return fail('Meter type lookup error', e2.message);
                if (mt && mt.length > 0) {
                  db.query(`UPDATE METERS SET METER_TYPE=? WHERE ID=?`, [mt[0].ID, dbMeterId], (e3) => {
                    if (e3) return fail('Meter type update error', e3.message);
                    done();
                  });
                } else { done(); }
              });
            } else { done(); }
          });
        if (!clientId) {
          done();
        } else {
          db.query(`UPDATE CLIENTS SET NAME=?, PHONE=?, MAIL=? WHERE ID=?`,
            [d.fio || null, d.clientPhone || null, d.clientMail || null, clientId], (e) => {
              if (e) return fail('Update client error', e.message);
              done();
            });
        }
        if (d.boilerStatus === undefined || d.boilerStatus === null || String(d.boilerStatus).trim() === '') {
          done();
        } else {
          db.query(`INSERT INTO BOILER_STATUS (ID, STATUS, METER_ID, CREATEDATE) VALUES (GEN_ID(BOILER_STATUS_GEN, 1), ?, ?, ?)`,
            [String(d.boilerStatus).trim(), dbMeterId, createdate], (e) => {
              if (e) return fail('Boiler status error', e.message);
              done();
            });
        }
      };
      if (!meta || meta.length === 0) {
        const metaQueryNum = `
          SELECT M.ID, M.LS, A.CLIENT_ID, M.METER_NUM, M.METER_TYPE
          FROM METERS M
          LEFT JOIN ABONENTS A ON M.LS = A.G_LICSCHET
          WHERE M.METER_NUM = ?
        `;
        db.query(metaQueryNum, [String(d.meterId)], (err2, meta2) => {
          if (err2 || !meta2 || meta2.length === 0) {
            db.detach();
            return res.status(404).json({ error: 'Meter not found', searchedValue: d.meterId });
          }
          processMeter(meta2[0]);
        });
      } else {
        processMeter(meta[0]);
      }
    });
  });
});

app.post('/all-streets', (req, res) => {
  firebird.attach(config, (err, db) => {
    if (err) return res.status(500).json({ error: 'DB connection failed' });
    const query = `
      SELECT RS.ID, 
        CAST(RS.STREET_TYPE AS VARCHAR(50) CHARACTER SET WIN1251) AS STREET_TYPE,
        CAST(RS.STREET AS VARCHAR(100) CHARACTER SET WIN1251) AS STREET_NAME
      FROM RSTREETS RS
      ORDER BY RS.STREET_TYPE, RS.STREET
    `;
    db.query(query, [], (err, result) => {
      db.detach();
      if (err) return res.status(500).json({ error: 'Query failed' });
      res.json(result.map(r => ({
        id: r.ID,
        name: `${r.STREET_TYPE || ''} ${r.STREET_NAME || ''}`.trim()
      })));
    });
  });
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
        M.CONTROLER_ID,
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
        CAST(B.CORPS AS VARCHAR(10) CHARACTER SET WIN1251) AS CORPS,
        (SELECT MAX(MI.CREATEDATE) FROM METERS_IND MI WHERE TRIM(MI.METER_ID) = TRIM(M.METER_NUM)) AS LAST_IND_DATE
      FROM METERS M
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
      INNER JOIN BUILDINGS B ON A.BUILDINGS_ID = B.ID
      INNER JOIN RSTREETS RS ON B.STREET_ID = RS.ID
      WHERE M.CONTROLER_ID = CAST(? AS INTEGER)
      ORDER BY
        M.CONTROLER_ID DESC NULLS LAST,
        RS.STREET_TYPE,
        RS.STREET,
        B.HOUSE,
        A.APPARTS,
        A.LETTER
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
        let lastIndDate = null;
        if (r.LAST_IND_DATE) {
          let d;
          const dateStr = String(r.LAST_IND_DATE).trim();
          if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            if (parts.length === 3) {
              d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
          } else {
            d = new Date(dateStr);
          }
          if (d && !isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            lastIndDate = `${y}-${m}-${day}`;
          }
        }
        return {
          meterId: r.METER_ID,
          controllerId: r.CONTROLER_ID,
          verifyDate: r.VERIFY_DATE,
          buildingsId: r.BUILDINGS_ID,
          streetId: r.STREET_ID,
          streetName: streetName,
          houseName: houseName,
          displayText: `${appartsPart}, ${namePart}${phonePart}`,
          lastIndDate: lastIndDate
        };
      }));
    });
  });
});

app.post('/controllers', (req, res) => {
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'DB connection failed' });
    }
    const query = `SELECT ID, CAST(FIO AS VARCHAR(200) CHARACTER SET WIN1251) AS FIO FROM CONTROLLERS ORDER BY FIO`;
    db.query(query, (err, result) => {
      db.detach();
      if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Query failed' });
      }
      res.json(result);
    });
  });
});

app.post('/all-addresses', (req, res) => {
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const query = `
      SELECT
        M.ID AS METER_ID,
        M.CONTROLER_ID,
        M.VERIFY_DATE,
        CAST(A.APPARTS AS VARCHAR(20) CHARACTER SET WIN1251) AS APPARTS,
        CAST(A.LETTER AS VARCHAR(5) CHARACTER SET WIN1251) AS LETTER,
        A.BUILDINGS_ID,
        CAST(C.NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS CLIENT_NAME,
        CAST(C.PHONE AS VARCHAR(50) CHARACTER SET WIN1251) AS CLIENT_PHONE,
        CAST(RS.STREET_TYPE AS VARCHAR(50) CHARACTER SET WIN1251) AS STREET_TYPE,
        CAST(RS.STREET AS VARCHAR(100) CHARACTER SET WIN1251) AS STREET_NAME,
        RS.ID AS STREET_ID,
        CAST(B.HOUSE AS VARCHAR(10) CHARACTER SET WIN1251) AS HOUSE,
        CAST(B.CORPS AS VARCHAR(10) CHARACTER SET WIN1251) AS CORPS,
        (SELECT MAX(MI.CREATEDATE) FROM METERS_IND MI WHERE TRIM(MI.METER_ID) = TRIM(M.METER_NUM)) AS LAST_IND_DATE
      FROM METERS M
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
      INNER JOIN BUILDINGS B ON A.BUILDINGS_ID = B.ID
      INNER JOIN RSTREETS RS ON B.STREET_ID = RS.ID
      ORDER BY
        M.CONTROLER_ID DESC NULLS LAST,
        RS.STREET_TYPE,
        RS.STREET,
        B.HOUSE,
        A.APPARTS,
        A.LETTER
    `;     
    db.query(query, [], (err, result) => {
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
        let lastIndDate = null;
        if (r.LAST_IND_DATE) {
          let d;
          const dateStr = String(r.LAST_IND_DATE).trim();
          if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            if (parts.length === 3) {
              d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
          } else {
            d = new Date(dateStr);
          }
          if (d && !isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            lastIndDate = `${y}-${m}-${day}`;
          }
        }
        return {
          meterId: r.METER_ID,
          controllerId: r.CONTROLER_ID,
          verifyDate: r.VERIFY_DATE,
          buildingsId: r.BUILDINGS_ID,
          streetId: r.STREET_ID,
          streetName: streetName,
          houseName: houseName,
          displayText: `${appartsPart}, ${namePart}${phonePart}`,
          lastIndDate: lastIndDate
        };
      }));
    });
  });
});

app.post('/update-meter-controller', (req, res) => {
  const { meterId, controllerId } = req.body;
  if (!meterId) {
    return res.status(400).json({ error: 'meterId required' });
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'DB connection failed' });
    }
    const updateQuery = `UPDATE METERS SET CONTROLER_ID = ? WHERE ID = ?`;
    const safeControllerId = controllerId === undefined ? null : controllerId;
    db.query(updateQuery, [safeControllerId, meterId], (err) => {
      db.detach();
      if (err) {
        console.error('Update error:', err);
        return res.status(500).json({ error: 'Update failed', details: err.message });
      }
      res.json({ status: 'OK', message: 'Контролёр обновлён' });
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
  const { serviceId } = req.body || {};
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
            (ID, ACT_NO, ACT_BDATE, ACT_EDATE, ACT_DATE, SERVICE_ID, CREATEDATE)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(
          insertQuery,
          [newId, newActNo, bdateStr, edateStr, actDateStr, serviceId || null, actDateStr],
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

app.post('/update-act-service', (req, res) => {
  const { actId, serviceId } = req.body;
  if (!actId) {
    return res.status(400).json({ error: 'actId required' });
  }
  firebird.attach(config, (err, db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const updateQuery = `
      UPDATE BUILD_MAINT_ACTS
      SET SERVICE_ID = ?
      WHERE ID = ?
    `;
    db.query(updateQuery, [serviceId || null, actId], (err) => {
      db.detach();
      if (err) {
        console.error('Update error:', err);
        return res.status(500).json({ error: 'Update failed', details: err.message });
      }
      res.json({ status: 'OK', message: 'SERVICE_ID updated' });
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
        if (r.APPARTS == null) {
          return {
            id: r.ID,
            house: `${letterPart}`.trim(),
            g_licschet: r.G_LICSCHET,
            controllerId: r.CONTROLER_ID
          };
        } else {
          return {
            id: r.ID,
            house: `кв. ${r.APPARTS}${letterPart}`.trim(),
            g_licschet: r.G_LICSCHET,
            controllerId: r.CONTROLER_ID
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
        M.NAME,
        M.SEAL,
        M.MANFDATE,
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
          name: r.NAME,
          seal: r.SEAL,
          manfDate: r.MANFDATE,
          mountDate: null,
          verifyDate: null,
          groupName: null,
          clientName: null
        });
      }
      res.json({
        found: true,
        meterNum: result[0].METER_NUM,
        name: result[0].NAME,
        seal: result[0].SEAL,
        manfDate: result[0].MANFDATE,
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
        M.NAME,
        M.SEAL,
        M.MANFDATE,
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
        name: r.NAME,
        seal: r.SEAL,
        manfDate: r.MANFDATE,
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
        M.NAME,
        M.SEAL,
        M.MANFDATE,
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
          name: null,
          seal: null,
          manfDate: null, 
          mountDate: null,
          verifyDate: null,
          groupName: null,
          clientName: null
        });        
      }
      res.json({
        found: true,
        meterNum: result[0].METER_NUM,
        name: result[0].NAME,
        seal: result[0].SEAL,
        manfDate: result[0].MANFDATE,
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
        M.NAME,
        M.SEAL,
        M.MANFDATE,
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
        name: r.NAME,
        seal: r.SEAL,
        manfDate: r.MANFDATE,
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
  const { ph, meter_id, licschet, abonent_name, description, controllerId } = req.body;
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
  let safeControllerId = null;
  if (controllerId !== undefined && controllerId !== null && String(controllerId).trim() !== '') {
    const parsed = parseInt(controllerId, 10);
    if (!isNaN(parsed)) safeControllerId = parsed;
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
      const insertQuery = `INSERT INTO METERS_IND (ID, PH, METER_ID, CREATEDATE, ACT_ID, CONTROLLER_ID) VALUES (GEN_ID(METERS_IND_GEN, 1), ?, ?, ?, ?, ?)`;
      db.query(insertQuery, [ph, meterNum, createdate, actId, safeControllerId], (err) => {
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

app.post('/save-boiler-status', (req, res) => {
  const body = req.body || {};
  const { status, meterId } = body;
  if (!status) {
    return res.status(400).json({ error: 'status required'});
  }
  const createdate = new Date().toISOString().replace('T', ' ').slice(0,19);
  firebird.attach(config, (err,db) => {
    if (err) {
      console.error('DB connect error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const insertQuery = `
      INSERT INTO BOILER_STATUS (ID, STATUS, METER_ID, CREATEDATE)
      VALUES (GEN_ID(BOILER_STATUS_GEN, 1), ?, ?, ?)
    `;
    db.query(insertQuery, [status, meterId || null, createdate], (err) => {
      db.detach();
      if (err) {
        console.error('insert error', err);
        return res.status(500).json({ error: 'insert error', details: err.message});
      }
      res.json({ status: 'OK', message: 'boiler status saved'});
    });
  });
});

app.post('/controller-offline-package', (req, res) => {
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
        M.CONTROLER_ID,
        M.VERIFY_DATE,
        M.LS,
        M.METER_NUM,
        M.NAME AS METER_NAME,
        M.SEAL,
        M.MANFDATE,
        M.MOUNT_DATE,
        M.METER_TYPE,
        A.APPARTS,
        A.LETTER,
        A.BUILDINGS_ID,
        A.G_LICSCHET,
        A.CLIENT_ID,
        CAST(C.NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS CLIENT_NAME,
        CAST(C.PHONE AS VARCHAR(50) CHARACTER SET WIN1251) AS CLIENT_PHONE,
        CAST(RS.STREET_TYPE AS VARCHAR(50) CHARACTER SET WIN1251) AS STREET_TYPE,
        CAST(RS.STREET AS VARCHAR(100) CHARACTER SET WIN1251) AS STREET_NAME,
        RS.ID AS STREET_ID,
        CAST(B.HOUSE AS VARCHAR(10) CHARACTER SET WIN1251) AS HOUSE,
        CAST(B.CORPS AS VARCHAR(10) CHARACTER SET WIN1251) AS CORPS,
        B.ID AS BUILDING_ID,
        IND.LAST_IND_DATE,
        MT.ID AS METER_TYPE_ID,
        CAST(MT.NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS METER_TYPE_NAME,
        MT.LOW_QUALITY_GRP_TARIFF AS SERVICE_ID,
        CAST(S.GROUP_NAME AS VARCHAR(100) CHARACTER SET WIN1251) AS SERVICE_GROUP_NAME
      FROM METERS M
      INNER JOIN ABONENTS A ON M.LS = A.G_LICSCHET
      LEFT JOIN CLIENTS C ON A.CLIENT_ID = C.ID
      INNER JOIN BUILDINGS B ON A.BUILDINGS_ID = B.ID
      INNER JOIN RSTREETS RS ON B.STREET_ID = RS.ID
      LEFT JOIN (
        SELECT METER_ID, MAX(CREATEDATE) AS LAST_IND_DATE
        FROM METERS_IND
        GROUP BY METER_ID
      ) IND ON TRIM(IND.METER_ID) = TRIM(M.METER_NUM)
      LEFT JOIN METER_TYPES MT ON M.METER_TYPE = MT.ID
      LEFT JOIN SERVICES S ON MT.LOW_QUALITY_GRP_TARIFF = S.ID
      WHERE M.CONTROLER_ID = CAST(? AS INTEGER)
    `;    
    const ctrlIdNum = parseInt(controllerId, 10);
    if (isNaN(ctrlIdNum)) {
      db.detach();
      return res.status(400).json({ error: 'Invalid controllerId' });
    }    
    db.query(query, [ctrlIdNum], (err, result) => {
      if (err) {
        console.error('🔥 Firebird Query Error in /controller-offline-package:', err.message);
        db.detach();
        return res.status(500).json({ error: 'Failed to build controller offline package: ' + err.message });
      }
      db.detach();      
      const packageData = {
        meters: [], abonents: [], clients: [], buildings: [], streets: [], meterTypes: [], services: []
      };
      const streetMap = new Map();
      const buildingMap = new Map();
      const clientMap = new Map();
      const abonentMap = new Map();
      const meterTypeMap = new Map();
      const serviceMap = new Map();      
      result.forEach(r => {
        if (r.STREET_ID && !streetMap.has(r.STREET_ID)) {
          streetMap.set(r.STREET_ID, { ID: r.STREET_ID, STREET_TYPE: r.STREET_TYPE, STREET: r.STREET_NAME });
        }
        if (r.BUILDING_ID && !buildingMap.has(r.BUILDING_ID)) {
          buildingMap.set(r.BUILDING_ID, { ID: r.BUILDING_ID, HOUSE: r.HOUSE, CORPS: r.CORPS, STREET_ID: r.STREET_ID });
        }
        if (r.CLIENT_ID && !clientMap.has(r.CLIENT_ID)) {
          clientMap.set(r.CLIENT_ID, { ID: r.CLIENT_ID, NAME: r.CLIENT_NAME, PHONE: r.CLIENT_PHONE });
        }
        if (r.G_LICSCHET && !abonentMap.has(r.G_LICSCHET)) {
          abonentMap.set(r.G_LICSCHET, { 
            G_LICSCHET: r.G_LICSCHET, CLIENT_ID: r.CLIENT_ID, BUILDINGS_ID: r.BUILDING_ID, 
            APPARTS: r.APPARTS, LETTER: r.LETTER 
          });
        }
        if (r.METER_TYPE_ID && !meterTypeMap.has(r.METER_TYPE_ID)) {
          meterTypeMap.set(r.METER_TYPE_ID, { 
            ID: r.METER_TYPE_ID, 
            NAME: r.METER_TYPE_NAME, 
            LOW_QUALITY_GRP_TARIFF: r.SERVICE_ID 
          });
        }
        if (r.SERVICE_ID && !serviceMap.has(r.SERVICE_ID)) {
          serviceMap.set(r.SERVICE_ID, { ID: r.SERVICE_ID, GROUP_NAME: r.SERVICE_GROUP_NAME });
        }        
        let lastIndDate = null;
        if (r.LAST_IND_DATE) {
          let d;
          if (typeof r.LAST_IND_DATE === 'string' && r.LAST_IND_DATE.includes('.')) {
            const parts = r.LAST_IND_DATE.split('.');
            if (parts.length === 3) {
              d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
          } else {
            d = new Date(r.LAST_IND_DATE);
          }          
          if (d && !isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            lastIndDate = `${y}-${m}-${day}`;
          }
        }
        packageData.meters.push({
          ID: r.METER_ID,
          CONTROLER_ID: r.CONTROLER_ID,
          VERIFY_DATE: r.VERIFY_DATE,
          LS: r.LS,
          METER_NUM: r.METER_NUM,
          NAME: r.METER_NAME,
          SEAL: r.SEAL,
          MANFDATE: r.MANFDATE,
          MOUNT_DATE: r.MOUNT_DATE,
          METER_TYPE: r.METER_TYPE,
          LAST_IND_DATE: lastIndDate
        });
      });      
      packageData.streets = Array.from(streetMap.values());
      packageData.buildings = Array.from(buildingMap.values());
      packageData.clients = Array.from(clientMap.values());
      packageData.abonents = Array.from(abonentMap.values());
      packageData.meterTypes = Array.from(meterTypeMap.values());
      packageData.services = Array.from(serviceMap.values());      
      res.json(packageData);
    });
  });
});

app.post('/controller-history', (req, res) => {
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoDate = thirtyDaysAgo.toISOString().split('T')[0]; 
    const query = `
      SELECT FIRST 30
        a.ACT_NO, 
        a.ACT_DATE, 
        m.METER_NUM, 
        m.VERIFY_DATE, 
        ind.PH,
        CAST(s.SHORT_NAME AS VARCHAR(200) CHARACTER SET WIN1251) AS SERVICE_NAME, 
        CAST(st.STREET_TYPE AS VARCHAR(50) CHARACTER SET WIN1251) AS STREET_TYPE,
        CAST(st.STREET AS VARCHAR(100) CHARACTER SET WIN1251) AS STREET_NAME,
        CAST(b.HOUSE AS VARCHAR(10) CHARACTER SET WIN1251) AS HOUSE, 
        CAST(b.CORPS AS VARCHAR(10) CHARACTER SET WIN1251) AS CORPS, 
        CAST(ab.APPARTS AS VARCHAR(20) CHARACTER SET WIN1251) AS APPARTS, 
        CAST(ab.LETTER AS VARCHAR(5) CHARACTER SET WIN1251) AS LETTER
      FROM METERS_IND ind
      JOIN METERS m ON m.METER_NUM = ind.METER_ID
      JOIN BUILD_MAINT_ACTS a ON a.ID = ind.ACT_ID
      LEFT JOIN ABONENTS ab ON ab.G_LICSCHET = m.LS
      LEFT JOIN BUILDINGS b ON b.ID = ab.BUILDINGS_ID
      LEFT JOIN RSTREETS st ON st.ID = b.STREET_ID
      LEFT JOIN METER_TYPES mt ON mt.ID = m.METER_TYPE
      LEFT JOIN SERVICES s ON s.ID = mt.LOW_QUALITY_GRP_TARIFF
      WHERE ind.CONTROLLER_ID = ? 
        AND (ind.IS_DELETED = 0 OR ind.IS_DELETED IS NULL)
        AND CAST(a.ACT_DATE AS DATE) >= CAST(? AS DATE)
      ORDER BY a.ACT_DATE DESC, ind.ID DESC
    `;    
    db.query(query, [ctrlIdNum, isoDate], (err, result) => {
      db.detach();         
      if (err) {
        console.error('History query error:', err);
        return res.status(500).json({ error: 'Query failed', details: err.message });
      }        
      const history = result.map(r => {
        const streetName = `${r.STREET_TYPE || ''} ${r.STREET_NAME || ''}`.trim();
        const corpsPart = r.CORPS ? ` ${r.CORPS}` : '';
        const houseName = `${r.HOUSE || ''}${corpsPart}`.trim();
        const letterPart = r.LETTER ? ` ${r.LETTER}` : '';
        const appartsName = r.APPARTS ? `кв. ${r.APPARTS}${letterPart}` : letterPart.trim();            
        let addressStr = 'адрес не найден';
        if (streetName && houseName) {
          addressStr = `${streetName}, д. ${houseName}${appartsName ? ', ' + appartsName : ''}`;
        }   
        const formatDate = (dateVal) => {
          if (!dateVal) return null;
          const d = new Date(dateVal);
          if (isNaN(d.getTime())) return dateVal;
          const pad = (n) => String(n).padStart(2, '0');
          return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
        };    
        return {
          actNo: r.ACT_NO,
          actDate: formatDate(r.ACT_DATE),
          meterNum: r.METER_NUM,
          ph: r.PH !== null && r.PH !== undefined 
            ? Number(r.PH).toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) 
            : null,
          verifyDate: formatDate(r.VERIFY_DATE),
          serviceName: r.SERVICE_NAME || 'Не указана',
          address: addressStr
        };
      });   
      res.json(history);
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
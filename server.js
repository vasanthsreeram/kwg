const express = require('express');
const path = require('path');
const app = express(); 
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
// var test = "bro";
const port = process.env.PORT || 3000;

// console.log(process.env.password ,process.env.server )

// Serve static files (e.g., HTML, CSS, JS) from a 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize SQLite Database
const dbPath = '/tmp/database.sqlite'; // Use /tmp directory inside container
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS GridGame (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      UID INTEGER,
      Duration REAL,
      Date TEXT,
      Condition INTEGER,
      Scale TEXT,
      EnvOrder TEXT,
      tscollect TEXT,
      xcollect TEXT,
      ycollect TEXT,
      zcollect TEXT,
      zcollectScaled TEXT,
      BonusLevel TEXT,
      StarArray TEXT,
      TesterNotes TEXT
    )`, (err) => {
      if (err) {
        console.error('Error creating table', err.message);
      } else {
        console.log('GridGame table ready.');
      }
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Define route for /sm
app.get('/sm', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Serve the index.html file with condition query parameter for /rg
app.get('/rg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Add API endpoint for stats
app.get('/api/get-stats', (req, res) => {
  db.get('SELECT COUNT(*) AS records FROM GridGame', [], (err, row) => {
    if (err) {
      console.error('Error fetching stats:', err.message);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
    res.json({ records: row ? row.records : 0 });
  });
});

// Add API endpoint for debug data
app.get('/api/debug-data', (req, res) => {
  db.all('SELECT * FROM GridGame ORDER BY Date DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching debug data:', err.message);
      return res.status(500).json({ error: 'Failed to fetch debug data' });
    }
    res.json(rows);
  });
});

app.post('/submit-data', (req, res) => {
  const data = req.body;
  console.log("Received data:", data);

  const query = `INSERT INTO GridGame (
    UID, Duration, Date, Condition, Scale, EnvOrder, tscollect, xcollect, ycollect, zcollect, zcollectScaled, BonusLevel, StarArray, TesterNotes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    data.uid,
    data.duration,
    new Date().toISOString(), // Store date as ISO string
    data.condition,
    JSON.stringify(data.scale),
    JSON.stringify(data.envOrder),
    JSON.stringify(data.tscollect),
    JSON.stringify(data.xcollect),
    JSON.stringify(data.ycollect),
    JSON.stringify(data.zcollect),
    JSON.stringify(data.zcollectScaled),
    JSON.stringify(data.bonusLevel),
    JSON.stringify(data.starArray),
    JSON.stringify(data.testerNotes)
  ];

  db.run(query, params, function(err) { // Use function() to access 'this'
    if (err) {
      console.error('Error saving data to DB:', err.message);
      return res.status(500).send({ status: 'Error saving data to database' });
    }
    console.log(`Inserted final data in DB with rowid ${this.lastID}`);
  });
  // Response is sent inside the db.run callback
  
  // Response is sent inside the db.run callback
  });
  
  // Add endpoint for CSV data export
  app.get('/admin-out', (req, res) => {
    db.all('SELECT * FROM GridGame ORDER BY Date DESC', [], (err, rows) => {
      if (err) {
        console.error('Error fetching data for CSV:', err.message);
        return res.status(500).json({ error: 'Failed to fetch data' });
      }
  
      if (!rows || rows.length === 0) {
        return res.status(200).send('No data available');
      }
  
      // Dynamically build headers and process rows
      const headersSet = new Set();
      const processedRows = [];
  
      rows.forEach(row => {
        const flatRow = {};
        for (const key in row) {
          let value = row[key];
          try {
            const parsed = JSON.parse(value);
            // Attempt to flatten arrays and simple objects
            if (Array.isArray(parsed)) {
               // Limit flattening for arrays to avoid excessive columns
              const maxFlatten = 10;
              parsed.slice(0, maxFlatten).forEach((item, idx) => {
                const colName = `${key}_${idx}`;
                flatRow[colName] = typeof item === 'object' ? JSON.stringify(item) : item;
                headersSet.add(colName);
              });
               if (parsed.length > maxFlatten) {
                   const colName = `${key}_extra`;
                   flatRow[colName] = JSON.stringify(parsed.slice(maxFlatten));
                   headersSet.add(colName);
               }
            } else if (parsed && typeof parsed === 'object' && Object.keys(parsed).length < 15) { // Limit object flattening
              for (const subKey in parsed) {
                const colName = `${key}_${subKey}`;
                flatRow[colName] = typeof parsed[subKey] === 'object' ? JSON.stringify(parsed[subKey]) : parsed[subKey];
                headersSet.add(colName);
              }
            } else {
               // Keep original value if not simple array/object or if parsing failed initially
               flatRow[key] = value; // Use original value
               headersSet.add(key);
            }
          } catch {
            // Not JSON or complex structure, keep as is
            flatRow[key] = value;
            headersSet.add(key);
          }
        }
        processedRows.push(flatRow);
      });
  
      // Ensure consistent column order (optional but recommended)
      const baseColumns = ['id', 'UID', 'Duration', 'Date', 'Condition']; // Add other non-JSON base columns
      const sortedHeaders = Array.from(headersSet).sort((a, b) => {
          const aBase = baseColumns.includes(a);
          const bBase = baseColumns.includes(b);
          if (aBase && !bBase) return -1;
          if (!aBase && bBase) return 1;
          return a.localeCompare(b); // Alphabetical for others
      });
  
      const headers = sortedHeaders.map(h => ({ id: h, title: h }));
  
      const csvStringifier = createCsvStringifier({ header: headers });
  
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="gridgame_data.csv"');
  
      res.write(csvStringifier.getHeaderString());
      res.write(csvStringifier.stringifyRecords(processedRows));
      res.end();
    });
  });

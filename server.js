const express = require('express');
const path = require('path');
const app = express(); 
const bodyParser = require('body-parser');
require('dotenv').config();
const sql = require('mssql');
// var test = "bro";
const port = process.env.PORT || 3000;

// console.log(process.env.password ,process.env.server )

// Serve static files (e.g., HTML, CSS, JS) from a 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.PASSWORD,
  server: process.env.SERVER,
  database: process.env.DB_DATABASE,
  port: 1433,
  options: {
      encrypt: true, // Necessary for Azure SQL
      trustServerCertificate: false // Change to true if on a local environment
  }
}

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
app.get('/api/get-stats', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT COUNT(*) AS records FROM GridGame');
    res.json({ records: result.recordset[0].records });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Add API endpoint for debug data
app.get('/api/debug-data', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT * FROM GridGame');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching debug data:', error);
    res.status(500).json({ error: 'Failed to fetch debug data' });
  }
});

app.post('/submit-data', async (req, res) => {
  const data = req.body;
  console.log("data is here", data);
  
  try {
    console.log("dbconfig", dbConfig);
    
    try {
      const pool = await sql.connect(dbConfig);
      const query = `INSERT INTO GridGame (UID, Duration, Date, Condition, Scale, EnvOrder, tscollect, xcollect, ycollect, zcollect, zcollectScaled, BonusLevel, StarArray, TesterNotes) 
      VALUES (@uid, @duration, @date, @condition, @scale, @envOrder, @tscollect, @xcollect, @ycollect, @zcollect, @zcollectScaled, @bonusLevel, @starArray, @testerNotes)`;
      data.date = new Date();
      
      console.log(data.uid, "data exists");
      await pool.request()
        .input('uid', sql.Int, data.uid)
        .input('duration', sql.Float, data.duration)
        .input('date', sql.DateTime, new Date(data.date))
        .input('condition', sql.Int, data.condition)
        .input('scale', sql.NVarChar(sql.MAX), JSON.stringify(data.scale))
        .input('envOrder', sql.NVarChar(sql.MAX), JSON.stringify(data.envOrder))
        .input('tscollect', sql.NVarChar(sql.MAX), JSON.stringify(data.tscollect))
        .input('xcollect', sql.NVarChar(sql.MAX), JSON.stringify(data.xcollect))
        .input('ycollect', sql.NVarChar(sql.MAX), JSON.stringify(data.ycollect))
        .input('zcollect', sql.NVarChar(sql.MAX), JSON.stringify(data.zcollect))
        .input('zcollectScaled', sql.NVarChar(sql.MAX), JSON.stringify(data.zcollectScaled))
        .input('bonusLevel', sql.NVarChar(sql.MAX), JSON.stringify(data.bonusLevel))
        .input('starArray', sql.NVarChar(sql.MAX), JSON.stringify(data.starArray))
        .input('testerNotes', sql.NVarChar(sql.MAX), JSON.stringify(data.testerNotes))
        .query(query);
      
      console.log('Inserted final data in DB');
      // document.getElementById is not available in Node.js - this code was likely mistakenly copied from client-side code
    } catch (error) {
      console.log("dbconfig", dbConfig);
      console.log('Error saving data to DB:', error);
      return res.status(500).send({ status: 'Error saving data to database' });
    }
  } catch (error) {
    console.log("dbconfig", dbConfig);
    return res.status(500).send({ status: 'Error processing request' });
  }
  
  res.send({ status: 'Data successfully saved' });
});

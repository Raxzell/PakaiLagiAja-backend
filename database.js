const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false } 
});

db.connect((err) => {
  if (err) {
    console.error('Gagal konek ke database:', err.message);
    return;
  }
  console.log('Berhasil konek ke database MySQL!');
});

module.exports = db;
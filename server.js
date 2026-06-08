const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const db = require('./database'); // import database.js

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (nanti kita isi)
const authRoutes = require('./routes/auth');
const barangRoutes = require('./routes/barang');
app.use('/api/auth', authRoutes);
app.use('/api/barang', barangRoutes);

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});


const transaksiRoutes = require('./routes/transaksi');
app.use('/api/transaksi', transaksiRoutes);
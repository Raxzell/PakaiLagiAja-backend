const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const db = require('./database');

const app = express();

app.use(cors({
  origin: '*', // Atau ganti sama link vercel lu, misal: 'https://pakai-lagi-aja.vercel.app'
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // <--- Pastikan DELETE ada di sini!
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Tetap simpan ini buat foto lama yang sudah terlanjur di-upload ke folder lokal
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const barangRoutes = require('./routes/barang');
const transaksiRoutes = require('./routes/transaksi');

app.use('/api/auth', authRoutes);
app.use('/api/barang', barangRoutes);
app.use('/api/transaksi', transaksiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));

const db = require('../database');
const multer = require('multer');
const path = require('path');

// Setup penyimpanan foto
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// TAMBAH BARANG
const tambahBarang = (req, res) => {
//   console.log('body:', req.body);
//   console.log('file:', req.file);
  
  const { nama, kategori, jenis, kondisi, deskripsi } = req.body;
  const foto = req.file ? req.file.filename : null;
  const user_id = req.body.user_id;

//   console.log('values:', [nama, kategori, jenis, kondisi, deskripsi, foto, 'Tersedia', user_id]);

  db.query(
    'INSERT INTO barang (nama, kategori, jenis, kondisi, deskripsi, foto, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nama, kategori, jenis, kondisi, deskripsi, foto, 'Tersedia', user_id],
    (err, result) => {
    //   console.log('DB error:', err);
    //   console.log('DB result:', result);
      if (err) return res.status(500).json({ message: 'Gagal tambah barang', error: err.message });
      res.status(201).json({ message: 'Barang berhasil ditambahkan!' });
    }
  );
};

// AMBIL SEMUA BARANG
const getBarang = (req, res) => {
  db.query(
    'SELECT barang.*, users.nama as nama_pemilik FROM barang LEFT JOIN users ON barang.user_id = users.id ORDER BY barang.created_at DESC',
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Gagal ambil data barang' });
      res.json(results);
    }
  );
};

module.exports = { upload, tambahBarang, getBarang };

// AMBIL BARANG MILIK USER
const getBarangUser = (req, res) => {
  const { user_id } = req.params;
  db.query(
    'SELECT * FROM barang WHERE user_id = ? ORDER BY created_at DESC',
    [user_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Gagal ambil data barang user' });
      res.json(results);
    }
  );
};

module.exports = { upload, tambahBarang, getBarang, getBarangUser };
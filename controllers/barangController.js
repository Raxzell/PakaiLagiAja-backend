const db = require('../database');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ==============================
// KONFIGURASI CLOUDINARY
// ==============================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==============================
// SETUP UPLOAD FOTO KE CLOUDINARY
// ==============================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pakailagiaja',
    allowed_formats: ['jpg', 'png', 'jpeg']
  }
});

const upload = multer({ storage });

// ==============================
// TAMBAH BARANG
// ==============================
const tambahBarang = (req, res) => {
  const { nama, kategori, jenis, kondisi, deskripsi, user_id } = req.body;

  // Kalau ada foto, req.file.path akan berisi URL Cloudinary
  const foto = req.file ? req.file.path : null;

  db.query(
    'INSERT INTO barang (nama, kategori, jenis, kondisi, deskripsi, foto, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nama, kategori, jenis, kondisi, deskripsi, foto, 'Tersedia', user_id],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: 'Gagal tambah barang',
          error: err.message
        });
      }

      res.status(201).json({
        message: 'Barang berhasil ditambahkan!',
        id: result.insertId
      });
    }
  );
};

// ==============================
// AMBIL SEMUA BARANG
// ==============================
const getBarang = (req, res) => {
  db.query(
    'SELECT barang.*, users.nama as nama_pemilik FROM barang LEFT JOIN users ON barang.user_id = users.id ORDER BY barang.created_at DESC',
    (err, results) => {
      if (err) {
        return res.status(500).json({
          message: 'Gagal ambil data barang',
          error: err.message
        });
      }

      res.json(results);
    }
  );
};

// ==============================
// AMBIL BARANG MILIK USER
// ==============================
const getBarangUser = (req, res) => {
  const { user_id } = req.params;

  db.query(
    'SELECT * FROM barang WHERE user_id = ? ORDER BY created_at DESC',
    [user_id],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          message: 'Gagal ambil data barang user',
          error: err.message
        });
      }

      res.json(results);
    }
  );
};

// ==============================
// AMBIL LIFECYCLE BARANG
// ==============================
const getLifecycleBarang = (req, res) => {
  const { barang_id } = req.params;

  db.query(
    `SELECT barang.created_at as tanggal_tambah,
            transaksi.tanggal_pinjam,
            transaksi.tanggal_kembali,
            transaksi.rating,
            users.nama as nama_peminjam
     FROM barang
     LEFT JOIN transaksi 
       ON barang.id = transaksi.barang_id 
       AND transaksi.status != 'Ditolak'
     LEFT JOIN users 
       ON transaksi.peminjam_id = users.id
     WHERE barang.id = ?
     ORDER BY transaksi.created_at ASC`,
    [barang_id],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          message: 'Gagal ambil lifecycle',
          error: err.message
        });
      }

      res.json(results);
    }
  );
};

// ==============================
// AMBIL BARANG GRATIS
// ==============================
const ambilGratis = (req, res) => {
  const { barang_id, user_id } = req.body;

  db.query('SELECT * FROM barang WHERE id = ?', [barang_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Server error',
        error: err.message
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Barang tidak ditemukan'
      });
    }

    const barang = results[0];

    if (barang.jenis !== 'Gratis') {
      return res.status(400).json({
        message: 'Barang ini bukan jenis Gratis'
      });
    }

    if (barang.user_id == user_id) {
      return res.status(400).json({
        message: 'Kamu tidak bisa mengambil barangmu sendiri!'
      });
    }

    // Hapus transaksi terkait dulu supaya tidak kena foreign key
    db.query('DELETE FROM transaksi WHERE barang_id = ?', [barang_id], (err) => {
      if (err) {
        return res.status(500).json({
          message: 'Gagal hapus transaksi',
          error: err.message
        });
      }

      db.query('DELETE FROM barang WHERE id = ?', [barang_id], (err) => {
        if (err) {
          return res.status(500).json({
            message: 'Gagal hapus barang',
            error: err.message
          });
        }

        res.json({
          message: 'Barang berhasil diambil!'
        });
      });
    });
  });
};

// ==============================
// HAPUS BARANG
// ==============================
const hapusBarang = (req, res) => {
  const { barang_id, user_id } = req.body;

  db.query('SELECT * FROM barang WHERE id = ?', [barang_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Server error',
        error: err.message
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Barang tidak ditemukan'
      });
    }

    const barang = results[0];

    if (barang.user_id != user_id) {
      return res.status(403).json({
        message: 'Kamu bukan pemilik barang ini!'
      });
    }

    if (barang.status === 'Dipinjam') {
      return res.status(400).json({
        message: 'Barang sedang dipinjam, tidak bisa dihapus!'
      });
    }

    // Hapus transaksi terkait dulu
    db.query('DELETE FROM transaksi WHERE barang_id = ?', [barang_id], (err) => {
      if (err) {
        return res.status(500).json({
          message: 'Gagal hapus transaksi',
          error: err.message
        });
      }

      db.query('DELETE FROM barang WHERE id = ?', [barang_id], (err) => {
        if (err) {
          return res.status(500).json({
            message: 'Gagal hapus barang',
            error: err.message
          });
        }

        res.json({
          message: 'Barang berhasil dihapus!'
        });
      });
    });
  });
};

// ==============================
// EXPORT
// ==============================
module.exports = {
  upload,
  tambahBarang,
  getBarang,
  getBarangUser,
  getLifecycleBarang,
  ambilGratis,
  hapusBarang
};

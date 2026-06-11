const db = require('../database');
const bcrypt = require('bcrypt');

// REGISTER
const register = (req, res) => {
  const { nama, email, password, nomor_telepon } = req.body;

  // Cek apakah email sudah terdaftar
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (results.length > 0) return res.status(400).json({ message: 'Email sudah terdaftar' });

    // Enkripsi password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ message: 'Gagal enkripsi password' });

      // Simpan user baru ke database (dengan nomor_telepon jika ada kolom)
      db.query(
        'INSERT INTO users (nama, email, password, role, nomor_telepon) VALUES (?, ?, ?, ?, ?)',
        [nama, email, hashedPassword, nomor_telepon || null],
        (err, result) => {
          if (err) {
            // Fallback jika kolom nomor_telepon belum ada
            db.query(
              'INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, ?)',
              [nama, email, hashedPassword, role || 'donatur'],
              (err2, result2) => {
                if (err2) return res.status(500).json({ message: 'Gagal register' });
                res.status(201).json({ message: 'Register berhasil!' });
              }
            );
            return;
          }
          res.status(201).json({ message: 'Register berhasil!' });
        }
      );
    });
  });
};

// LOGIN
const login = (req, res) => {
  const { email, password } = req.body;

  // Cari user berdasarkan email
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (results.length === 0) return res.status(400).json({ message: 'Email tidak ditemukan' });

    const user = results[0];

    // Bandingkan password dengan yang di database
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!isMatch) return res.status(400).json({ message: 'Password salah' });

      res.json({
        message: 'Login berhasil!',
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          nomor_telepon: user.nomor_telepon || null
        }
      });
    });
  });
};

const getTotalUsers = (req, res) => {
  db.query('SELECT COUNT(*) AS total FROM users', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Gagal hitung user', error: err.message });
    }
    // Mengembalikan angka total user asli dari hasil query database
    res.json({ total: results[0].total });
  });
};


module.exports = { register, login, getTotalUsers };

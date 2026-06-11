const db = require('../database');
const bcrypt = require('bcrypt');

// REGISTER
const register = (req, res) => {
  const { nama, email, password, nomor_telepon } = req.body;

  // Cek apakah email sudah terdaftar
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Server error',
        error: err.message
      });
    }

    if (results.length > 0) {
      return res.status(400).json({
        message: 'Email sudah terdaftar'
      });
    }

    // Enkripsi password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({
          message: 'Gagal enkripsi password',
          error: err.message
        });
      }

      // Simpan user baru ke database
      db.query(
        'INSERT INTO users (nama, email, password, nomor_telepon) VALUES (?, ?, ?, ?)',
        [nama, email, hashedPassword, nomor_telepon || null],
        (err, result) => {
          if (err) {
            return res.status(500).json({
              message: 'Gagal register',
              error: err.message
            });
          }

          res.status(201).json({
            message: 'Register berhasil!'
          });
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
    if (err) {
      return res.status(500).json({
        message: 'Server error',
        error: err.message
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        message: 'Email tidak ditemukan'
      });
    }

    const user = results[0];

    // Bandingkan password dengan yang di database
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({
          message: 'Server error',
          error: err.message
        });
      }

      if (!isMatch) {
        return res.status(400).json({
          message: 'Password salah'
        });
      }

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

// TOTAL USERS
const getTotalUsers = (req, res) => {
  db.query('SELECT COUNT(*) AS total FROM users', (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Gagal hitung user',
        error: err.message
      });
    }

    res.json({
      total: results[0].total
    });
  });
};

module.exports = {
  register,
  login,
  getTotalUsers
};

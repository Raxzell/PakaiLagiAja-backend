const db = require('../database');
const bcrypt = require('bcrypt');

// REGISTER
const register = (req, res) => {
  const { nama, email, password, role } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (results.length > 0) return res.status(400).json({ message: 'Email sudah terdaftar' });

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ message: 'Gagal enkripsi password' });

      db.query(
        'INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, ?)',
        [nama, email, hashedPassword, role || 'donatur'],
        (err, result) => {
          if (err) return res.status(500).json({ message: 'Gagal register' });

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

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (results.length === 0) return res.status(400).json({ message: 'Email tidak ditemukan' });

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!isMatch) return res.status(400).json({ message: 'Password salah' });

      res.json({
        message: 'Login berhasil!',
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          role: user.role
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

const db = require('../database');

// AJUKAN PINJAMAN
const ajukanPinjam = (req, res) => {
  const { barang_id, peminjam_id, catatan_peminjam, tanggal_ambil, tanggal_kembali_rencana } = req.body;

  db.query('SELECT * FROM barang WHERE id = ?', [barang_id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (results.length === 0) return res.status(404).json({ message: 'Barang tidak ditemukan' });
    
    const barang = results[0];

    if (barang.user_id == peminjam_id) {
      return res.status(400).json({ message: 'Kamu tidak bisa meminjam barangmu sendiri!' });
    }

    if (barang.status !== 'Tersedia') {
      return res.status(400).json({ message: 'Barang sedang tidak tersedia' });
    }

    db.query(
      'INSERT INTO transaksi (barang_id, peminjam_id, status, tanggal_pinjam, catatan_peminjam, tanggal_ambil, tanggal_kembali_rencana) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [barang_id, peminjam_id, 'Menunggu', new Date(), catatan_peminjam || null, tanggal_ambil || null, tanggal_kembali_rencana || null],
      (err, result) => {
        if (err) {
          // Fallback jika kolom baru belum ada
          db.query(
            'INSERT INTO transaksi (barang_id, peminjam_id, status, tanggal_pinjam) VALUES (?, ?, ?, ?)',
            [barang_id, peminjam_id, 'Menunggu', new Date()],
            (err2, result2) => {
              if (err2) return res.status(500).json({ message: 'Gagal ajukan pinjaman' });
              db.query('UPDATE barang SET status = ? WHERE id = ?', ['Menunggu', barang_id]);
              res.status(201).json({ message: 'Peminjaman berhasil diajukan!' });
            }
          );
          return;
        }
        db.query('UPDATE barang SET status = ? WHERE id = ?', ['Menunggu', barang_id]);
        res.status(201).json({ message: 'Peminjaman berhasil diajukan!' });
      }
    );
  });
};

// AMBIL TRANSAKSI USER
const getTransaksiUser = (req, res) => {
  const { user_id } = req.params;
  db.query(
    `SELECT transaksi.*, barang.nama as nama_barang, barang.kategori,
     pemilik.nomor_telepon as nomor_pemilik, pemilik.nama as nama_pemilik
     FROM transaksi 
     LEFT JOIN barang ON transaksi.barang_id = barang.id 
     LEFT JOIN users pemilik ON barang.user_id = pemilik.id
     WHERE transaksi.peminjam_id = ? ORDER BY transaksi.created_at DESC`,
    [user_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Gagal ambil transaksi' });
      res.json(results);
    }
  );
};

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
       AND transaksi.status IN ('Disetujui', 'Dikembalikan')
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

// KEMBALIKAN BARANG
const kembalikanBarang = (req, res) => {
  const { transaksi_id, barang_id, rating } = req.body;

  db.query(
    'UPDATE transaksi SET status = ?, tanggal_kembali = ?, rating = ? WHERE id = ?',
    ['Dikembalikan', new Date(), rating, transaksi_id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Gagal update transaksi' });
      db.query('UPDATE barang SET status = ? WHERE id = ?', ['Tersedia', barang_id], (err) => {
        if (err) return res.status(500).json({ message: 'Gagal update status barang' });
        res.json({ message: 'Barang berhasil dikembalikan!' });
      });
    }
  );
};

// SETUJUI PINJAMAN
const setujuiPinjam = (req, res) => {
  const { transaksi_id, barang_id } = req.body;

  db.query(
    'UPDATE transaksi SET status = ? WHERE id = ?',
    ['Disetujui', transaksi_id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Gagal setujui pinjaman' });
      db.query('UPDATE barang SET status = ? WHERE id = ?', ['Dipinjam', barang_id]);
      res.json({ message: 'Pinjaman disetujui!' });
    }
  );
};

// TOLAK PINJAMAN
const tolakPinjam = (req, res) => {
  const { transaksi_id, barang_id } = req.body;

  db.query(
    'UPDATE transaksi SET status = ? WHERE id = ?',
    ['Ditolak', transaksi_id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Gagal tolak pinjaman' });
      // Balik status barang jadi Tersedia
      db.query('UPDATE barang SET status = ? WHERE id = ?', ['Tersedia', barang_id]);
      res.json({ message: 'Pinjaman ditolak!' });
    }
  );
};

// AMBIL NOTIFIKASI PEMILIK
const getNotifikasiPemilik = (req, res) => {
  const { user_id } = req.params;

  const query = `
    SELECT 
      transaksi.id,
      transaksi.barang_id,
      transaksi.peminjam_id,
      transaksi.status,
      transaksi.tanggal_pinjam,
      transaksi.tanggal_kembali,
      transaksi.rating,
      transaksi.created_at,
      transaksi.catatan_peminjam,
      transaksi.tanggal_ambil,
      transaksi.tanggal_kembali_rencana,
      barang.nama AS nama_barang,
      users.nama AS nama_peminjam,
      users.nomor_telepon AS nomor_peminjam,
      pemilik.nomor_telepon AS nomor_pemilik
    FROM transaksi
    LEFT JOIN barang 
      ON transaksi.barang_id = barang.id
    LEFT JOIN users 
      ON transaksi.peminjam_id = users.id
    LEFT JOIN users pemilik 
      ON barang.user_id = pemilik.id
    WHERE barang.user_id = ?
    ORDER BY transaksi.created_at DESC
  `;

  db.query(query, [user_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Gagal ambil notifikasi',
        error: err.message
      });
    }

    res.json(results);
  });
};

module.exports = { 
  ajukanPinjam, 
  getTransaksiUser, 
  kembalikanBarang, 
  setujuiPinjam, 
  tolakPinjam, 
  getNotifikasiPemilik 
};

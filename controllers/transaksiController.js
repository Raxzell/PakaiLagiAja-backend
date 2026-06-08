const db = require('../database');

// AJUKAN PINJAMAN
const ajukanPinjam = (req, res) => {
  const { barang_id, peminjam_id } = req.body;

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
      'INSERT INTO transaksi (barang_id, peminjam_id, status, tanggal_pinjam) VALUES (?, ?, ?, ?)',
      [barang_id, peminjam_id, 'Menunggu', new Date()],
      (err, result) => {
        if (err) return res.status(500).json({ message: 'Gagal ajukan pinjaman' });
        // Update status barang jadi Menunggu
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
    'SELECT transaksi.*, barang.nama as nama_barang, barang.kategori FROM transaksi LEFT JOIN barang ON transaksi.barang_id = barang.id WHERE transaksi.peminjam_id = ? ORDER BY transaksi.created_at DESC',
    [user_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Gagal ambil transaksi' });
      res.json(results);
    }
  );
};

// KEMBALIKAN BARANG
const kembalikanBarang = (req, res) => {
  const { transaksi_id, barang_id } = req.body;

  db.query(
    'UPDATE transaksi SET status = ?, tanggal_kembali = ? WHERE id = ?',
    ['Dikembalikan', new Date(), transaksi_id],
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

// AMBIL NOTIFIKASI PEMILIK (permintaan pinjam masuk)
const getNotifikasiPemilik = (req, res) => {
  const { user_id } = req.params;
  db.query(
    `SELECT transaksi.*, barang.nama as nama_barang, users.nama as nama_peminjam 
     FROM transaksi 
     LEFT JOIN barang ON transaksi.barang_id = barang.id 
     LEFT JOIN users ON transaksi.peminjam_id = users.id 
     WHERE barang.user_id = ? 
     ORDER BY transaksi.created_at DESC`,
    [user_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Gagal ambil notifikasi' });
      res.json(results);
    }
  );
};

module.exports = { ajukanPinjam, getTransaksiUser, kembalikanBarang, setujuiPinjam, tolakPinjam, getNotifikasiPemilik };
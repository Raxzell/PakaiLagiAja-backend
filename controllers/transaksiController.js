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

// AMBIL NOTIFIKASI PEMILIK (permintaan pinjam masuk)
const getNotifikasiPemilik = (req, res) => {
  const { user_id } = req.params;

  // Query dengan explicit column selection + fallback NULL untuk kolom yang mungkin belum ada
  const query = `SELECT 
     transaksi.id, transaksi.barang_id, transaksi.peminjam_id, transaksi.status,
     transaksi.tanggal_pinjam, transaksi.tanggal_kembali, transaksi.rating, transaksi.created_at,
     barang.nama as nama_barang, 
     users.nama as nama_peminjam,
     users.nomor_telepon as nomor_peminjam,
     pemilik.nomor_telepon as nomor_pemilik
     FROM transaksi 
     LEFT JOIN barang ON transaksi.barang_id = barang.id 
     LEFT JOIN users ON transaksi.peminjam_id = users.id 
     LEFT JOIN users pemilik ON barang.user_id = pemilik.id
     WHERE barang.user_id = ? 
     ORDER BY transaksi.created_at DESC`;

  db.query(query, [user_id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil notifikasi', error: err.message });

    // Coba ambil kolom catatan & jadwal secara terpisah jika ada
    const queryExtra = `SELECT id,
       IFNULL(catatan_peminjam, NULL) as catatan_peminjam,
       IFNULL(tanggal_ambil, NULL) as tanggal_ambil,
       IFNULL(tanggal_kembali_rencana, NULL) as tanggal_kembali_rencana
       FROM transaksi WHERE barang_id IN (
         SELECT id FROM barang WHERE user_id = ?
       )`;

    db.query(queryExtra, [user_id], (err2, extraResults) => {
      if (err2) {
        // Kolom belum ada, tetap kembalikan hasil tanpa extra data
        return res.json(results);
      }
      // Merge extra data ke results
      const extraMap = {};
      extraResults.forEach(e => { extraMap[e.id] = e; });
      const merged = results.map(r => ({
        ...r,
        catatan_peminjam: extraMap[r.id]?.catatan_peminjam || null,
        tanggal_ambil: extraMap[r.id]?.tanggal_ambil || null,
        tanggal_kembali_rencana: extraMap[r.id]?.tanggal_kembali_rencana || null
      }));
      res.json(merged);
    });
  });
};

module.exports = { ajukanPinjam, getTransaksiUser, kembalikanBarang, setujuiPinjam, tolakPinjam, getNotifikasiPemilik };

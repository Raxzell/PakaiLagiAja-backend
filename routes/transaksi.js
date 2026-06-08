const express = require('express');
const router = express.Router();
// const { ajukanPinjam, getTransaksiUser, kembalikanBarang } = require('../controllers/transaksiController');
const { ajukanPinjam, getTransaksiUser, kembalikanBarang, setujuiPinjam, tolakPinjam, getNotifikasiPemilik } = require('../controllers/transaksiController');

router.post('/', ajukanPinjam);
router.put('/kembalikan', kembalikanBarang);
router.put('/setujui', setujuiPinjam);
router.put('/tolak', tolakPinjam);
router.get('/notifikasi/:user_id', getNotifikasiPemilik);
router.get('/:user_id', getTransaksiUser);

module.exports = router;
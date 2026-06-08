const express = require('express');
const router = express.Router();
const { upload, tambahBarang, getBarang, getBarangUser, getLifecycleBarang, ambilGratis, hapusBarang } = require('../controllers/barangController');

router.get('/', getBarang);
router.get('/user/:user_id', getBarangUser);
router.get('/lifecycle/:barang_id', getLifecycleBarang);
router.post('/gratis', ambilGratis);
router.delete('/hapus', hapusBarang);
router.post('/', upload.single('foto'), tambahBarang);

module.exports = router;

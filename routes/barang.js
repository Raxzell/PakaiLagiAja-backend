const express = require('express');
const router = express.Router();
const { upload, tambahBarang, getBarang, getBarangUser } = require('../controllers/barangController');

router.get('/', getBarang);
router.get('/user/:user_id', getBarangUser);
router.post('/', upload.single('foto'), tambahBarang);

module.exports = router;
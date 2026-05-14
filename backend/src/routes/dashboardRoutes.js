const express = require('express');

const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/summary', dashboardController.getSummary);

module.exports = router;

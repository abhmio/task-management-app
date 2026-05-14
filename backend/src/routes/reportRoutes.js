const express = require('express');

const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/weekly', reportController.getWeeklyReport);
router.get('/status-distribution', reportController.getStatusDistribution);
router.get('/category-analysis', reportController.getCategoryAnalysis);
router.get('/productivity', reportController.getProductivity);

module.exports = router;

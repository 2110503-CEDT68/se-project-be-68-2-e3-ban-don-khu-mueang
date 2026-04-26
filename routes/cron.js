const express = require('express');
const { checkExpiringPromotions } = require('../controllers/cron');

const router = express.Router();

router.route('/check-expiring-promotions')
    .get(checkExpiringPromotions);

module.exports = router;

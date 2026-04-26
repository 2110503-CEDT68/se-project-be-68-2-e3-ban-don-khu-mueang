const { notifyExpiringPromotions } = require('../lib/notificationService');

// @desc    Cron endpoint to check and notify expiring promotions
// @route   GET /api/cron/check-expiring-promotions
// @access  Protected by CRON_SECRET
exports.checkExpiringPromotions = async (req, res, next) => {
    try {
        // Verify cron secret to prevent unauthorized access
        const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
        if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await notifyExpiringPromotions();

        res.status(200).json({
            success: true,
            message: 'Expiring promotions check completed'
        });
    } catch (error) {
        console.error('Cron check-expiring-promotions failed:', error);
        res.status(500).json({ success: false, message: 'Cron job failed' });
    }
};

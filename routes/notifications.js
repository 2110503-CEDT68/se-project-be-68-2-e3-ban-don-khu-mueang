const express = require('express');
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
} = require('../controllers/notifications');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.route('/')
    .get(protect, getNotifications);

router.route('/unread-count')
    .get(protect, getUnreadCount);

router.route('/read-all')
    .put(protect, markAllAsRead);

router.route('/:id/read')
    .put(protect, markAsRead);

module.exports = router;

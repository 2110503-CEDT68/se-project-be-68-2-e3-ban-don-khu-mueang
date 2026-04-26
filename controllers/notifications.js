const Notification = require('../models/Notification');

const toSafeString = (value) => {
    if (value === undefined || value === null) {
        return '';
    }
    return String(value).trim();
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
    try {
        const userId = toSafeString(req.user.id);
        const page = parsePositiveInt(req.query.page, 1);
        const limit = parsePositiveInt(req.query.limit, 25);
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const filter = { user: userId };

        const total = await Notification.countDocuments(filter);
        const notifications = await Notification.find(filter)
            .sort('-createdAt')
            .skip(startIndex)
            .limit(limit);

        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: notifications.length,
            totalCount: total,
            pagination,
            data: notifications
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Cannot fetch notifications' });
    }
};

// @desc    Get unread notification count for current user
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
    try {
        const userId = toSafeString(req.user.id);
        const count = await Notification.countDocuments({ user: userId, isRead: false });

        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Cannot fetch unread count' });
    }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
    try {
        const notificationId = toSafeString(req.params.id);
        if (!notificationId) {
            return res.status(400).json({ success: false, message: 'Notification id is required' });
        }

        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({ success: false, message: `No notification with id ${notificationId}` });
        }

        // Ensure the notification belongs to the current user
        if (notification.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this notification' });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json({ success: true, data: notification });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Cannot mark notification as read' });
    }
};

// @desc    Mark all notifications as read for current user
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
    try {
        const userId = toSafeString(req.user.id);

        await Notification.updateMany(
            { user: userId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Cannot mark notifications as read' });
    }
};

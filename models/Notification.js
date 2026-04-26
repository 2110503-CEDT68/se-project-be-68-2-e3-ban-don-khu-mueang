const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Notification must belong to a user'],
        index: true
    },
    type: {
        type: String,
        enum: ['shop_closed', 'promotion_new', 'promotion_expiring'],
        required: [true, 'Please specify a notification type']
    },
    title: {
        type: String,
        required: [true, 'Please add a notification title']
    },
    message: {
        type: String,
        required: [true, 'Please add a notification message']
    },
    isRead: {
        type: Boolean,
        default: false
    },
    metadata: {
        shopId: { type: mongoose.Schema.ObjectId, ref: 'Massage' },
        shopName: String,
        promotionId: { type: mongoose.Schema.ObjectId, ref: 'Promotion' },
        promotionName: String,
        reservationId: { type: mongoose.Schema.ObjectId, ref: 'Reservation' },
        expiryDate: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index for efficient per-user queries sorted by date
NotificationSchema.index({ user: 1, createdAt: -1 });
// Index for unread count queries
NotificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);

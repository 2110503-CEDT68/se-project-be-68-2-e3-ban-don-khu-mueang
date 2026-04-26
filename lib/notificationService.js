const Notification = require('../models/Notification');
const Reservation = require('../models/Reservation');
const Promotion = require('../models/Promotion');
const User = require('../models/User');

/**
 * Create notifications for all users with active reservations at a shop
 * that is being closed/deleted.
 *
 * @param {string} massageId - The ID of the massage shop being deleted
 * @param {string} shopName - The name of the shop (captured before deletion)
 */
const notifyShopClosure = async (massageId, shopName) => {
    try {
        // Find all reservations at this shop and get unique user IDs
        const reservations = await Reservation.find({ massage: massageId }).select('user _id');

        if (!reservations || reservations.length === 0) {
            return;
        }

        // Build a map of userId -> list of reservation IDs for metadata
        const userReservationMap = new Map();
        for (const reservation of reservations) {
            const userId = reservation.user.toString();
            if (!userReservationMap.has(userId)) {
                userReservationMap.set(userId, []);
            }
            userReservationMap.get(userId).push(reservation._id);
        }

        // Create a notification for each affected user
        const notifications = [];
        for (const [userId, reservationIds] of userReservationMap) {
            const reservationCount = reservationIds.length;
            const plural = reservationCount > 1 ? 's' : '';

            notifications.push({
                user: userId,
                type: 'shop_closed',
                title: 'Booking Cancelled — Shop Closed',
                message: `"${shopName}" has been permanently closed. Your ${reservationCount} booking${plural} at this shop ${reservationCount > 1 ? 'have' : 'has'} been cancelled.`,
                metadata: {
                    shopId: massageId,
                    shopName: shopName,
                    reservationId: reservationIds[0] // Store first reservation ID for reference
                }
            });
        }

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (error) {
        console.error('notifyShopClosure failed:', error.message);
    }
};

/**
 * Create notifications for all users when a new promotion becomes active.
 *
 * @param {Object} promotion - The promotion document
 */
const notifyNewPromotion = async (promotion) => {
    try {
        const users = await User.find({}).select('_id');

        if (!users || users.length === 0) {
            return;
        }

        const endDate = new Date(promotion.endDate);
        const formattedExpiry = endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const notifications = users.map((user) => ({
            user: user._id,
            type: 'promotion_new',
            title: 'New Promotion Available!',
            message: `"${promotion.name}" — Get ${promotion.amount}% off! Valid until ${formattedExpiry}.`,
            metadata: {
                promotionId: promotion._id,
                promotionName: promotion.name,
                expiryDate: promotion.endDate
            }
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (error) {
        console.error('notifyNewPromotion failed:', error.message);
    }
};

/**
 * Check for promotions expiring within 24 hours and create reminder
 * notifications for all users. Skips promotions that already have
 * a 'promotion_expiring' notification.
 */
const notifyExpiringPromotions = async () => {
    try {
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Find active promotions expiring within the next 24 hours
        const expiringPromotions = await Promotion.find({
            isActive: true,
            endDate: { $gt: now, $lte: in24Hours }
        });

        if (!expiringPromotions || expiringPromotions.length === 0) {
            return;
        }

        const users = await User.find({}).select('_id');
        if (!users || users.length === 0) {
            return;
        }

        for (const promotion of expiringPromotions) {
            // Check if we already sent an expiring notification for this promotion
            const existingNotification = await Notification.findOne({
                type: 'promotion_expiring',
                'metadata.promotionId': promotion._id
            });

            if (existingNotification) {
                continue; // Already notified, skip
            }

            const endDate = new Date(promotion.endDate);
            const hoursLeft = Math.max(1, Math.round((endDate - now) / (1000 * 60 * 60)));

            const notifications = users.map((user) => ({
                user: user._id,
                type: 'promotion_expiring',
                title: 'Promotion Ending Soon!',
                message: `"${promotion.name}" (${promotion.amount}% off) expires in about ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}. Book now before it's gone!`,
                metadata: {
                    promotionId: promotion._id,
                    promotionName: promotion.name,
                    expiryDate: promotion.endDate
                }
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }
        }
    } catch (error) {
        console.error('notifyExpiringPromotions failed:', error.message);
    }
};

module.exports = {
    notifyShopClosure,
    notifyNewPromotion,
    notifyExpiringPromotions
};

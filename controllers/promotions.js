const Promotion = require("../models/Promotion");
const { notifyNewPromotion } = require("../lib/notificationService");

const WRITABLE_FIELDS = ["name", "amount", "startDate", "endDate", "isActive", "conditions"];

const toSafeString = (value) => {
    if (value === undefined || value === null) {
        return "";
    }
    return String(value).trim();
};

const parseBooleanMaybe = (value) => {
    if (typeof value === "boolean") {
        return value;
    }

    const normalized = toSafeString(value).toLowerCase();
    if (normalized === "true") {
        return true;
    }
    if (normalized === "false") {
        return false;
    }

    return null;
};

const buildPromotionPayload = (body) => {
    const payload = {};
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return payload;
    }

    for (const field of WRITABLE_FIELDS) {
        if (body[field] !== undefined) {
            payload[field] = body[field];
        }
    }

    if (payload.name !== undefined) {
        const normalizedName = toSafeString(payload.name);
        if (normalizedName) {
            payload.name = normalizedName;
        } else {
            delete payload.name;
        }
    }

    if (payload.amount !== undefined) {
        const normalizedAmount = Number(payload.amount);
        if (Number.isFinite(normalizedAmount)) {
            payload.amount = normalizedAmount;
        }
    }

    if (payload.startDate !== undefined) {
        const normalizedStartDate = toSafeString(payload.startDate);
        if (normalizedStartDate) {
            payload.startDate = normalizedStartDate;
        } else {
            delete payload.startDate;
        }
    }

    if (payload.endDate !== undefined) {
        const normalizedEndDate = toSafeString(payload.endDate);
        if (normalizedEndDate) {
            payload.endDate = normalizedEndDate;
        } else {
            delete payload.endDate;
        }
    }

    if (payload.isActive !== undefined) {
        const normalizedIsActive = parseBooleanMaybe(payload.isActive);
        if (normalizedIsActive !== null) {
            payload.isActive = normalizedIsActive;
        } else {
            delete payload.isActive;
        }
    }

    if (payload.conditions !== undefined) {
        if (payload.conditions && typeof payload.conditions === "object" && !Array.isArray(payload.conditions)) {
            const normalizedConditions = {};

            if (payload.conditions.enabled !== undefined) {
                const enabled = parseBooleanMaybe(payload.conditions.enabled);
                if (enabled !== null) {
                    normalizedConditions.enabled = enabled;
                }
            }

            if (payload.conditions.minReservations !== undefined) {
                const minReservations = Number(payload.conditions.minReservations);
                if (Number.isFinite(minReservations)) {
                    normalizedConditions.minReservations = minReservations;
                }
            }

            if (Object.keys(normalizedConditions).length > 0) {
                payload.conditions = normalizedConditions;
            } else {
                delete payload.conditions;
            }
        } else {
            delete payload.conditions;
        }
    }

    return payload;
};

//@desc     Get all promotions
//@route    GET /api/promotions
//@access   Private (Admin)
exports.getPromotions = async (req, res, next) => {
    try {
        const promotions = await Promotion.find().sort('-createdAt');

        res.status(200).json({
            success: true,
            count: promotions.length,
            data: promotions
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: `Error: ${error.message}`
        });
    }
};

//@desc     Update a promotion
//@route    PUT /api/promotions/:id
//@access   Private (Admin)
exports.updatePromotion = async (req, res, next) => {
    try {
        const promotionId = toSafeString(req.params.id);
        if (!promotionId) {
            return res.status(400).json({
                success: false,
                message: "Promotion id is required"
            });
        }

        let promotion = await Promotion.findById(promotionId);

        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: `No promotion found with the id of ${promotionId}`
            });
        }

        const payload = buildPromotionPayload(req.body);

        // FIX: Update fields manually and use .save() so 'this' context works in validators!
        Object.assign(promotion, payload);
        await promotion.save();

        res.status(200).json({
            success: true,
            data: promotion
        });
    } catch (error) {
        // Clean up the error message to be more readable for the frontend
        const errorMessage = error.message.replace('Promotion validation failed: ', '');
        res.status(400).json({
            success: false,
            message: errorMessage
        });
    }
};

//@desc     Delete a promotion
//@route    DELETE /api/promotions/:id
//@access   Private (Admin)
exports.deletePromotion = async (req, res, next) => {
    try {
        const promotionId = toSafeString(req.params.id);
        if (!promotionId) {
            return res.status(400).json({
                success: false,
                message: "Promotion id is required"
            });
        }

        const promotion = await Promotion.findById(promotionId);

        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: `No promotion found with the id of ${promotionId}`
            });
        }

        await promotion.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: `Error: ${error.message}`
        });
    }
};

// @desc    Create new promotion
// @route   POST /api/promotions
// @access  Private/Admin
exports.createPromotion = async (req, res, next) => {
    try {
        const payload = buildPromotionPayload(req.body);
        const promotion = await Promotion.create(payload);
        await notifyNewPromotion(promotion);
        res.status(201).json({ success: true, data: promotion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Cannot create promotion' });
    }
};

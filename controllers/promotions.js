const Promotion = require("../models/Promotion");

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
        let promotion = await Promotion.findById(req.params.id);

        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: `No promotion found with the id of ${req.params.id}`
            });
        }

        // FIX: Update fields manually and use .save() so 'this' context works in validators!
        Object.assign(promotion, req.body);
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
        const promotion = await Promotion.findById(req.params.id);

        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: `No promotion found with the id of ${req.params.id}`
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
        const promotion = await Promotion.create(req.body);
        res.status(201).json({ success: true, data: promotion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Cannot create promotion' });
    }
};

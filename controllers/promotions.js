const Promotion = require("../models/Promotion");

//@desc     Create new promotion
//@route    POST /api/promotions
//@access   Private (Admin)
exports.createPromotion = async (req, res, next) => {
    try {
        const promotion = await Promotion.create(req.body);

        res.status(201).json({
            success: true,
            data: promotion
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: `Error: ${error.message}`
        });
    }
};

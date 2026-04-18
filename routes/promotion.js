const express = require('express');
const { getPromotions, getPromotion } = require('../controllers/promotion');

const promotionRouter = express.Router();

promotionRouter.route('/').get(getPromotions);
promotionRouter.route('/:id').get(getPromotion);

module.exports = promotionRouter;
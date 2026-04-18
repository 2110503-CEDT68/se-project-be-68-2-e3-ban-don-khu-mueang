const mongoose = require("mongoose");

const PromotionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a promotion name']
    },
    amount: {
        type: Number,
        required: [true, 'Please add a discount amount']
    },
    startDate: {
        type: Date,
        required: [true, 'Please add a start date']
    },
    endDate: {
        type: Date,
        required: [true, 'Please add an end date']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    conditions: {
        enabled: {
            type: Boolean,
            default: false
        },
        minReservations: {
            type: Number,
            default: 0
        }
    }
}, { timestamps: true });

module.exports = mongoose.model("Promotion", PromotionSchema);

const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a promotion name'],
    },
    amount: {
        type: Number,
        required: [true, 'Please add a promotion amount'],
        min: [1, 'Promotion amount must be more than 0 percent'],
        max: [100, 'Promotion amount must be less than or equal to 100 percent'],

    },
    startDate: {
        type: Date,
        required: [true, 'Please add a promotion start date'],
    },
    endDate: {
        type: Date,
        required: [true, 'Please add a promotion end date'],
        validate: {
            validator: function (value) {
                return value > this.startDate;
            },
            message: 'Promotion end date must be after the start date',
        }
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    conditions: {
        enabled: {
            type: Boolean,
            default: false,
        },
        minReservations: {
            type: Number,
            min: [0, 'Minimum reservations must be at least 0'],
            validate: {
                validator: function (value) {
                    return !this.conditions.enabled || value > 0;
                },
                message: 'Minimum reservations must be greater than 0 when conditions are enabled',
            }
        },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Promotion', PromotionSchema);
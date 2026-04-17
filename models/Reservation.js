const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    reserveDate: {
        type: Date,
        required: true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    massage: {
        type: mongoose.Schema.ObjectId,
        ref: 'Massage',
        required: true
    },
    rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
        validate: {
            validator: Number.isInteger,
            message: 'Rating must be a whole number'
        }
    },
    isRated: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

ReservationSchema.statics.getAverageRating = async function (massageId) {
    try {
        const obj = await this.aggregate([
            {
                $match: { massage: massageId, isRated: true }
            },
            {
                $group: {
                    _id: '$massage',
                    ratingSum: { $sum: '$rating' },
                    userRatingCount: { $sum: 1 },
                    averageRating: { $avg: '$rating' }
                }
            }
        ]);

        if (obj.length > 0) {
            await this.model('Massage').findByIdAndUpdate(massageId, {
                ratingSum: obj[0].ratingSum,
                userRatingCount: obj[0].userRatingCount,
                averageRating: obj[0].averageRating
            });
        } else {
            await this.model('Massage').findByIdAndUpdate(massageId, {
                ratingSum: 0,
                userRatingCount: 0,
                averageRating: 0
            });
        }
    } catch (err) {
        console.error(err);
    }
};

ReservationSchema.post('save', async function () {
    if (this.isRated || this.isModified('rating')) {
        await this.constructor.getAverageRating(this.massage);
    }
});

ReservationSchema.post('deleteOne', { document: true, query: false }, async function () {
    await this.constructor.getAverageRating(this.massage);
});

module.exports = mongoose.model('Reservation', ReservationSchema);

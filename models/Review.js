const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        reservation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Reservation',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        massage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Massage',
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            validate: {
                validator: Number.isInteger,
                message: 'Rating must be a whole number',
            },
        },
        comment: {
            type: String,
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters'],
        },
    },
    { timestamps: true }
);

// Prevent duplicate reviews for the same reservation
reviewSchema.index({ reservation: 1 }, { unique: true });

reviewSchema.statics.getAverageRating = async function (massageId) {
    try {
        const obj = await this.aggregate([
            {
                $match: { massage: massageId },
            },
            {
                $group: {
                    _id: '$massage',
                    ratingSum: { $sum: '$rating' },
                    userRatingCount: { $sum: 1 },
                    averageRating: { $avg: '$rating' },
                },
            },
        ]);

        if (obj.length > 0) {
            await this.model('Massage').findByIdAndUpdate(massageId, {
                ratingSum: obj[0].ratingSum,
                userRatingCount: obj[0].userRatingCount,
                averageRating: obj[0].averageRating,
            });
        } else {
            await this.model('Massage').findByIdAndUpdate(massageId, {
                ratingSum: 0,
                userRatingCount: 0,
                averageRating: 0,
            });
        }
    } catch (err) {
        console.error(err);
    }
};

reviewSchema.post('save', async function () {
    await this.constructor.getAverageRating(this.massage);
});

reviewSchema.post('deleteOne', { document: true, query: false }, async function () {
    await this.constructor.getAverageRating(this.massage);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;


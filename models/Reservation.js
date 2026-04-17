const mongoose = require('mongoose');
require('./Review');

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
    discount: [
        {
            name: {
                type: String,
                required: true
            },
            amount: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ],
    price: {
        type: Number,
        required: true,
        min: 0
    },
    netPrice: {
        type: Number,
        required: true,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

ReservationSchema.post('deleteOne', { document: true, query: false }, async function () {
    await this.model('Review').deleteOne({ reservation: this._id });
});

module.exports = mongoose.model('Reservation', ReservationSchema);

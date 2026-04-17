const mongoose = require('mongoose');
require('./Rating');

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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

ReservationSchema.post('deleteOne', { document: true, query: false }, async function () {
    await this.model('Rating').deleteOne({ reservation: this._id });
});

module.exports = mongoose.model('Reservation', ReservationSchema);

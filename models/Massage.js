const mongoose = require('mongoose');

const MassageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        unique: true,
        trim: true,
        maxlength: [50, 'Name can not be more than 50 characters']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    district: {
        type: String,
        required: [true, 'Please add a district']
    },
    province: {
        type: String,
        required: [true, 'Please add a province']
    },
    postalcode: {
        type: String,
        required: [true, 'Please add a postalcode'],
        maxlength: [5, 'Postal code can not be more than 5 digits']
    },
    tel: {
        type: String,
        required: [true, 'Please add a telephone number']
    },
    pictures: {
        type: [String],
        default: ['https://placehold.co/600x400?text=No+Image+Available']
    },
    price: {
        type: Number,
        required: [true, 'Please add a starting price']
    },
    ratingSum: {
        type: Number,
        default: 0
    },
    userRatingCount: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
   
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});


MassageSchema.virtual('reservations', {
    ref: 'Reservation',
    localField: '_id',
    foreignField: 'massage', 
    justOne: false
});


MassageSchema.pre('deleteOne', { document: true, query: false }, async function () {
    console.log(`Reservations being removed from massage shop ${this._id}`);
    await this.model('Reservation').deleteMany({ massage: this._id });
});

module.exports = mongoose.model('Massage', MassageSchema);

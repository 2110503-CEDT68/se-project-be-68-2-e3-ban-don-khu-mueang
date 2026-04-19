const Reservation = require('../models/Reservation');
const Massage = require('../models/Massage');
const { createReviewFromReservation } = require('./reviews');

//@desc     Get all reservations
//@route    GET /api/reservations
//@access   Private
exports.getReservations = async (req, res, next) => {
    let query;

    if (req.user.role !== 'admin') {
        query = Reservation.find({ user: req.user.id }).populate({
            path: 'massage',
            select: 'name province tel'
        }).populate({
            path: 'user',
            select: 'name tel email'
        });
    } else {
        if (req.params.massageId) {
            query = Reservation.find({ massage: req.params.massageId }).populate({
                path: 'massage',
                select: 'name province tel'
            }).populate({
                path: 'user',
                select: 'name tel email'
            });
        } else {
            query = Reservation.find().populate({
                path: 'massage',
                select: 'name province tel'
            }).populate({
                path: 'user',
                select: 'name tel email'
            });
        }
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try {
        const total = await Reservation.countDocuments();
        query = query.skip(startIndex).limit(limit);

        const reservations = await query;
        const pagination = {};

        if (endIndex < total) {
            pagination.next = { page: page + 1, limit }
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit }
        }

        res.status(200).json({ success: true, count: reservations.length, pagination, data: reservations, totalCount: total });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot find Reservation" });
    }
};

//@desc     Get single reservation
//@route    GET /api/reservations/:id
//@access   Private
exports.getReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate({
            path: 'massage',
            select: 'name province tel'
        }).populate({
            path: 'user',
            select: 'name tel email'
        });

        if (!reservation) {
            return res.status(400).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: reservation });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot find Reservation" });
    }
};

//@desc     Add reservation
//@route    POST /api/reservations
//@access   Private
exports.addReservation = async (req, res, next) => {
    try {
        const massageId = req.params.massageId || req.body.massage;
        req.body.massage = massageId;

        const parsedDate = new Date(req.body.reserveDate);
        if (!req.body.reserveDate || isNaN(parsedDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Please provide a valid reserveDate (ISO 8601 format)' });
        }
        req.body.reserveDate = parsedDate;

        const massage = await Massage.findById(massageId);
        if (!massage) {
            return res.status(404).json({ success: false, message: `No Massage shop found with the id of ${massageId}` });
        }

        req.body.user = req.user.id;
        const existReservations = await Reservation.find({ 
            user: req.user.id,
            reserveDate: { $gte: new Date() }
        });

        if (existReservations.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({ success: false, message: `You have already reached the maximum limit of 3 upcoming reservations.` });
        }

        const reservation = await Reservation.create(req.body);
        res.status(201).json({ success: true, data: reservation });
    } catch (error) {
        // FIX: Show the exact validation error to the frontend if price/data is missing
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot create Reservation" });
    }
};

//@desc     Update reservation
//@route    PUT /api/reservations/:id
//@access   Private
exports.updateReservation = async (req, res, next) => {
    try {
        let reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `Not authorized to update this appointment` });
        }

        const allowedUpdates = {};
        if (req.body.reserveDate !== undefined) {
            const parsedDate = new Date(req.body.reserveDate);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ success: false, message: 'Please provide a valid reserveDate' });
            }
            allowedUpdates.reserveDate = parsedDate;
        }

        reservation = await Reservation.findByIdAndUpdate(req.params.id, allowedUpdates, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: reservation });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot update Reservation" });
    }
};

//@desc     Delete reservation
//@route    DELETE /api/reservations/:id
//@access   Private
exports.deleteReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `Not authorized to delete this appointment` });
        }

        await reservation.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot delete Reservation" });
    }
};

const reviewReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        if (reservation.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: `Not authorized to rate this reservation` });
        }

        const { rating: ratingValue, comment } = req.body;

        if (!ratingValue || !Number.isInteger(Number(ratingValue)) || Number(ratingValue) < 1 || Number(ratingValue) > 5) {
            return res.status(400).json({ success: false, message: 'Please provide a whole number rating between 1 and 5' });
        }

        const createdReview = await createReviewFromReservation({
            reservation,
            userId: req.user.id,
            ratingValue,
            comment
        });

        res.status(200).json({ success: true, data: createdReview });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: 'Cannot review reservation' });
    }
};

exports.reviewReservation = reviewReservation;
exports.rateReservation = reviewReservation;
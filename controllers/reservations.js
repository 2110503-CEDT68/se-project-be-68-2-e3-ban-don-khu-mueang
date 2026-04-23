const Reservation = require('../models/Reservation');
const Massage = require('../models/Massage');
const { createReviewFromReservation } = require('./reviews');
const { parseDateInBangkok, getNow } = require('../config/timezone');

const toSafeString = (value) => {
    if (value === undefined || value === null) {
        return '';
    }
    return String(value).trim();
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

//@desc     Get all reservations
//@route    GET /api/reservations
//@access   Private
exports.getReservations = async (req, res, next) => {
    const reservationFilter = {};
    const userId = toSafeString(req.user.id);

    if (req.user.role !== 'admin') {
        reservationFilter.user = userId;
    } else if (req.params.massageId !== undefined) {
        const massageId = toSafeString(req.params.massageId);
        if (massageId) {
            reservationFilter.massage = massageId;
        }
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 25);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try {
        const total = await Reservation.countDocuments(reservationFilter);
        const reservations = await Reservation.find(reservationFilter)
            .populate({
                path: 'massage',
                select: 'name province tel'
            })
            .populate({
                path: 'user',
                select: 'name tel email'
            })
            .skip(startIndex)
            .limit(limit);
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
        const reservationId = toSafeString(req.params.id);
        if (!reservationId) {
            return res.status(400).json({ success: false, message: 'Reservation id is required' });
        }

        const reservation = await Reservation.findById(reservationId).populate({
            path: 'massage',
            select: 'name province tel'
        }).populate({
            path: 'user',
            select: 'name tel email'
        });

        if (!reservation) {
            return res.status(400).json({ success: false, message: `No reservation with the id of ${reservationId}` });
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
        const routeMassageId = toSafeString(req.params.massageId);
        const bodyMassageId = toSafeString(req.body.massage);
        if (routeMassageId && bodyMassageId && routeMassageId !== bodyMassageId) {
            return res.status(400).json({ success: false, message: 'massage id in route and body must match' });
        }

        const massageId = routeMassageId || bodyMassageId;
        if (!massageId) {
            return res.status(400).json({ success: false, message: 'Please provide a valid massage id' });
        }

        // Validate and normalise reserveDate before hitting Mongoose
        const parsedDate = parseDateInBangkok(req.body.reserveDate);
        if (!parsedDate) {
            return res.status(400).json({ success: false, message: 'Please provide a valid reserveDate (ISO 8601 format, e.g. 2026-03-05T14:00:00+07:00)' });
        }

        const massage = await Massage.findById(massageId);
        if (!massage) {
            return res.status(404).json({ success: false, message: `No Massage shop found with the id of ${massageId}` });
        }

        const userId = toSafeString(req.user.id);

        const existReservations = await Reservation.countDocuments({
            user: userId,
            reserveDate: { $gte: getNow() }
        });

        if (existReservations >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({ success: false, message: `You have already reached the maximum limit of 3 upcoming reservations.` });
        }

        const reservationPayload = {
            reserveDate: parsedDate,
            user: userId,
            massage: massageId,
            discount: req.body.discount,
            price: req.body.price,
            netPrice: req.body.netPrice
        };

        const reservation = await Reservation.create(reservationPayload);
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
        const reservationId = toSafeString(req.params.id);
        if (!reservationId) {
            return res.status(400).json({ success: false, message: 'Reservation id is required' });
        }

        let reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${reservationId}` });
        }

        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `Not authorized to update this appointment` });
        }

        const allowedUpdates = {};
        if (req.body.reserveDate !== undefined) {
            const parsedDate = parseDateInBangkok(req.body.reserveDate);
            if (!parsedDate) {
                return res.status(400).json({ success: false, message: 'Please provide a valid reserveDate (ISO 8601 format, e.g. 2026-03-05T14:00:00+07:00)' });
            }
            allowedUpdates.reserveDate = parsedDate;
        }

        reservation = await Reservation.findByIdAndUpdate(reservationId, allowedUpdates, {
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
        const reservationId = toSafeString(req.params.id);
        if (!reservationId) {
            return res.status(400).json({ success: false, message: 'Reservation id is required' });
        }

        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${reservationId}` });
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
        const reservationId = toSafeString(req.params.id);
        if (!reservationId) {
            return res.status(400).json({ success: false, message: 'Reservation id is required' });
        }

        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${reservationId}` });
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
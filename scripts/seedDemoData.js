require('dotenv').config({ path: '.env' });

process.env.TZ = "Asia/Bangkok";

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Massage = require('../models/Massage');
const Reservation = require('../models/Reservation');
const Rating = require('../models/Rating');
const {
    createMassageData,
    createReservationData,
    createReviewData,
    maybeAttachReviewComment,
    createUserData,
} = require('./seeders/demoFactories');

const parseCount = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
    if (value === undefined) {
        return fallback;
    }

    return String(value).toLowerCase() === 'true';
};

const getArgValue = (name) => {
    const match = process.argv.slice(2).find((argument) => argument.startsWith(`--${name}=`));
    return match ? match.split('=').slice(1).join('=') : undefined;
};

const parseConfig = () => ({
    clear: parseBoolean(getArgValue('clear'), true),
    users: parseCount(getArgValue('users'), 20),
    admins: parseCount(getArgValue('admins'), 1),
    massages: parseCount(getArgValue('massages'), 30),
    reservations: parseCount(getArgValue('reservations'), 50),
    reviews: parseCount(getArgValue('reviews'), 35),
});

const clearCollections = async () => {
    await Rating.deleteMany({});
    await Reservation.deleteMany({});
    await Massage.deleteMany({});
    await User.deleteMany({});
};

const generateDemoData = async (config) => {
    const { faker } = await import('@faker-js/faker');

    if (config.clear) {
        await clearCollections();
    }

    const users = [];
    for (let index = 0; index < config.users; index += 1) {
        users.push(createUserData(faker, index, 'user'));
    }

    for (let index = 0; index < config.admins; index += 1) {
        users.push(createUserData(faker, config.users + index, 'admin'));
    }

    const createdUsers = await User.create(users);

    const massages = [];
    for (let index = 0; index < config.massages; index += 1) {
        massages.push(createMassageData(faker, index));
    }

    const createdMassages = await Massage.insertMany(massages, { ordered: true });

    const userPool = createdUsers.filter((user) => user.role === 'user');
    const reservationDocs = [];
    for (let index = 0; index < config.reservations; index += 1) {
        const user = userPool[index % userPool.length];
        const massage = createdMassages[index % createdMassages.length];
        reservationDocs.push(createReservationData(faker, user._id, massage._id));
    }

    const createdReservations = await Reservation.insertMany(reservationDocs, { ordered: true });

    const reviewDocs = [];
    const reviewTargetCount = Math.min(config.reviews, createdReservations.length);
    for (let index = 0; index < reviewTargetCount; index += 1) {
        const reservation = createdReservations[index];
        reviewDocs.push(maybeAttachReviewComment(faker, createReviewData(faker, reservation, reservation.user)));
    }

    if (reviewDocs.length > 0) {
        await Rating.insertMany(reviewDocs, { ordered: true });

        const uniqueMassageIds = [...new Set(reviewDocs.map((review) => review.massage.toString()))];
        for (const massageId of uniqueMassageIds) {
            await Rating.getAverageRating(massageId);
        }
    }

    return {
        users: createdUsers.length,
        massages: createdMassages.length,
        reservations: createdReservations.length,
        reviews: reviewDocs.length,
    };
};

const main = async () => {
    const config = parseConfig();

    await connectDB();

    const result = await generateDemoData(config);

    console.log('Demo data generated successfully');
    console.log(JSON.stringify({ config, result }, null, 2));

    await mongoose.connection.close();
};

main().catch(async (error) => {
    console.error('Demo data generation failed');
    console.error(error);

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }

    process.exit(1);
});

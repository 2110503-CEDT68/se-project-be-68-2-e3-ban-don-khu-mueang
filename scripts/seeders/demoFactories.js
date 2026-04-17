const buildPhoneNumber = (index) => {
    const normalized = String(8000000000 + index);
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6, 10)}`;
};

const buildPostalCode = (index) => String(10000 + index).slice(0, 5);

const createUserData = (faker, index, role = 'user') => {
    const suffix = `${Date.now()}-${index}`;

    return {
        name: faker.person.fullName(),
        tel: buildPhoneNumber(index + 1),
        email: `demo-${suffix}@example.com`,
        password: 'password',
        role,
    };
};

const createMassageData = (faker, index) => {
    const suffix = ` Massage ${index + 1}`;
    const companyName = faker.company.name();
    const maxCompanyLength = 50 - suffix.length;
    const name = `${companyName.slice(0, maxCompanyLength)}${suffix}`;

    return {
        name,
        address: faker.location.streetAddress(),
        district: faker.location.city(),
        province: faker.location.state(),
        postalcode: buildPostalCode(index + 1),
        tel: buildPhoneNumber(index + 101),
        pictures: [`https://picsum.photos/seed/${faker.string.alphanumeric(12)}/600/400`],
        price: faker.number.int({ min: 250, max: 1500 }),
    };
};

const createReservationData = (faker, userId, massageId) => ({
    reserveDate: faker.date.soon({ days: 60 }),
    user: userId,
    massage: massageId,
});

const createReviewData = (faker, reservation, userId) => ({
    reservation: reservation._id,
    user: userId,
    massage: reservation.massage,
    rating: faker.number.int({ min: 1, max: 5 }),
});

const maybeAttachReviewComment = (faker, reviewData) => {
    const comment = faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.75 });

    if (comment) {
        reviewData.comment = comment;
    }

    return reviewData;
};

module.exports = {
    createMassageData,
    createReservationData,
    createReviewData,
    maybeAttachReviewComment,
    createUserData,
};

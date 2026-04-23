const BANGKOK_TIMEZONE = 'Asia/Bangkok';
const BANGKOK_OFFSET = '+07:00';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_WITHOUT_TZ_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

const setBangkokTimezone = () => {
    process.env.TZ = BANGKOK_TIMEZONE;
};

const parseDateInBangkok = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : new Date(value);
    }

    if (typeof value === 'number') {
        const dateFromNumber = new Date(value);
        return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return null;
    }

    // If client omits timezone, interpret input as Bangkok local time.
    let normalizedValue = trimmedValue;
    if (DATE_ONLY_PATTERN.test(trimmedValue)) {
        normalizedValue = `${trimmedValue}T00:00:00${BANGKOK_OFFSET}`;
    } else if (DATETIME_WITHOUT_TZ_PATTERN.test(trimmedValue)) {
        normalizedValue = `${trimmedValue}${BANGKOK_OFFSET}`;
    }

    const parsedDate = new Date(normalizedValue);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getNow = () => new Date();

module.exports = {
    BANGKOK_TIMEZONE,
    setBangkokTimezone,
    parseDateInBangkok,
    getNow,
};

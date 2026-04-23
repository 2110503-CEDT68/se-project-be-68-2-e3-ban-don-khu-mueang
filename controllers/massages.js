const Massage = require("../models/Massage");
const FILTERABLE_FIELDS = ["name", "district", "province", "postalcode", "tel", "price"];
const WRITABLE_FIELDS = ["name", "address", "district", "province", "postalcode", "tel", "pictures", "price"];
const SAFE_QUERY_OPERATORS = ["gt", "gte", "lt", "lte", "in"];

const toSafeString = (value) => {
    if (value === undefined || value === null) {
        return "";
    }
    return String(value).trim();
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(toSafeString(value), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseNumericMaybe = (value) => {
    const parsed = Number(toSafeString(value));
    return Number.isFinite(parsed) ? parsed : null;
};

const parseCsvList = (value) => toSafeString(value).split(",").map((part) => part.trim()).filter(Boolean);

const buildQueryFilter = (query) => {
    const filter = {};

    for (const field of FILTERABLE_FIELDS) {
        const raw = query[field];
        if (raw === undefined || raw === null) {
            continue;
        }

        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            const operatorFilter = {};
            for (const operator of SAFE_QUERY_OPERATORS) {
                if (raw[operator] === undefined || raw[operator] === null) {
                    continue;
                }

                if (operator === "in") {
                    const inValues = parseCsvList(raw[operator]).map((item) => {
                        const maybeNumber = Number(item);
                        return Number.isFinite(maybeNumber) ? maybeNumber : item;
                    });
                    if (inValues.length > 0) {
                        operatorFilter.$in = inValues;
                    }
                    continue;
                }

                const normalizedOperatorValue = toSafeString(raw[operator]);
                if (!normalizedOperatorValue) {
                    continue;
                }

                const maybeNumber = Number(normalizedOperatorValue);
                operatorFilter[`$${operator}`] = Number.isFinite(maybeNumber) ? maybeNumber : normalizedOperatorValue;
            }

            if (Object.keys(operatorFilter).length > 0) {
                filter[field] = operatorFilter;
            }

            continue;
        }

        const normalized = toSafeString(raw);
        if (!normalized) {
            continue;
        }

        if (field === "price") {
            const maybeNumber = parseNumericMaybe(normalized);
            filter[field] = maybeNumber !== null ? maybeNumber : normalized;
        } else {
            filter[field] = normalized;
        }
    }

    return filter;
};

const buildProjection = (selectQuery) => {
    const fields = parseCsvList(selectQuery)
        .filter((field) => !field.startsWith("$") && !field.includes("."));

    return fields.length > 0 ? fields.join(" ") : null;
};

const buildSort = (sortQuery) => {
    const fields = parseCsvList(sortQuery)
        .map((field) => {
            const isDesc = field.startsWith("-");
            const key = isDesc ? field.slice(1) : field;

            if (!key || key.startsWith("$") || key.includes(".")) {
                return null;
            }

            return `${isDesc ? "-" : ""}${key}`;
        })
        .filter(Boolean);

    return fields.length > 0 ? fields.join(" ") : "-createdAt";
};

const buildPayload = (body) => {
    const payload = {};
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return payload;
    }

    for (const field of WRITABLE_FIELDS) {
        if (body[field] !== undefined) {
            payload[field] = body[field];
        }
    }

    const stringFields = ["name", "address", "district", "province", "postalcode", "tel"];
    for (const field of stringFields) {
        if (payload[field] === undefined) {
            continue;
        }

        const normalized = toSafeString(payload[field]);
        if (normalized) {
            payload[field] = normalized;
        } else {
            delete payload[field];
        }
    }

    if (payload.pictures !== undefined) {
        if (Array.isArray(payload.pictures)) {
            payload.pictures = payload.pictures.map((picture) => toSafeString(picture)).filter(Boolean);
            if (payload.pictures.length === 0) {
                delete payload.pictures;
            }
        } else {
            delete payload.pictures;
        }
    }

    if (payload.price !== undefined) {
        const maybeNumber = parseNumericMaybe(payload.price);
        if (maybeNumber !== null) {
            payload.price = maybeNumber;
        }
    }

    return payload;
};

// @desc    Get all massages
// @route   GET /api/massages
// @access  Public
exports.getMassages = async (req, res, next) => {
    const filter = buildQueryFilter(req.query);
    const select = buildProjection(req.query.select);
    const sort = buildSort(req.query.sort);

    // Pagination Logic
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 25);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try {
        let query = Massage.find(filter).sort(sort).skip(startIndex).limit(limit);
        if (select) {
            query = query.select(select);
        }

        const total = await Massage.countDocuments(filter);

        // Execute Query
        const massages = await query;

        // Pagination result
        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: massages.length,
            totalCount: total,
            pagination,
            data: massages
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get single massage
// @route   GET /api/massages/:id
// @access  Public
exports.getMassage = async (req, res, next) => {
    try {
        const massageId = toSafeString(req.params.id);
        if (!massageId) {
            return res.status(400).json({ success: false, message: "Massage id is required" });
        }

        const massage = await Massage.findById(massageId);

        if (!massage) {
            return res.status(400).json({ success: false, message: 'Massage shop not found' });
        }

        res.status(200).json({ success: true, data: massage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Create new massage
// @route   POST /api/massages
// @access  Private (Admin)
exports.createMassage = async (req, res, next) => {
    try {
        const payload = buildPayload(req.body);

        const massage = await Massage.create(payload);
        res.status(201).json({ success: true, data: massage });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Update massage
// @route   PUT /api/massages/:id
// @access  Private (Admin)
exports.updateMassage = async (req, res, next) => {
    try {
        const massageId = toSafeString(req.params.id);
        if (!massageId) {
            return res.status(400).json({ success: false, message: "Massage id is required" });
        }

        const payload = buildPayload(req.body);

        const massage = await Massage.findByIdAndUpdate(massageId, payload, {
            new: true,
            runValidators: true
        });

        if (!massage) {
            return res.status(404).json({ success: false, message: `No massage shop with id ${massageId}` });
        }
        res.status(200).json({ success: true, data: massage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete massage
// @route   DELETE /api/massages/:id
// @access  Private (Admin)
exports.deleteMassage = async (req, res, next) => {
    try {
        const massageId = toSafeString(req.params.id);
        if (!massageId) {
            return res.status(400).json({ success: false, message: "Massage id is required" });
        }

        const massage = await Massage.findById(massageId);

        if (!massage) {
            return res.status(404).json({ success: false, message: `No massage shop with id ${massageId}` });
        }

        // cascade delete is handled by the pre('deleteOne') hook on MassageSchema
        await massage.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: err.message });
    }
};

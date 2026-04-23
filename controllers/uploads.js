const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const User = require("../models/User");
const Massage = require("../models/Massage");

const ALLOWED_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png"];
const PLACEHOLDER_IMAGE_URL = "https://placehold.co/600x400?text=No+Image+Available";

const resolveEndpoint = () => {
    if (process.env.R2_ENDPOINT) {
        return process.env.R2_ENDPOINT;
    }
    if (process.env.R2_ACCOUNT_ID) {
        return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    }
    return null;
};

const getR2Config = () => {
    const endpoint = resolveEndpoint();
    const bucket = process.env.R2_BUCKET_NAME;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
        return null;
    }

    return {
        endpoint,
        bucket,
        accessKeyId,
        secretAccessKey,
        region: process.env.R2_REGION || "auto"
    };
};

const createR2Client = (r2Config) => {
    return new S3Client({
        region: r2Config.region,
        endpoint: r2Config.endpoint,
        forcePathStyle: true,
        credentials: {
            accessKeyId: r2Config.accessKeyId,
            secretAccessKey: r2Config.secretAccessKey
        }
    });
};

const buildPublicUrl = (key, r2Config) => {
    if (process.env.R2_PUBLIC_BASE_URL) {
        return `${process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
    }
    // return `${r2Config.endpoint.replace(/\/$/, "")}/${r2Config.bucket}/${key}`;
    return `${r2Config.endpoint.replace(/\/$/, "")}/${key}`;
};

const buildVersionedUrl = (url, version) => `${url}${url.includes("?") ? "&" : "?"}v=${version}`;

// @desc    Generate upload URL for avatar or massage image
// @route   POST /api/uploads/presigned-url
// @access  Private
exports.generateUploadUrl = async (req, res, next) => {
    try {
        const { target, contentType, massageId } = req.body || {};

        if (!ALLOWED_IMAGE_CONTENT_TYPES.includes(contentType)) {
            return res.status(400).json({
                success: false,
                message: "contentType must be image/jpeg or image/png"
            });
        }

        if (!["avatar", "massage"].includes(target)) {
            return res.status(400).json({
                success: false,
                message: "target must be avatar or massage"
            });
        }

        const r2Config = getR2Config();
        if (!r2Config) {
            return res.status(500).json({
                success: false,
                message: "R2 configuration is missing"
            });
        }

        let key;
        if (target === "avatar") {
            key = `avatars/${req.user.id}.jpg`;
        } else {
            if (req.user.role !== "admin") {
                return res.status(403).json({
                    success: false,
                    message: "Only admin can upload massage images"
                });
            }

            if (!massageId) {
                return res.status(400).json({
                    success: false,
                    message: "massageId is required for target=massage"
                });
            }

            const massage = await Massage.findById(massageId);
            if (!massage) {
                return res.status(404).json({
                    success: false,
                    message: `No massage shop with id ${massageId}`
                });
            }

            key = `massages/${massageId}/${Date.now()}-${req.user.id}.jpg`;
        }

        const client = createR2Client(r2Config);
        const command = new PutObjectCommand({
            Bucket: r2Config.bucket,
            Key: key,
            ContentType: contentType
        });

        const expiresIn = 300;
        const url = await getSignedUrl(client, command, { expiresIn });

        res.status(200).json({
            success: true,
            data: {
                url,
                key,
                expiresIn,
                target,
                contentType
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Finalize uploaded file and save reference to model
// @route   POST /api/uploads/finalize
// @access  Private
exports.finalizeUpload = async (req, res, next) => {
    try {
        const { target, key, massageId } = req.body || {};

        if (!["avatar", "massage"].includes(target)) {
            return res.status(400).json({
                success: false,
                message: "target must be avatar or massage"
            });
        }

        if (!key) {
            return res.status(400).json({
                success: false,
                message: "key is required"
            });
        }

        const r2Config = getR2Config();
        if (!r2Config) {
            return res.status(500).json({
                success: false,
                message: "R2 configuration is missing"
            });
        }

        if (target === "avatar") {
            const expectedKey = `avatars/${req.user.id}.jpg`;
            if (key !== expectedKey) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid avatar key"
                });
            }

            const avatarVersion = Date.now();
            const avatarUrl = buildVersionedUrl(buildPublicUrl(key, r2Config), avatarVersion);
            const user = await User.findByIdAndUpdate(
                req.user.id,
                { avatarKey: key, avatarUrl },
                { new: true, runValidators: true }
            );

            return res.status(200).json({
                success: true,
                data: {
                    avatarKey: user.avatarKey,
                    avatarUrl: user.avatarUrl,
                    avatarVersion
                }
            });
        }

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can update massage images"
            });
        }

        if (!massageId) {
            return res.status(400).json({
                success: false,
                message: "massageId is required for target=massage"
            });
        }

        const expectedPrefix = `massages/${massageId}/`;
        if (!key.startsWith(expectedPrefix)) {
            return res.status(400).json({
                success: false,
                message: "Invalid massage image key"
            });
        }

        const massage = await Massage.findById(massageId);
        if (!massage) {
            return res.status(404).json({
                success: false,
                message: `No massage shop with id ${massageId}`
            });
        }

        const pictureUrl = buildPublicUrl(key, r2Config);
        const hasRealPictures = (massage.pictures || []).some((picture) => picture !== PLACEHOLDER_IMAGE_URL);
        const nextPictures = hasRealPictures ? [...massage.pictures] : [];

        if (!nextPictures.includes(pictureUrl)) {
            nextPictures.push(pictureUrl);
        }

        massage.pictures = nextPictures;
        await massage.save();

        return res.status(200).json({
            success: true,
            data: {
                id: massage._id,
                pictures: massage.pictures
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

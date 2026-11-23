const mongoose = require("mongoose");
const User = require("../models/User");
const Region = require("../models/Region");
const Vehicle = require("../models/Vehicle");

const LICENSE_CATEGORIES = User.schema
    .path("licenseCategory")
    .enumValues.filter(Boolean);

const DRIVER_PROFILE_FIELDS = [
    "phoneNumber",
    "cin",
    "birthDate",
    "address",
    "licenseCategory",
    "licenseNumber",
    "licenseExpiry",
    "hub"
];

const REQUIRED_DRIVER_FIELDS = [
    "phoneNumber",
    "cin",
    "licenseCategory",
    "licenseNumber",
    "licenseExpiry",
    "hub"
];

const PHONE_PATTERN = /^\+?[0-9\s().-]{8,20}$/;

function parseDate(value) {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const date = new Date(value.trim());

    return Number.isNaN(date.getTime()) ? null : date;
}

function parseDriverProfile(body, { requireAll }) {
    const data = {};
    const has = (field) => body[field] !== undefined;

    if (requireAll) {
        for (const field of REQUIRED_DRIVER_FIELDS) {
            if (!has(field)) {
                return { error: field + " is required" };
            }
        }
    }

    const textFields = [
        "phoneNumber",
        "cin",
        "address",
        "licenseCategory",
        "licenseNumber",
        "hub"
    ];

    for (const field of textFields) {
        if (has(field) && typeof body[field] !== "string") {
            return { error: field + " must be a string" };
        }
    }

    if (has("phoneNumber")) {
        const value = body.phoneNumber.trim();

        if (!PHONE_PATTERN.test(value)) {
            return { error: "A valid phone number is required" };
        }

        data.phoneNumber = value;
    }

    if (has("cin")) {
        const value = body.cin.trim();

        if (!/^\d{8}$/.test(value)) {
            return { error: "CIN must contain exactly 8 digits" };
        }

        data.cin = value;
    }

    if (has("licenseCategory")) {
        const value = body.licenseCategory.trim();

        if (!LICENSE_CATEGORIES.includes(value)) {
            return { error: "Invalid license category" };
        }

        data.licenseCategory = value;
    }

    if (has("licenseNumber")) {
        const value = body.licenseNumber.trim();

        if (value.length < 3 || value.length > 30) {
            return { error: "License number must be between 3 and 30 characters" };
        }

        data.licenseNumber = value;
    }

    if (has("licenseExpiry")) {
        const date = parseDate(body.licenseExpiry);

        if (!date || date.getFullYear() > 2100) {
            return { error: "A valid license expiry date is required" };
        }

        data.licenseExpiry = date;
    }

    if (has("hub")) {
        const value = body.hub.trim();

        if (value.length < 2 || value.length > 80) {
            return { error: "Hub must be between 2 and 80 characters" };
        }

        data.hub = value;
    }

    if (has("address")) {
        const value = body.address.trim();

        if (value.length > 200) {
            return { error: "Address must be 200 characters or fewer" };
        }

        data.address = value;
    }

    if (has("birthDate")) {
        if (body.birthDate === "" || body.birthDate === null) {
            data.birthDate = null;
        } else {
            const date = parseDate(body.birthDate);
            const youngest = new Date();
            youngest.setFullYear(youngest.getFullYear() - 18);

            if (!date || date.getFullYear() < 1900) {
                return { error: "Birth date is not valid" };
            }

            if (date > youngest) {
                return { error: "A driver must be at least 18 years old" };
            }

            data.birthDate = date;
        }
    }

    return { data };
}

async function findDriverDuplicate(data, excludeId) {
    const checks = [
        ["cin", "A driver with this CIN already exists"],
        ["licenseNumber", "A driver with this license number already exists"]
    ];

    for (const [field, message] of checks) {
        if (!data[field]) continue;

        const filter = { role: "driver", [field]: data[field] };

        if (excludeId) {
            filter._id = { $ne: excludeId };
        }

        if (await User.exists(filter)) {
            return message;
        }
    }

    return null;
}

// TODO(missions): once the missions module exists, return true here when the
// driver has at least one mission, so permanent deletion is refused.
async function driverHasMissions() {
    return false;
}

async function getDriverDeletionBlocker(driverId) {
    if (await Vehicle.exists({ assignedDriver: driverId })) {
        return "This driver is assigned to a vehicle. Deactivate the account instead.";
    }

    if (await Vehicle.exists({ "statusHistory.changedBy": driverId })) {
        return "This driver appears in vehicle history. Deactivate the account instead.";
    }

    if (await driverHasMissions(driverId)) {
        return "This driver has missions. Deactivate the account instead.";
    }

    return null;
}

const getUsers = async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === "regional_director") {
            if (!req.user.region) {
                return res.status(403).json({
                    message: "Your account is not assigned to a region"
                });
            }

            filter = {
                role: "driver",
                region: req.user.region
            };
        } else if (req.user.role !== "general_director") {
            return res.status(403).json({
                message: "You do not have permission to view accounts"
            });
        }

        const users = await User.find(filter)
            .select("-googleId")
            .populate("region", "name location regionId status address createdAt")
            .sort({ createdAt: -1 });

        return res.json(users);
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const createUser = async (req, res) => {
    try {
        const { firstName, lastName, email, region } = req.body;

        if (
            typeof firstName !== "string" ||
            typeof lastName !== "string" ||
            typeof email !== "string" ||
            !firstName.trim() ||
            !lastName.trim() ||
            !email.trim() ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            return res.status(400).json({
                message: "Valid first name, last name, and email are required"
            });
        }

        let role;
        let regionId;

        if (req.user.role === "general_director") {
            role = "regional_director";

            if (!region || !mongoose.Types.ObjectId.isValid(region)) {
                return res.status(400).json({
                    message: "A valid region is required for a Regional Director"
                });
            }

            regionId = region;
        } else if (req.user.role === "regional_director") {
            if (!req.user.region) {
                return res.status(403).json({
                    message: "Your account is not assigned to a region"
                });
            }

            role = "driver";
            regionId = req.user.region;
        } else {
            return res.status(403).json({
                message: "You do not have permission to create accounts"
            });
        }

        let driverProfile = {};

        if (role === "driver") {
            const parsed = parseDriverProfile(req.body, { requireAll: true });

            if (parsed.error) {
                return res.status(400).json({
                    message: parsed.error
                });
            }

            driverProfile = parsed.data;

            if (req.body.isActive !== undefined) {
                if (typeof req.body.isActive !== "boolean") {
                    return res.status(400).json({
                        message: "isActive must be a boolean"
                    });
                }

                driverProfile.isActive = req.body.isActive;
            }

            const duplicate = await findDriverDuplicate(driverProfile);

            if (duplicate) {
                return res.status(409).json({
                    message: duplicate
                });
            }
        }

        const regionExists = await Region.exists({
            _id: regionId
        });

        if (!regionExists) {
            return res.status(404).json({
                message: "Region not found"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        const user = await User.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            role,
            region: regionId,
            ...driverProfile,
            createdBy: req.user._id
        });

        const createdUser = await User.findById(user._id)
            .select("-googleId")
            .populate("region", "name location regionId status address createdAt");

        return res.status(201).json(createdUser);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        return res.status(400).json({
            message: error.message
        });
    }
};

const updateUser = async (req, res) => {
    try {
        let filter = {
            _id: req.params.id
        };

        if (req.user.role === "general_director") {
            filter.role = "regional_director";
        } else if (req.user.role === "regional_director") {
            if (!req.user.region) {
                return res.status(403).json({
                    message: "Your account is not assigned to a region"
                });
            }

            filter.role = "driver";
            filter.region = req.user.region;
        } else {
            return res.status(403).json({
                message: "You do not have permission to update accounts"
            });
        }

        const user = await User.findOne(filter);

        if (!user) {
            return res.status(404).json({
                message: "Account not found"
            });
        }

        const allowedFields = [
            "firstName",
            "lastName",
            "email",
            ...(user.role === "driver" ? DRIVER_PROFILE_FIELDS : [])
        ];
        const submittedFields = Object.keys(req.body || {});

        if (
            submittedFields.length === 0 ||
            submittedFields.some(field => !allowedFields.includes(field))
        ) {
            return res.status(400).json({
                message: "Only firstName, lastName, email and driver profile fields can be updated"
            });
        }

        const { firstName, lastName, email } = req.body;

        if (firstName !== undefined) {
            if (typeof firstName !== "string" || !firstName.trim()) {
                return res.status(400).json({
                    message: "First name must be a non-empty string"
                });
            }

            user.firstName = firstName.trim();
        }

        if (lastName !== undefined) {
            if (typeof lastName !== "string" || !lastName.trim()) {
                return res.status(400).json({
                    message: "Last name must be a non-empty string"
                });
            }

            user.lastName = lastName.trim();
        }

        if (email !== undefined) {
            if (
                typeof email !== "string" ||
                !email.trim() ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
            ) {
                return res.status(400).json({
                    message: "A valid email address is required"
                });
            }

            user.email = email.trim().toLowerCase();
        }

        if (user.role === "driver") {
            const parsed = parseDriverProfile(req.body, { requireAll: false });

            if (parsed.error) {
                return res.status(400).json({
                    message: parsed.error
                });
            }

            const duplicate = await findDriverDuplicate(parsed.data, user._id);

            if (duplicate) {
                return res.status(409).json({
                    message: duplicate
                });
            }

            Object.assign(user, parsed.data);
        }

        await user.save();

        const updatedUser = await User.findById(user._id)
            .select("-googleId")
            .populate("region", "name location regionId status address createdAt");

        return res.json(updatedUser);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        return res.status(400).json({
            message: error.message
        });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        if (
            !req.body ||
            typeof req.body !== "object" ||
            Array.isArray(req.body) ||
            Object.keys(req.body).length !== 1 ||
            !Object.hasOwn(req.body, "isActive")
        ) {
            return res.status(400).json({
                message: "Only the isActive field can be updated"
            });
        }

        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                message: "isActive must be a boolean"
            });
        }

        let filter = {
            _id: req.params.id
        };

        if (req.user.role === "general_director") {
            filter.role = "regional_director";
        } else if (req.user.role === "regional_director") {
            if (!req.user.region) {
                return res.status(403).json({
                    message: "Your account is not assigned to a region"
                });
            }

            filter.role = "driver";
            filter.region = req.user.region;
        } else {
            return res.status(403).json({
                message: "You do not have permission to manage accounts"
            });
        }

        const user = await User.findOneAndUpdate(
            filter,
            { $set: { isActive } },
            { new: true, runValidators: true }
        )
            .select("-googleId")
            .populate("region", "name location regionId status address createdAt");

        if (!user) {
            return res.status(404).json({
                message: "Account not found"
            });
        }

        return res.json({
            message: `Account ${isActive ? "activated" : "deactivated"} successfully`,
            user
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        if (req.user.role !== "regional_director") {
            return res.status(403).json({
                message: "You do not have permission to delete accounts"
            });
        }

        if (!req.user.region) {
            return res.status(403).json({
                message: "Your account is not assigned to a region"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                message: "Account not found"
            });
        }

        const driver = await User.findOne({
            _id: req.params.id,
            role: "driver",
            region: req.user.region
        });

        if (!driver) {
            return res.status(404).json({
                message: "Account not found"
            });
        }

        const blocker = await getDriverDeletionBlocker(driver._id);

        if (blocker) {
            return res.status(409).json({
                message: blocker
            });
        }

        await User.deleteOne({ _id: driver._id });

        return res.json({
            message: "Driver deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser
};

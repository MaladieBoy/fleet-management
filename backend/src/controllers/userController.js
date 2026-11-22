const mongoose = require("mongoose");
const User = require("../models/User");
const Region = require("../models/Region");

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
            .populate("region", "name governorate")
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
            createdBy: req.user._id
        });

        const createdUser = await User.findById(user._id)
            .select("-googleId")
            .populate("region", "name governorate");

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

        const allowedFields = ["firstName", "lastName", "email"];
        const submittedFields = Object.keys(req.body || {});

        if (
            submittedFields.length === 0 ||
            submittedFields.some(field => !allowedFields.includes(field))
        ) {
            return res.status(400).json({
                message: "Only firstName, lastName, and email can be updated"
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

        await user.save();

        const updatedUser = await User.findById(user._id)
            .select("-googleId")
            .populate("region", "name governorate");

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
            .populate("region", "name governorate");

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

module.exports = {
    getUsers,
    createUser,
    updateUser,
    updateUserStatus
};

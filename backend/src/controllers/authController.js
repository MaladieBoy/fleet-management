const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function googleLogin(req, res) {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                message: "Google credential is required"
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const normalizedEmail = String(payload.email || "").trim().toLowerCase();

        console.log("Google login email received:", normalizedEmail);

        if (!payload.email_verified) {
            return res.status(401).json({
                message: "Google email is not verified"
            });
        }

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(403).json({
                message: "No account is registered for this Google email"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                message: "Your account is disabled"
            });
        }

        if (user.googleId && user.googleId !== payload.sub) {
            return res.status(403).json({
                message: "This account is linked to another Google identity"
            });
        }

        if (!user.googleId) {
            user.googleId = payload.sub;
            await user.save();
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.json({
            message: "Login successful",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                region: user.region
            }
        });
    } catch (error) {
        console.error("Google login error:", error);

        return res.status(401).json({
            message: "Google authentication failed"
        });
    }
}

async function getCurrentUser(req, res) {
    return res.json({
        user: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            role: req.user.role,
            region: req.user.region
        }
    });
}

async function getProfile(req, res) {
    try {
        const user = await User.findById(req.user._id)
            .populate("region", "name governorate")
            .populate("createdBy", "firstName lastName email");

        if (!user) {
            return res.status(404).json({ message: "Profile not found" });
        }

        return res.json({ user });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

async function updateProfile(req, res) {
    try {
        const { firstName, lastName, phoneNumber } = req.body;

        if (
            typeof firstName !== "string" ||
            typeof lastName !== "string" ||
            (phoneNumber !== undefined && typeof phoneNumber !== "string")
        ) {
            return res.status(400).json({
                message: "First name and last name are required"
            });
        }

        const normalizedFirstName = firstName.trim();
        const normalizedLastName = lastName.trim();
        const normalizedPhoneNumber = phoneNumber === undefined
            ? undefined
            : phoneNumber.trim();

        if (!normalizedFirstName || !normalizedLastName) {
            return res.status(400).json({
                message: "First name and last name cannot be empty"
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "Profile not found" });
        }

        user.firstName = normalizedFirstName;
        user.lastName = normalizedLastName;

        if (normalizedPhoneNumber !== undefined) {
            if (
                normalizedPhoneNumber &&
                !/^\+?[0-9\s().-]{7,20}$/.test(normalizedPhoneNumber)
            ) {
                return res.status(400).json({
                    message: "Please enter a valid phone number."
                });
            }

            user.phoneNumber = normalizedPhoneNumber;
        }

        await user.save();

        const updatedUser = await User.findById(user._id)
            .populate("region", "name governorate")
            .populate("createdBy", "firstName lastName email");

        return res.json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

function logout(req, res) {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });

    return res.json({
        message: "Logged out successfully"
    });
}

module.exports = {
    googleLogin,
    getCurrentUser,
    getProfile,
    updateProfile,
    logout
};

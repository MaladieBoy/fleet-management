const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId)
            .select("-googleId");

        if (!user || !user.isActive) {
            return res.status(401).json({
                message: "Invalid or inactive account"
            });
        }

        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired session"
        });
    }
}

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "You do not have permission to perform this action"
            });
        }

        next();
    };
}

module.exports = {
    protect,
    authorize
};

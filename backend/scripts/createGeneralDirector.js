require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/User");

async function createGeneralDirector() {
    try {
        const firstName = process.env.INITIAL_GD_FIRST_NAME?.trim();
        const lastName = process.env.INITIAL_GD_LAST_NAME?.trim();
        const email = process.env.INITIAL_GD_EMAIL?.trim().toLowerCase();

        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing from .env");
        }

        if (!firstName || !lastName || !email) {
            throw new Error(
                "INITIAL_GD_FIRST_NAME, INITIAL_GD_LAST_NAME, and INITIAL_GD_EMAIL are required"
            );
        }

        await mongoose.connect(process.env.MONGO_URI);

        const existingUsers = await User.countDocuments();

        if (existingUsers > 0) {
            throw new Error(
                "Setup blocked: user accounts already exist."
            );
        }

        const generalDirector = await User.create({
            firstName,
            lastName,
            email,
            role: "general_director",
            isActive: true
        });

        console.log("General Director created successfully!");
        console.log("Email:", generalDirector.email);
        console.log("Role:", generalDirector.role);
    } catch (error) {
        console.error("General Director setup failed:", error.message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

createGeneralDirector();

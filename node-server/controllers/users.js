const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user');

const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const courses = await User.find()
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await User.countDocuments();

        res.status(200).json({
            courses,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const applyToCourse = async (req, res) => {
    try {
        const user = req.user;
        const { courseId } = req.body;

        if (!courseId) {
            return res.status(400).json({ message: "User ID and Course ID are required" });
        }

        const savedUser = await User.findById(user._id);
        if (!savedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        savedUser.appliedCourses.push({ courseId });
        await savedUser.save();

        res.status(200).json({ message: "Course applied successfully", savedUser });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const evaluateCourse = async (req, res) => {
    try {
        const user = req.user;
        const { courseId, marks } = req.body;

        if (!courseId || marks === undefined) {
            return res.status(400).json({ message: "User ID, Course ID, and Marks are required" });
        }

        const savedUser = await User.findById(user._id);
        if (!savedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const course = savedUser.appliedCourses.find(course => course.courseId === courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found in user's applied courses" });
        }

        course.completed = true;
        course.marks = marks;
        await savedUser.save();

        res.status(200).json({ message: "Course evaluated successfully", savedUser });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

module.exports = {
    getCurrentUser,
    getAllUsers,
    applyToCourse,
    evaluateCourse
};


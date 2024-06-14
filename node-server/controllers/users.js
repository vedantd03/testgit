const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user');

const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-_id -password -__v -createdat').exec();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json(user);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const courses = await User.find({ role: 'User' })
            .select('-_id -password -__v -createdat')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await User.countDocuments();

        return res.status(200).json({
            courses,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
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
        console.log(courseId)
        savedUser.appliedCourses.push({ courseId });
        await savedUser.save()
        const userWithoutSensitiveFields = await User.findById(savedUser._id)
            .select('-_id -password -__v -createdAt')
            .lean();

        return res.status(200).json({ message: "Course evaluated successfully", userWithoutSensitiveFields });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
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
        const userWithoutSensitiveFields = await User.findById(savedUser._id)
            .select('-_id -password -__v -createdAt')
            .lean();

        return res.status(200).json({ message: "Course evaluated successfully", userWithoutSensitiveFields });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

module.exports = {
    getCurrentUser,
    getAllUsers,
    applyToCourse,
    evaluateCourse
};


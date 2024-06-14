const dotenv = require('dotenv');
dotenv.config();

const Course = require('../models/course');

const getAllCourses = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const courses = await Course.find()
            .select('-_id -__v')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Course.countDocuments();

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

const getCourse = async (req, res) => {    
    try {
        const course = await Course.findById(req.params.id).select('-_id -__v');
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json(course);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const createCourse = async (req, res) => {
    try {
        const { name, description, coverimage, videolink } = req.body;
        if (!name || !description || !videolink) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }
        const newCourse = new Course({ 
            name, 
            description, 
            coverimage, 
            videolink 
        });
        const savedCourse = await newCourse.save();
        res.status(201).json({ message: "Course created successfully", course: savedCourse });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}


const updateCourse = async (req, res) => {
    try {
        const updates = req.body;
        const updatedCourse = await Course.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );
        if (!updatedCourse) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json({ message: "Course updated successfully", course: updatedCourse });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const deleteCourse = async (req, res) => {
    try {
        const deletedCourse = await Course.findByIdAndDelete(req.params.id);
        if (!deletedCourse) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json({ message: "Course deleted successfully" });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

module.exports = {
    getAllCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse
};
const mongoose = require('mongoose');

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

const appliedCoursesSchema = new mongoose.Schema({
    courseId: {
        type: String,
        required: [true, "Course ID is mandatory"]
    },
    completed: {
        type: Boolean,
        default: false
    },
    marks: {
        type: Number,
        required: function() {
            return this.completed === true;
        },
        validate: {
            validator: function(value) {
                if (this.completed === true && (value === null || value === undefined)) {
                    return false;
                }
                return true;
            },
            message: "Marks are mandatory if the course is completed"
        }
    }
});

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"]
    },
    email: {
        type: String,
        required: [true, "E-mail is mandatory"],
        unique: true,
        validate: {
            validator: validateEmail,
            message: "Email must be from a valid email domain"
        }
    },
    password: {
        type: String,
        required: [true, "Password is mandatory"],
    },
    role: {
        type: String,
        enum: ["User", "Admin"],
        default: "User",
        required: [true, "Role is mandatory"],
    },
    profilePic: {
        type: String,
        default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
    },
    createdat: {
        type: Date,
        default: Date.now
    },
    appliedCourses: {
        type: [appliedCoursesSchema],
        required: function() {
            return this.role === 'User';
        },
        default: function() {
            return this.role === 'User' ? [] : null;
        }
    }
});

userSchema.pre('save', function(next) {
    if (this.role !== 'User') {
        this.appliedCourses = undefined;
    }
    next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
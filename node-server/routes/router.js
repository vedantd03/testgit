const express = require('express');
const multer = require('multer');

const router = express.Router();

const controllerAuth = require("../controllers/auth");
const controllerGenAI = require("../controllers/genai");
const controllerCourses = require("../controllers/courses");
const controllerUsers = require("../controllers/users");

const middleware = require("../middleware/middleware");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage })

// AUTHENTICATION ROUTES (AUTH)
router.get("/login/oauth/google", controllerAuth.handleOAuthLoginTest);
router.get("/session/oauth/google", controllerAuth.oAuthCallbackHandler);
router.post("/login/oauth", controllerAuth.handleOAuthLogin);
router.get('/refresh', controllerAuth.handleRefresh);

router.post("/register", controllerAuth.handleRegister);
router.post("/login", controllerAuth.handleLogin);
router.post("/login/tokenized", controllerAuth.handleTokenizedLogin);
router.post("/logout", controllerAuth.handleLogout);

// COURSE ROUTES (CRUD)
router.route('/course')
    .get(middleware.protect, controllerCourses.getAllCourses)
    .post(middleware.protect, middleware.authorize, controllerCourses.createCourse)

router.route('/course/:id')
    .get(middleware.protect, controllerCourses.getCourse)
    .patch(middleware.protect, middleware.authorize, controllerCourses.updateCourse)
    .delete(middleware.protect, middleware.authorize, controllerCourses.deleteCourse)

// USER ROUTES
router.get('/user', middleware.protect, controllerUsers.getCurrentUser);
router.get('/users', middleware.protect, middleware.authorize, controllerUsers.getAllUsers);

router.post('/apply/course', middleware.protect, controllerUsers.applyToCourse);
router.post('/evaluate/course', middleware.protect, controllerUsers.evaluateCourse);


// GEN AI ROUTES
router.post("/generate/quiz/:id", middleware.protect, controllerGenAI.generateVideoQuiz);
router.post("/generate/summary/:id", middleware.protect, controllerGenAI.generateVideoSummary);
router.post("/generate/answer", middleware.protect, middleware.authorize, controllerGenAI.generateAnswer);
router.post("/chat", middleware.protect, controllerGenAI.haveChat);
router.post("/chat/rag", middleware.protect, controllerGenAI.haveChatWithRAG);


module.exports = router;
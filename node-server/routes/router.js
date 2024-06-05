const express = require('express');
const multer = require('multer');

const router = express.Router();

const controllerAuth = require("../controllers/auth");
const controllerGenAI = require("../controllers/genai");

const middleware = require("../middleware/middleware");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage })

router.get("/login/oauth/google", controllerAuth.handleOAuthLogin);
router.get("/session/oauth/google", controllerAuth.oAuthCallbackHandler);

router.post("/register", controllerAuth.handleRegister);
router.post("/login", controllerAuth.handleLogin);
router.post("/login/tokenized", controllerAuth.handleTokenizedLogin);
router.post("/logout", controllerAuth.handleLogout);

router.post("/generate/quiz", middleware.protect, controllerGenAI.generateVideoQuiz);
router.post("/generate/summary", middleware.protect, controllerGenAI.generateVideoSummary);
router.post("/generate/answer", middleware.protect, middleware.authorize, controllerGenAI.generateAnswer);
router.post("/chat", middleware.protect, controllerGenAI.haveChat);
router.post("/chat/rag", middleware.protect, controllerGenAI.haveChatWithRAG);


module.exports = router;
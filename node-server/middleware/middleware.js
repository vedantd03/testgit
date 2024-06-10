const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

async function generateAccessToken(decodedPayload) {
    const payload = {
        email: decodedPayload.email,
        role: decodedPayload.role,
        profilePic: decodedPayload.profilePic
    };
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_KEY, { expiresIn: '30m' });
    return accessToken;
}

const protect = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;
        const refreshToken = req.cookies.refreshToken;
        if (!accessToken) {
            if (!refreshToken) {
                return res.status(401).json({ message: "Unauthorized" });
            } else {
                try {
                    const decodedRefresh = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_KEY);
                    const newAccessToken = await generateAccessToken(decodedRefresh);
                    res.cookie("accessToken", newAccessToken, {
                        path: '/',
                        maxAge: 60 * 30 * 1000,
                        httpOnly: true,
                        secure: false,
                    });
                    req.user = jwt.verify(newAccessToken, process.env.ACCESS_TOKEN_KEY);
                    return next();
                } catch (refreshError) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }
            }
        } else {
            try {
                const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_KEY);
                req.user = decoded;
                return next();
            } catch (error) {
                if (error.name === "TokenExpiredError") {
                    try {
                        const decodedRefresh = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_KEY);
                        const newAccessToken = await generateAccessToken(decodedRefresh);
                        res.cookie("accessToken", accessToken, {
                            path: '/',
                            maxAge: 60 * 30 * 1000,
                            httpOnly: true,
                            secure: false,
                        });
                        req.user = jwt.verify(newAccessToken, process.env.ACCESS_TOKEN_KEY);
                        return next();
                    } catch (refreshError) {
                        return res.status(401).json({ message: 'Unauthorized' });
                    }
                } else {
                    console.error(error);
                    return res.status(401).json({ message: 'Unauthorized' });
                }
            }
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};

const authorize = async (req, res, next) => {
    try {
        const { role } = req.user;
        if (role === 'Admin') {
            return next();
        } else {
            return res.status(403).json({ message: 'Forbidden' });
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};

module.exports = {
    protect,
    authorize
};
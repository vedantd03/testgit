const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user');

async function handleOAuthRefreshLogin(refreshToken) {
    try{
        const redirectUrl = process.env.OAUTH_REDIRECT_URL;
        const oAuth2Client = new OAuth2Client(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            redirectUrl,
        );
        const newTokenResponse = await oAuth2Client.refreshToken(refreshToken);
        const newAccessToken = newTokenResponse.tokens.id_token
        
        const ticket = await oAuth2Client.verifyIdToken({idToken: newAccessToken, audience: process.env.CLIENT_ID});
        const payload = ticket.getPayload();
        
        const email = payload['email'];

        const user = await User.findOne({ email }).exec();
        if (user){
            const userData = {
                name: user.name,
                email: user.email,
                role: user.role,
            }
            return userData;
        } else{
            return "404 Not Found";
        }
    } catch (err) {
        console.log('Error in signing in with Google:', err);
        return err;
    }
}

async function generateTokens(payload) {
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_KEY, { expiresIn: '30m' });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_KEY, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

async function generateAccessToken(refreshToken) {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_KEY);
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_KEY, { expiresIn: '30m' });
    return accessToken;
}

// use uid in db if not using Firebase
const handleRegister = async (req, res) => {
    try {
        const { name, email, pwd, confpwd, role } = req.body;
        if (!name || !email || !pwd) {
            return res.status(400).json({ message: "All credentials are required" });
        }
        if (pwd !== confpwd) {
            return res.status(401).json({ message: "Unauthorized Access" });
        }
        const foundUser = await User.findOne({ email }).exec();
        if (foundUser) {
            return res.status(422).json({ message: "User already exists" });
        }
        try {
            const hashedPwd = await bcrypt.hash(pwd, 10);
            const newUser = new User({
                name,
                email,
                password: hashedPwd,
                role: role || "User"
            });
            const savedUser = await newUser.save();
            return  res.status(201).json({ message: "User created successfully"});
        }  catch (error) {
            console.error(`Error: ${error.message}`);
            return  res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const handleLogin = async (req, res) => {
    try{
        const { email, pwd } = req.body;
        if (!email || !pwd) {
            return res.status(400).json({ message: "Email and Password are required"});
        }
        const foundUser = await User.findOne({ email }).exec();
        if (!foundUser) {
            return res.status(401).json({ message: "Not Authorized" });
        }
        const match = await bcrypt.compare(pwd, foundUser.password);
        if (match) {
            const userData = {
                _id: foundUser._id,
                email: foundUser.email,
                role: foundUser.role,
                profilePic: foundUser.profilePic
            }
            const { accessToken, refreshToken } = await generateTokens(userData);
            res.cookie("accessToken", accessToken, {
                path: '/',
                maxAge: 60 * 30 * 1000,
                httpOnly: true,
                secure: false,
                sameSite: 'None',
            });
            res.cookie("refreshToken", refreshToken, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7 * 1000,
                httpOnly: true,
                secure: false,
                sameSite: 'None',
            });
            return res.status(200).json({ message: "User Logged in Successfully", userData});
        }  else {
            return res.status(401).json({ message: "Invalid Password" });
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const handleTokenizedLogin = async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken;
        const refreshToken = req.cookies.refreshToken;
        if (!accessToken) {
            if (!refreshToken) {
                return res.status(401).json({ message: "Access and Refresh token not provided" });
            } else {
                const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_KEY);
                const accessToken  = generateAccessToken(refreshToken);
                const isExpired = payload.exp < Date.now() / 1000;
                if (isExpired) {
                    return res.status(401).json({ message: 'Refresh token has expired' });
                } else {
                    res.cookie("accessToken", accessToken, {
                        path: '/',
                        maxAge: 60 * 30 * 1000,
                        httpOnly: true,
                        secure: false,
                    });
                    return res.status(200).json({ message: 'Login successful', payload});
                }
            }
        } else {
            const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_KEY);
            const isExpired = payload.exp < Date.now() / 1000;
            if (isExpired) {
                const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_KEY);
                const accessToken  = generateAccessToken(refreshToken);
                const isExpired = payload.exp < Date.now() / 1000;
                if (isExpired) {
                    return res.status(401).json({ message: 'Refresh token has expired' });
                } else {
                    res.cookie("accessToken", accessToken, {
                        path: '/',
                        maxAge: 60 * 30 * 1000,
                        httpOnly: true,
                        secure: false,
                    });
                    return res.status(200).json({ message: 'Login successful', payload});
                }
            } else {
                return res.status(200).json({ message: 'Login successful', payload});
            }
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
}

const handleOAuthLogin = async (req, res) => {
    try {
        const redirectUrl = process.env.OAUTH_REDIRECT_URL;
        const oAuth2Client = new OAuth2Client(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            redirectUrl,
        );

        const authUrlOptions = {
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
            prompt: 'consent',
        };

        const authorizeUrl = oAuth2Client.generateAuthUrl(authUrlOptions);
        // return res.status(200).send(authorizeUrl)
        return res.redirect(authorizeUrl);

    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
}

const oAuthCallbackHandler = async (req, res) => {
    const code = req.query.code;
    try {
        const redirectUrl = process.env.OAUTH_REDIRECT_URL;
        const oAuth2Client = new OAuth2Client(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            redirectUrl,
        );
        const tokenResponse = await oAuth2Client.getToken(code);
        await oAuth2Client.setCredentials(tokenResponse.tokens);
        const userCredentials = oAuth2Client.credentials;

        //Access token OAuth
        const accessTokenOAuth = userCredentials.id_token;
        //Refresh Token OAuth
        const refreshTokenOAuth = userCredentials.refresh_token;

        const ticket = await oAuth2Client.verifyIdToken({ idToken: accessTokenOAuth, audience: process.env.CLIENT_ID });
        const payload = ticket.getPayload();

        const email = payload['email'];

        const foundUser = await User.findOne({ email }).exec();
        if (!foundUser) {
            return res.status(401).json({ message: "Not Authorized" });
        }
        foundUser.profilePic = payload['picture'];
        await foundUser.save();
        const userData = {
            _id: foundUser._id,
            email: foundUser.email,
            role: foundUser.role,
            profilePic: foundUser.profilePic
        }
        const { accessToken, refreshToken } = await generateTokens(userData);
        res.cookie("accessToken", accessToken, {
            path: '/',
            maxAge: 60 * 30 * 1000,
            httpOnly: true,
            secure: false,
            sameSite: 'None',
        });
        res.cookie("refreshToken", refreshToken, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7 * 1000,
            httpOnly: true,
            secure: false,
            sameSite: 'None',
        });
        let redirectURL;
        if (foundUser.role === 'Admin') {
            redirectURL = process.env.CLIENT_URL + `/admin/home`;
        } else {
            redirectURL = process.env.CLIENT_URL + `/user/home`;
        }
        // const encodedUserInfo = encodeURIComponent(JSON.stringify(userData));
        // const redirectURL = process.env.CLIENT_URL + `/student/details?userInfo=${encodedUserInfo}`;
        res.redirect(redirectURL);
        // return res.status(200).json({ message: "User Logged in Successfully", userData});

    } catch (err) {
        console.log('Error in signing in with Google:', err);
        return res.status(500).send('Error during authentication');
    }
}

const handleLogout = (req, res) => {
    try {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};

module.exports = {
    handleRegister,
    handleLogin,
    handleTokenizedLogin,
    handleOAuthLogin,
    oAuthCallbackHandler,
    handleLogout
};
const isDev = process.env.ENVIROMENT === "dev"

const out = require("../helpers/Logging");
const db = require("./db");
const hashingService = require("./Services/hashing")
const jwt = require("./Services/jwt")

const base = isDev
    ? { secure: false, sameSite: 'Lax' }
    : { domain: '.niqbit.com', secure: true, sameSite: 'None' };

const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;
const TEN_DAYS  = 1000 * 60 * 60 * 24 * 10;

function attachPublicCookie(res, name, value, options = {}) {
    res.cookie(name, value, {
        ...base,
        httpOnly: false,
        maxAge: SEVEN_DAYS,
        ...options,
    });
}

function attachPrivateCookie(res, name, value, options = {}) {
    res.cookie(name, value, {
        ...base,
        httpOnly: true,
        maxAge: SEVEN_DAYS,
        ...options,
    });
}

// ======== ENDPOINTS ========

const login = async (req, res) => {
    out.log("Got request on login")

    const bodyjson = req.body

    const user = await db.getUserByEmail(bodyjson.email)
    if (!user) {
        res.status(401).json({ short: "Unauthorized", message: "Invalid email or Password"})
        return
    }

    if (!hashingService.comparePassword(bodyjson.password, user.pwhsh)) {
        res.status(401).json({ short: "Unauthorized", message: "Invalid email or Password"})
        return
    }

    const accessToken = jwt.signAccessToken(user.user_id, user.email)
    const refreshToken = jwt.signRefreshToken(user.user_id)
    const tokenExists = await db.validTokenExists(user.user_id)
    console.log(tokenExists)
    if (tokenExists !== undefined) {
        await db.invalidateToken(tokenExists)
    }
    await db.insertToken(user.user_id, refreshToken)

    attachPublicCookie(res, 'accessToken', accessToken);
    attachPrivateCookie(res, 'refreshToken', refreshToken);
    attachPublicCookie(res, 'userId', user.user_id);
    attachPublicCookie(res, 'username', user.name);
    res.status(200).json({ short: "Sucess", message: "Logged in sucessfully!", accessToken})
}

const register = async (req, res) => {
    out.log("Got request on register")

    const bodyjson = req.body

    const user = await db.getUserByEmail(bodyjson.email)
    if (user) {
        res.status(409).json({ short: "Conflict", message: "Email already registered"})
        return
    }

    const pwhsh = await hashingService.hashPassword(bodyjson.password)

    const userId = await db.createUser(bodyjson.email, pwhsh)

    const email = bodyjson.email

    attachPublicCookie(res, 'userId', userId, { maxAge: TEN_DAYS });

    res.status(201).json({ short: "Created", message: "Registration sucessful", userId, email})
}

const logout = async (req, res) => {
    out.log("Got request on logout")

    const cookies = req.cookies
    const refreshToken = cookies.refreshToken

    const isVerified = jwt.validateRefreshToken(refreshToken)
    if (!isVerified) {
        return res.status(402).json({ short: "Unauthorized", message: "Invalid authentication token"})
    }

    const userId = jwt.decodeRefreshToken(refreshToken).userId
    await db.invalidateToken(refreshToken)
    res.clearCookie("refreshToken")
    res.clearCookie("username")
    res.clearCookie("accessToken")
    res.clearCookie("userId")
    res.status(200).json({ short: "OK", message: "Sucessfully logged out!"})
}

module.exports = {
    register,
    login,
    logout
}
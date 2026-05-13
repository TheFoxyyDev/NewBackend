const jwt = require('jsonwebtoken')
const trace_events = require("node:trace_events");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET
const REFRESH_EXPIRY_DAYS = process.env.REFRESH_EXPIRY_DAYS

function signAccessToken(userId, email) {
    return jwt.sign({userId, email}, ACCESS_TOKEN_SECRET, { expiresIn: "15m" })
}

function signRefreshToken(userId) {
    return jwt.sign({userId}, REFRESH_TOKEN_SECRET, {expiresIn: `${REFRESH_EXPIRY_DAYS}d`})
}

function validateAccessToken(accessToken) {
    return jwt.verify(accessToken, ACCESS_TOKEN_SECRET)
}

function validateRefreshToken(refreshToken) {
    return jwt.verify(refreshToken, REFRESH_TOKEN_SECRET)
}

function decodeAccessToken(accessToken) {
    return jwt.decode(accessToken, ACCESS_TOKEN_SECRET)
}

function decodeRefreshToken(refreshToken) {
    return jwt.decode(refreshToken, REFRESH_TOKEN_SECRET)
}

module.exports = {
    signAccessToken,
    signRefreshToken,
    validateAccessToken,
    validateRefreshToken,
    decodeAccessToken,
    decodeRefreshToken
}
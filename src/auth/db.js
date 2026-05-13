const out = require('../helpers/Logging')
const Database = require('better-sqlite3')

const AUTH_DATABASE_NAME = process.env.AUTH_DATABASE_NAME
const REFRESH_EXPIRY_DAYS = process.env.REFRESH_EXPIRY_DAYS

const db = new Database(`${AUTH_DATABASE_NAME}.db`)

function initDB() {
    out.info(`Setting up ${AUTH_DATABASE_NAME} Database`)
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            email TEXT UNIQUE NOT NULL,
            pwhsh TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sessions (
            refresh_token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            revoked INTEGER NOT NULL DEFAULT 0
        )
    `);
    out.info(`Finished Setting up ${AUTH_DATABASE_NAME}`)
}

async function getUserByEmail(email) {
    return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email)
}

async function createUser(email, pwhsh) {
    db.prepare(`INSERT INTO users (email, pwhsh) VALUES (?, ?)`).run(email, pwhsh)
    const id =  db.prepare(`SELECT user_id FROM users WHERE email = ?`).get(email).user_id
    console.log(id)
    db.prepare(`UPDATE users SET name = ? WHERE user_id = ?`).run("user"+id, id)
    return id
}

async function validTokenExists(userId) {
    return db.prepare(`SELECT refresh_token FROM sessions WHERE user_id = ? AND revoked = 0`).get(userId)
}

async function isTokenValid(token) {
    return db.prepare(`SELECT user_id FROM sessions WHERE token = ? AND revoked = 0`).get(token)
}

async function invalidateToken(token) {
    db.prepare(`UPDATE sessions SET revoked = 1 WHERE refresh_token = ?`).run(token.refresh_token)
}

async function insertToken(userId, token) {
    const expires_at = Math.floor(Date.now() / 1000) + REFRESH_EXPIRY_DAYS;
    db.prepare(`INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)`).run(userId, token, expires_at)
}

module.exports = {
    initDB,
    getUserByEmail,
    createUser,
    validTokenExists,
    isTokenValid,
    insertToken,
    invalidateToken
}
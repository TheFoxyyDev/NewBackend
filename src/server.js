require('dotenv').config();
const auth = require('./auth/db.js')
const sguess = require('./songguessr/getDailySong.js')

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const cron = require('node-cron')
const routes = require('./routes')
const out = require("./helpers/Logging");

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://sguess.niqbit.com"
    ],
    credentials: true,
}))
app.use(routes)

// ===== SETUP =====

// ----- Databases -----
auth.initDB()
sguess.initDB()

// ----- CRON -----
cron.schedule('0 0 * * *', sguess.refreshDailySong)

app.listen(PORT, () => {
    out.info(`Server started on port ${PORT}`)
})
const express = require('express')
const router = express.Router()
const auth = require('./auth/endpoints')
const sguess = require('./songguessr/endpoints')

// ========== ROUTES =========

// ----- User Management -----
let prefix = "auth"
router.post(`/${prefix}/login`, auth.login)
router.post(`/${prefix}/register`, auth.register)
router.post(`/${prefix}/logout`, auth.logout)

// ----- Song Guesser -----
prefix = "sguess"
router.post(`/${prefix}/search`, sguess.search)
router.get(`/${prefix}/daily`, sguess.daily)

// ===========================

module.exports = router
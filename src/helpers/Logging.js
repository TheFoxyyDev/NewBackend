const log = (message) => {
    console.log(`[LOG] ${message}`)
}

const info = (message) => {
    console.info(`[INFO] ${message}`)
}

const debug = (message) => {
    console.log(`[DEBUG] ${message}`)
}

module.exports = {
    log,
    info,
    debug
}
const Database = require('better-sqlite3')
const db = new Database(process.env.SONG_DATABASE_NAME + ".db")

function initDB() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS daily_songs (
            url TEXT PRIMARY KEY,
            last_used TEXT,
            play_count INTEGER DEFAULT 0
        )
    `)
}

function updateSong(url) {
    db.prepare(`
        UPDATE daily_songs
        SET last_used = ?, play_count = play_count + 1
        WHERE url = ?
    `).run(new Date().toISOString(), url)
}

function chooseSong() {
    const songs = db.prepare(`SELECT * FROM daily_songs`).all()

    if (songs.length === 0) return null

    const now = Date.now()

    const weighted = songs.map(song => {
        const daysSincePlayed = song.last_used
            ? (now - new Date(song.last_used).getTime()) / (1000 * 60 * 60 * 24)
            : 999

        const recencyScore = Math.log1p(daysSincePlayed)
        const popularityScore = 1 / (song.play_count + 1)

        return { song, weight: recencyScore * popularityScore }
    })

    const totalWeight = weighted.reduce((sum, e) => sum + e.weight, 0)
    let rand = Math.random() * totalWeight

    for (const entry of weighted) {
        rand -= entry.weight
        if (rand <= 0) return entry.song
    }

    return weighted[weighted.length - 1].song
}

function getDailySong() {
    return db.exec(`SELECT url FROM daily_songs WHERE last_used = 'now'`)
}

function refreshDailySong() {
    const chosenSong = chooseSong()
    updateSong(chosenSong.url)
    db.prepare(`UPDATE daily_songs SET url = ? WHERE last_used = 'now'`).run(chosenSong.url)
}

module.exports = {
    initDB,
    getDailySong,
    refreshDailySong
}
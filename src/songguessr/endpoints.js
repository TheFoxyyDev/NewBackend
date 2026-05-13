const out = require('../helpers/Logging.js')
const db = require('./getDailySong.js')

let cachedToken   = null;
let tokenExpiresAt = 0; // Unix ms

async function getSpotifyToken() {
    if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
        return cachedToken;
    }

    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars");
    }

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method:  "POST",
        headers: {
            "Content-Type":  "application/x-www-form-urlencoded",
            "Authorization": "Basic " + Buffer.from(
                `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
            ).toString("base64"),
        },
        body: "grant_type=client_credentials",
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Spotify token error ${res.status}: ${text}`);
    }

    const data      = await res.json();
    cachedToken     = data.access_token;
    tokenExpiresAt  = Date.now() + data.expires_in * 1000; // expires_in in seconds
    return cachedToken;
}

function formatTracks(data) {
    const tracks = data.tracks?.items ?? [];

    const sorted = [...tracks].sort((a, b) => b.popularity - a.popularity);

    const seen   = new Set();
    const result = [];

    for (const track of sorted) {
        const artist = track.artists?.[0]?.name ?? "Unknown Artist";
        const title  = track.name ?? "Unknown";
        const label  = `${artist} - ${title}`;

        if (seen.has(label)) continue;
        seen.add(label);

        result.push({ label, artist, title, popularity: track.popularity });
    }

    return result;
}

// ===== ENDPOINTS =====

const search = async (req, res) => {
    out.log("Got request on search")
    const {query} = req.body ?? {};

    if (!query || typeof query !== "string" || query.trim().length < 2) {
        return res.status(400).json({error: "query must be at least 2 characters"});
    }

    try {
        const token = await getSpotifyToken();

        const spotifyRes = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query.trim())}&type=track&limit=10`,
            {headers: {Authorization: `Bearer ${token}`}}
        );

        if (!spotifyRes.ok) {
            if (spotifyRes.status === 401) {
                cachedToken = null;
                tokenExpiresAt = 0;
                const freshToken = await getSpotifyToken();
                const retry = await fetch(
                    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query.trim())}&type=track&limit=10`,
                    {headers: {Authorization: `Bearer ${freshToken}`}}
                );
                if (!retry.ok) throw new Error(`Spotify search error ${retry.status}`);
                return res.json(formatTracks(await retry.json()));
            }
            throw new Error(`Spotify search error ${spotifyRes.status}`);
        }

        return res.json(formatTracks(await spotifyRes.json()));
    } catch (err) {
        console.error("[sguess/search]", err.message);
        res.status(502).json({error: "Search failed"});
    }
}

const daily = async (req, res) => {
    out.log("Got request on daily")

    const dailySongUrl = await db.getDailySong()
    res.status(200).json({short: "OK", url: dailySongUrl})
}

module.exports = {
    search,
    daily
}
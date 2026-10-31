# Sales Rush — Multiplayer Sales Arena

A real-time multiplayer sales competition. Players create or join a shared room, prospect for leads, answer timed buyer questions, and compete on a live leaderboard during a 10-minute round.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder, run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000`.
5. Open the site in multiple browsers/devices. One player creates a room and shares the code; everyone else joins that code.

## Deploy as a shareable website

This app uses a Node.js HTTP server and WebSockets, so deploy it to a host that supports persistent Node processes and WebSocket connections (for example, Render, Railway, or a VPS). Set the start command to `npm start`. The host must support WebSockets; static-only hosting is not sufficient for live multiplayer.

## Game rules

- 10-minute shared room timer, started when the first player joins.
- $25,000 personal sales quota.
- 5-second window for each buyer decision.
- Correct answers award 100 points; fast answers add a 250-point bonus.
- Closing a deal adds its revenue and a deal-value score bonus.

## MVP limitations

Rooms and scores are held in server memory. Restarting the server clears them. This version has no accounts, persistent global rankings, matchmaking, or anti-cheat validation.

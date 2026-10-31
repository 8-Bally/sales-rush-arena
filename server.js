const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const ROUND_MS = 10 * 60 * 1000;
const rooms = new Map();

function roomFor(code) {
  if (!rooms.has(code)) {
    rooms.set(code, { code, startedAt: Date.now(), players: new Map() });
  }
  return rooms.get(code);
}

function cleanName(name) {
  return String(name || 'Player').trim().slice(0, 18) || 'Player';
}

function leaderboard(room) {
  return [...room.players.values()]
    .map(p => ({ id: p.id, name: p.name, score: p.score, deals: p.deals, revenue: p.revenue, quota: p.quota }))
    .sort((a,b) => b.score - a.score);
}

function broadcast(room, msg) {
  const data = JSON.stringify(msg);
  for (const p of room.players.values()) if (p.ws.readyState === WebSocket.OPEN) p.ws.send(data);
}

function startRound(room) {
  if (!room.timer) {
    room.startedAt = Date.now();
    room.timer = setInterval(() => {
      const remaining = Math.max(0, ROUND_MS - (Date.now() - room.startedAt));
      broadcast(room, { type: 'tick', remaining });
      if (!remaining) {
        clearInterval(room.timer); room.timer = null;
        broadcast(room, { type: 'ended', leaderboard: leaderboard(room) });
      }
    }, 250);
  }
}

const server = http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  file = path.normalize(file).replace(/^\.+/, '');
  const full = path.join(__dirname, 'public', file);
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(full);
    const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });
let nextId = 1;

wss.on('connection', ws => {
  const id = String(nextId++);
  let player = null;
  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join') {
      const code = String(msg.room || 'SALES').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8) || 'SALES';
      const room = roomFor(code);
      player = { id, ws, name: cleanName(msg.name), score: 0, deals: 0, revenue: 0, quota: 25000 };
      room.players.set(id, player);
      startRound(room);
      ws.send(JSON.stringify({ type:'joined', id, room:code, remaining: Math.max(0, ROUND_MS-(Date.now()-room.startedAt)), leaderboard:leaderboard(room) }));
      broadcast(room, { type:'leaderboard', leaderboard:leaderboard(room) });
    }

    if (!player) return;
    const room = [...rooms.values()].find(r => r.players.get(id) === player);
    if (!room) return;

    if (msg.type === 'score') {
      const points = Math.max(0, Math.min(5000, Number(msg.points) || 0));
      const revenue = Math.max(0, Math.min(20000, Number(msg.revenue) || 0));
      player.score += points;
      player.revenue += revenue;
      if (msg.deal) player.deals += 1;
      broadcast(room, { type:'leaderboard', leaderboard:leaderboard(room) });
    }
  });

  ws.on('close', () => {
    if (player) {
      const room = [...rooms.values()].find(r => r.players.get(id) === player);
      if (room) {
        room.players.delete(id);
        broadcast(room, { type:'leaderboard', leaderboard:leaderboard(room) });
        if (!room.players.size) { clearInterval(room.timer); rooms.delete(room.code); }
      }
    }
  });
});

server.listen(PORT, () => console.log(`Sales Rush running on http://localhost:${PORT}`));

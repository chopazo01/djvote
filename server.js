const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Estado compartido en memoria ──
let state = {
  phase: 'idle',       // 'idle' | 'selecting' | 'voting' | 'winner'
  songs: [],
  votes: {},
  winner: null,
  timerStart: null,
  timerDuration: 60,   // default, el DJ lo puede cambiar
};

// Votos por IP para evitar votar múltiples veces
let votedIPs = new Set();

// ── Broadcast a todos los clientes conectados ──
function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(data);
  });
}

// ── WebSocket ──
wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

  // Al conectar, enviar estado actual + si ya votó
  ws.send(JSON.stringify({
    type: 'state',
    state,
    hasVoted: votedIPs.has(ip),
  }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'dj:set_songs': {
        state.songs = msg.songs.slice(0, 3);
        state.votes = {};
        state.winner = null;
        state.phase = 'selecting';
        broadcast({ type: 'state', state, hasVoted: false });
        break;
      }

      case 'dj:start_voting': {
        if (state.songs.length === 0) return;
        const duration = parseInt(msg.duration) || 60;
        state.phase = 'voting';
        state.votes = {};
        state.timerDuration = duration;
        state.timerStart = Date.now();
        votedIPs = new Set(); // reset votos al iniciar nueva ronda
        broadcast({ type: 'state', state, hasVoted: false });

        setTimeout(() => {
          if (state.phase !== 'voting') return;
          finishVoting();
        }, duration * 1000);
        break;
      }

      case 'user:vote': {
        if (state.phase !== 'voting') return;
        if (votedIPs.has(ip)) {
          // Ya votó, ignorar
          ws.send(JSON.stringify({ type: 'already_voted' }));
          return;
        }
        const { songId } = msg;
        if (!state.songs.find(s => s.id === songId)) return;
        state.votes[songId] = (state.votes[songId] || 0) + 1;
        votedIPs.add(ip);
        broadcast({ type: 'votes', votes: state.votes });
        ws.send(JSON.stringify({ type: 'vote_confirmed' }));
        break;
      }

      case 'dj:new_round': {
        state = { phase: 'idle', songs: [], votes: {}, winner: null, timerStart: null, timerDuration: 60 };
        votedIPs = new Set();
        broadcast({ type: 'state', state, hasVoted: false });
        break;
      }
    }
  });
});

function finishVoting() {
  let winner = state.songs[0];
  let maxVotes = -1;
  state.songs.forEach(s => {
    const v = state.votes[s.id] || 0;
    if (v > maxVotes) { maxVotes = v; winner = s; }
  });
  state.winner = { ...winner, totalVotes: maxVotes };
  state.phase = 'winner';
  broadcast({ type: 'state', state });
}

// ── Proxy Spotify ──
app.post('/api/spotify-token', async (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (!clientId || !clientSecret) return res.status(400).json({ error: 'Credenciales requeridas' });
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error || 'Error' });
    res.json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (err) {
    res.status(500).json({ error: 'Error conectando con Spotify' });
  }
});

server.listen(PORT, () => {
  console.log(`\n  🎧 DJ Vote App corriendo en:\n`);
  console.log(`  → http://localhost:${PORT}          (Pantalla principal)`);
  console.log(`  → http://localhost:${PORT}/#dj       (Panel del DJ)`);
  console.log(`  → http://localhost:${PORT}/#user     (Votación / QR)\n`);
});

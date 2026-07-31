const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let suggestions = []; // [{ id, name, artist, image, count }]
let submittedIPs = new Set();

function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(data); });
}

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  ws.send(JSON.stringify({ type: 'state', suggestions, hasSubmitted: submittedIPs.has(ip) }));

  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'user:suggest') {
      if (submittedIPs.has(ip)) { ws.send(JSON.stringify({ type: 'already_submitted' })); return; }
      const name = (msg.name || '').trim().slice(0, 100);
      if (!name) return;
      const existing = suggestions.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (existing) { existing.count++; }
      else { suggestions.push({ id: msg.id || name, name, artist: msg.artist || '', image: msg.image || '', count: 1 }); }
      submittedIPs.add(ip);
      suggestions.sort((a, b) => b.count - a.count);
      broadcast({ type: 'state', suggestions, hasSubmitted: false });
      ws.send(JSON.stringify({ type: 'submit_confirmed' }));
    }

    if (msg.type === 'dj:reset') {
      suggestions = [];
      submittedIPs = new Set();
      broadcast({ type: 'state', suggestions, hasSubmitted: false });
    }
  });
});

// Proxy Spotify
app.post('/api/spotify-token', async (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (!clientId || !clientSecret) return res.status(400).json({ error: 'Credenciales requeridas' });
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64') },
      body: 'grant_type=client_credentials',
    });
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: d.error || 'Error' });
    res.json({ access_token: d.access_token, expires_in: d.expires_in });
  } catch { res.status(500).json({ error: 'Error Spotify' }); }
});

server.listen(PORT, () => {
  console.log(`\n  🎧 DJ Requests corriendo en http://localhost:${PORT}\n`);
});

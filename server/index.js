const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const ordersRouter = require('./routes/orders');

const basicAuth = require('express-basic-auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const adminAuth = (req, res, next) => {
    return basicAuth({
        users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
        challenge: true
    })(req, res, next);
};

app.use(cors(process.env.PUBLIC_SITE_URL ? { origin: [process.env.PUBLIC_SITE_URL] } : {}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Uploaded customer images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin dashboard (Protected with Basic Auth)
app.use('/admin', adminAuth, express.static(path.join(__dirname, '..', 'admin')));

// Customer-facing site
app.use(express.static(path.join(__dirname, '..')));

const wsClients = new Set();
wss.on('connection', (ws) => {
    wsClients.add(ws);
    console.log(`[WS] Admin client connected. Total clients: ${wsClients.size}`);
    ws.on('close', () => {
        wsClients.delete(ws);
        console.log(`[WS] Admin client disconnected. Total clients: ${wsClients.size}`);
    });
});

const broadcastWS = (data) => {
    const message = JSON.stringify(data);
    for (const client of wsClients) {
        if (client.readyState === 1) { // OPEN
            client.send(message);
        }
    }
};

app.set('broadcastWS', broadcastWS);

// Orders API
app.use('/api/orders', ordersRouter);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`
===================================================
✨ One More Shot Polaroid Studio Server is LIVE ✨
- Customer Site:   http://localhost:${PORT}/
- Admin Dashboard: http://localhost:${PORT}/admin
- API Endpoint:    http://localhost:${PORT}/api/orders
- WebSocket Feed:  ws://localhost:${PORT}
===================================================
    `);
});

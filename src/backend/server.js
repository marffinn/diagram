import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import WebSocket, { WebSocketServer } from 'ws'; // Add WebSocket

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const dbDir = join(__dirname, '..', 'db');
mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(join(dbDir, 'purple.db'), (err) => {
    if (err) console.error(err);
    console.log('Connected to SQLite database');
});

// WebSocket Server
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('close', () => console.log('WebSocket client disconnected'));
});

const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

const initDb = () => {
    const tables = [
        `users (id INTEGER PRIMARY KEY AUTOINCREMENT, googleId TEXT UNIQUE, displayName TEXT, avatar TEXT)`,
        `clients (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, name TEXT, emails TEXT, phones TEXT, note TEXT, data TEXT, FOREIGN KEY (userId) REFERENCES users(id))`,
        `nodes (id TEXT PRIMARY KEY, type TEXT, x REAL, y REAL, clientId INTEGER, userId INTEGER, data TEXT, FOREIGN KEY (clientId) REFERENCES clients(id), FOREIGN KEY (userId) REFERENCES users(id))`, // Fixed
        `edges (id TEXT PRIMARY KEY, source TEXT, target TEXT, userId INTEGER, FOREIGN KEY (source) REFERENCES nodes(id), FOREIGN KEY (target) REFERENCES nodes(id), FOREIGN KEY (userId) REFERENCES users(id))`,
    ];
    db.serialize(() => tables.forEach(table => db.run(`CREATE TABLE IF NOT EXISTS ${table}`, (err) => {
        if (err) console.error(`Error creating table ${table}:`, err);
    })));
};
initDb();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Cookie'] }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    store: new (connectSqlite3(session))({ db: 'sessions.db', dir: dbDir }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport setup (unchanged)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    db.get('SELECT * FROM users WHERE googleId = ?', [profile.id], (err, row) => {
        if (err) return done(err);
        if (row) return done(null, row);

        db.run('INSERT INTO users (googleId, displayName, avatar) VALUES (?, ?, ?)', [profile.id, profile.displayName, profile.photos[0].value], function (err) {
            if (err) return done(err);
            const userId = this.lastID;
            const timestamp = Date.now();
            const initialNodes = [
                [`${userId}-user-node`, 'user', 300, 200, null, userId, { avatar: profile.photos[0].value, name: profile.displayName }],
                [null, null, null, null, null, userId, { name: 'Demo Client', emails: ['demo@example.com'], phones: ['123-456-7890'], note: 'Needs follow-up' }],
                [`${userId}-note-${timestamp}`, 'note', 400, 400, null, userId, { notes: 'Welcome to PurpleCRM!' }],
            ];
            const initialEdges = [
                [`${userId}-edge-${timestamp}-1`, `${userId}-user-node`, `${userId}-customer-${timestamp}`],
                [`${userId}-edge-${timestamp}-2`, `${userId}-customer-${timestamp}`, `${userId}-note-${timestamp}`],
            ];

            db.serialize(() => {
                initialNodes.forEach(([id, type, x, y, clientId, userId, data]) => {
                    if (!id) {
                        db.run('INSERT INTO clients (userId, name, emails, phones, note) VALUES (?, ?, ?, ?, ?)',
                            [userId, data.name, JSON.stringify(data.emails), JSON.stringify(data.phones), data.note], function (err) {
                                if (err) console.error('Error creating client:', err);
                                else {
                                    db.run('INSERT INTO nodes (id, type, x, y, clientId, userId) VALUES (?, ?, ?, ?, ?, ?)',
                                        [`${userId}-customer-${timestamp}`, 'customer', 500, 300, this.lastID, userId], (err) => {
                                            if (err) console.error('Error inserting customer node:', err);
                                        });
                                }
                            });
                    } else {
                        db.run('INSERT INTO nodes (id, type, x, y, userId, data) VALUES (?, ?, ?, ?, ?, ?)',
                            [id, type, x, y, userId, JSON.stringify(data)], (err) => {
                                if (err) console.error(`Error inserting ${type} node:`, err);
                            });
                    }
                });
                initialEdges.forEach(([id, source, target]) => {
                    db.run('INSERT INTO edges (id, source, target, userId) VALUES (?, ?, ?, ?)', [id, source, target, userId], (err) => {
                        if (err) console.error('Error inserting edge:', err);
                    });
                });
            });
            return done(null, { id: userId, googleId: profile.id, displayName: profile.displayName, avatar: profile.photos[0].value });
        });
    });
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => db.get('SELECT * FROM users WHERE id = ?', [id], done));

// Auth routes (unchanged)
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: 'http://localhost:5173' }), (req, res) => {
    console.log('Callback user:', req.user);
    res.redirect('http://localhost:5173');
});

const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ message: 'Not authenticated' });

// Existing API routes (unchanged)
app.get('/api/user', requireAuth, (req, res) => res.json(req.user));
app.get('/api/logout', (req, res) => req.logout((err) => err ? res.status(500).json({ error: 'Logout failed' }) : req.session.destroy((err) => err ? res.status(500).json({ error: 'Session destruction failed' }) : res.json({ message: 'Logged out' }))));

app.get('/api/nodes', requireAuth, (req, res) => {
    db.all('SELECT n.*, c.name, c.emails, c.phones, c.note FROM nodes n LEFT JOIN clients c ON n.clientId = c.id WHERE n.userId = ?', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        res.json(rows.map(row => ({
            id: row.id,
            type: row.type,
            position: { x: row.x, y: row.y },
            data: row.clientId ? {
                client_name: row.name,
                client_emails: row.emails ? JSON.parse(row.emails) : [],
                client_phones: row.phones ? JSON.parse(row.phones) : [],
                client_note: row.note || ''
            } : row.data ? JSON.parse(row.data) : {}
        })));
    });
});

app.get('/api/edges', requireAuth, (req, res) => db.all('SELECT * FROM edges WHERE userId = ?', [req.user.id], (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows)));

app.post('/api/nodes', requireAuth, (req, res) => {
    const { id, type, x, y, client_name, client_emails, client_phones, client_note, notes, created_at, avatar, name, contractor_name, services, emails, numbers, price_suggested } = req.body;
    if (type === 'customer') {
        db.run('INSERT INTO clients (userId, name, emails, phones, note) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, client_name, JSON.stringify(client_emails || []), JSON.stringify(client_phones || []), client_note || ''], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                db.run('INSERT INTO nodes (id, type, x, y, clientId, userId) VALUES (?, ?, ?, ?, ?, ?)',
                    [id, type, x, y, this.lastID, req.user.id], (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: 'Node created', nodeId: id }));
            });
    } else {
        const data = type === 'contractor'
            ? { contractor_name, services, emails, numbers, price_suggested, created_at }
            : { notes, created_at, avatar, name };
        db.run('INSERT INTO nodes (id, type, x, y, userId, data) VALUES (?, ?, ?, ?, ?, ?)',
            [id, type, x, y, req.user.id, JSON.stringify(data)], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Node created', nodeId: id });
            });
    }
});

app.put('/api/nodes/:id', requireAuth, (req, res) => {
    const { x, y, type, client_name, client_emails, client_phones, client_note, notes, created_at, avatar, name, contractor_name, services, emails, numbers, price_suggested } = req.body;
    db.get('SELECT clientId, type, x, y, data FROM nodes WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ message: 'Node not found' });

        const currentData = row.data ? JSON.parse(row.data) : {};
        let updatedData;
        if (type === 'customer') {
            updatedData = null;
        } else if (type === 'contractor') {
            updatedData = { ...currentData, contractor_name, services, emails, numbers, price_suggested, created_at };
        } else {
            updatedData = { ...currentData, notes, created_at, avatar, name };
        }
        const dataJson = updatedData ? JSON.stringify(updatedData) : null;

        db.run('UPDATE nodes SET x = ?, y = ?, type = ?, data = ? WHERE id = ?',
            [x ?? row.x, y ?? row.y, type || row.type, dataJson ?? row.data, req.params.id],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                if (row.clientId && type === 'customer') {
                    db.run('UPDATE clients SET name = ?, emails = ?, phones = ?, note = ? WHERE id = ?',
                        [client_name, JSON.stringify(client_emails || []), JSON.stringify(client_phones || []), client_note || '', row.clientId],
                        (err) => {
                            if (err) return res.status(500).json({ error: err.message });
                            res.json({ message: 'Customer node updated' });
                        });
                } else {
                    console.log(`Updated node ${req.params.id}:`, updatedData);
                    res.json({ message: 'Node updated' });
                }
            });
    });
});

app.delete('/api/nodes/:id', requireAuth, (req, res) => {
    db.get('SELECT clientId FROM nodes WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ message: 'Node not found' });
        db.run('DELETE FROM nodes WHERE id = ?', [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            const deleteEdges = () => db.run('DELETE FROM edges WHERE source = ? OR target = ?', [req.params.id, req.params.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: row.clientId ? 'Node and related data deleted' : 'Node and related edges deleted' });
            });
            if (row.clientId) db.run('DELETE FROM clients WHERE id = ?', [row.clientId], (err) => err ? res.status(500).json({ error: err.message }) : deleteEdges());
            else deleteEdges();
        });
    });
});

app.post('/api/edges', requireAuth, (req, res) => {
    const { source, target } = req.body;
    if (!source || !target) return res.status(400).json({ error: 'Source and target required' });
    const id = `edge-${Date.now()}`;
    db.run('INSERT INTO edges (id, source, target, userId) VALUES (?, ?, ?, ?)', [id, source, target, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Edge created', edgeId: id });
    });
});

app.get('/incoming-call', (req, res) => {
    const { number } = req.query;
    const cleanNumber = number.replace(/[^0-9]/g, '');
    console.log(`Call from: ${number} (normalized: ${cleanNumber})`);
    console.log(`User: ${req.user ? req.user.id : 'Not authenticated'}`);

    db.all(`
        SELECT n.id, n.type, n.data, n.userId, c.name AS client_name, c.phones AS client_phones 
        FROM nodes n 
        LEFT JOIN clients c ON n.clientId = c.id 
        WHERE n.type = 'customer' OR n.type = 'contractor'`,
        [],
        (err, rows) => {
            if (err) {
                console.error('Error checking caller:', err);
                res.sendStatus(500);
                return;
            }
            if (!rows || rows.length === 0) {
                console.log('No customer or contractor nodes found in database');
                res.json({ found: false });
                return;
            }

            let found = false;
            let nodeId = null;
            for (const row of rows) {
                if (row.type === 'customer' && row.client_phones) {
                    const phones = JSON.parse(row.client_phones);
                    if (phones.some(phone => phone.replace(/[^0-9]/g, '') === cleanNumber)) {
                        console.log(`Call identified as: Customer - ${row.client_name} (userId: ${row.userId})`);
                        found = true;
                        nodeId = row.id;
                        break;
                    }
                } else if (row.type === 'contractor') {
                    const data = JSON.parse(row.data || '{}');
                    if (data.numbers && data.numbers.some(num => num.replace(/[^0-9]/g, '') === cleanNumber)) {
                        console.log(`Call identified as: Contractor - ${data.contractor_name} (userId: ${row.userId})`);
                        found = true;
                        nodeId = row.id;
                        break;
                    }
                }
            }

            if (found) {
                broadcast({ type: 'incoming-call', nodeId });
                res.json({ found: true, nodeId });
            } else {
                console.log('Caller not found in database');
                res.json({ found: false });
            }
        });
});

app.get('/incoming-sms', (req, res) => {
    const { sender, message } = req.query;
    const cleanSender = sender.replace(/[^0-9]/g, '');
    console.log(`SMS from: ${sender} (normalized: ${cleanSender}), message: ${message}`);
    console.log(`User: ${req.user ? req.user.id : 'Not authenticated'}`);

    db.all(`
        SELECT n.id, n.type, n.data, n.userId, c.name AS client_name, c.phones AS client_phones 
        FROM nodes n 
        LEFT JOIN clients c ON n.clientId = c.id 
        WHERE n.type = 'customer' OR n.type = 'contractor'`,
        [],
        (err, rows) => {
            if (err) {
                console.error('Error checking SMS sender:', err);
                res.sendStatus(500);
                return;
            }
            if (!rows || rows.length === 0) {
                console.log('No customer or contractor nodes found in database');
                res.json({ found: false });
                return;
            }

            let found = false;
            let nodeId = null;
            for (const row of rows) {
                if (row.type === 'customer' && row.client_phones) {
                    const phones = JSON.parse(row.client_phones);
                    if (phones.some(phone => phone.replace(/[^0-9]/g, '') === cleanSender)) {
                        console.log(`SMS identified as: Customer - ${row.client_name} (userId: ${row.userId})`);
                        found = true;
                        nodeId = row.id;
                        break;
                    }
                } else if (row.type === 'contractor') {
                    const data = JSON.parse(row.data || '{}');
                    if (data.numbers && data.numbers.some(num => num.replace(/[^0-9]/g, '') === cleanSender)) {
                        console.log(`SMS identified as: Contractor - ${data.contractor_name} (userId: ${row.userId})`);
                        found = true;
                        nodeId = row.id;
                        break;
                    }
                }
            }

            if (found) {
                broadcast({ type: 'incoming-sms', nodeId, message });
                res.json({ found: true, nodeId });
            } else {
                console.log('SMS sender not found in database');
                res.json({ found: false });
            }
        });
});

app.listen(3000, () => console.log('Server running on port 3000'));
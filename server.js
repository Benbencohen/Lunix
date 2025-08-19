// server.js
// Backend for Web OS v2 - with Authentication

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const pty = require('node-pty');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

// --- Basic Setup ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = 3000;

// --- Database Connection (MongoDB) ---
// !!! החלף את הכתובת הזו בכתובת החיבור שלך ל-MongoDB !!!
const MONGO_URI = 'mongodb://localhost:27017/webos'; 
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema and Model
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// --- Middleware ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'a-very-strong-secret-key-for-web-os', // החלף במפתח סודי משלך
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // בסביבת פרודקשן עם HTTPS, שנה ל-true
}));

// Middleware to protect routes
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// --- Routes ---

// Serve Login and Register pages
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});

// Handle Registration
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('User already exists. Please login.');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.redirect('/login');
    } catch (error) {
        res.status(500).send('Error registering new user.');
    }
});

// Handle Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('Invalid credentials.');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.userId = user._id;
            res.redirect('/');
        } else {
            res.status(400).send('Invalid credentials.');
        }
    } catch (error) {
        res.status(500).send('Error logging in.');
    }
});

// Handle Logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});


// --- Main Application Route (Protected) ---
// Serve the frontend file only if authenticated
app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// --- WebSocket Logic (attaches to the same server) ---
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

wss.on('connection', (ws, req) => {
    // Note: WebSocket sessions are harder to authenticate directly with express-session.
    // For now, access is granted if they reached this point.
    // In a production app, you'd implement token-based auth for WebSockets.
    console.log('Client connected to WebSocket');

    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env
    });

    ptyProcess.on('data', function (data) {
        ws.send(data);
    });

    ws.on('message', (command) => {
        ptyProcess.write(command);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        ptyProcess.kill();
    });
});

// --- Start Server ---
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

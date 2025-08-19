// server.js
// This is the backend for the Web OS. It uses Node.js, Express, WebSockets, and node-pty.

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Determine the shell based on the operating system
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

// Serve the frontend file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    // Spawn a new pseudo-terminal (pty) for each client
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env
    });

    // When the pty process outputs data, send it to the client's WebSocket
    ptyProcess.on('data', function (data) {
        ws.send(data);
    });

    // When the client sends a message (command), write it to the pty process
    ws.on('message', (command) => {
        ptyProcess.write(command);
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
        // Kill the pty process when the client disconnects
        ptyProcess.kill();
    });
});

const port = 3000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

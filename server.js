import {WebSocketServer} from 'ws';
import express from "express"

const app = express();

const wss = new WebSocketServer({port: 8282});

wss.on('connection', function connection(ws) {
    let id = 1
    ws.on('message', function message(data) {
        console.log('received: %s', data);
    });

    const interval = setInterval(() => {
        ws.send(`s_message ${id++}`);
    }, 1000)

    ws.on('close', function close() {
        console.log('server closed clearing')
        clearInterval(interval)
    });
});


app.get('/subscribe', (req, res) => {
    // ...

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': "*"
    });

    let counter = 0;

    // Send a message on connection
    res.write('event: customConnected\n');
    res.write(`data: You are now subscribed!\n`);
    res.write(`id: ${counter}\n\n`);
    counter += 1;

    // Send a subsequent message every five seconds
    setInterval(() => {
        res.write('event: message\n');
        res.write(`data: ${new Date().toLocaleString()}\n`);
        res.write(`id: ${counter}\n\n`);
        counter += 1;
    }, 5000);

    // Close the connection when the client disconnects
    req.on('close', () => res.end('OK'))
});


app.listen(8383, () => console.log('App listening: http://localhost:8383'));

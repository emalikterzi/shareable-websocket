About
===

The aim of this project is to facilitate the utilization of a single WebSocket and EventSource across multiple
concurrently opened tabs within the application.

We developed this library entirely to address a specific need, and it's solving our problem. In our own application, our
users tend to open multiple tabs (around 20-30 tabs per user). This was rapidly depleting our connection limit, which
has a hard limit of 10k connections.

Since this library utilizes JavaScript proxies, it's expected to work seamlessly with existing code. Usage outside of
addEventListener and removeEventListener won't function for EventSource. Similarly, for WebSocket, usage outside of
addEventListener, removeEventListener, and send won't work.

This library build top of [Broadcast Channel](https://github.com/pubkey/broadcast-channel).


### Library features:

- Automatically establishes the master tab connection.
- Opens the necessary listeners for the slave even if the master tab hasn't registered for events.
- When the master tab is closed, it initiates a new master connection and opens the necessary listeners, picking up where it left off.


## Getting Started

### 1. Web Socket Usage

```

const websocket = new ShareableWebsocket({url: 'ws://localhost:8282'}, {namespace: namespace})
await websocket.isReady()
websocket.getConnection().addEventListener("message", ongMsg)

```

### 2. Event Source Usage

```
const eventSource = new ShareableEventSource({url: 'http://localhost:8383/subscribe'}, {namespace: namespace})
await eventSource.isReady()
eventSource.getConnection().addEventListener("message", ongMsg)
```

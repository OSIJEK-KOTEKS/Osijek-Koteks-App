const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const test = require('node:test');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const { createServerShutdown } = require('../services/serverShutdownService');

test(
  'shutdown disconnects WebSocket clients and drains HTTP before closing MongoDB',
  { timeout: 5000 },
  async t => {
    let finishRequest;
    let requestStarted;
    const started = new Promise(resolve => {
      requestStarted = resolve;
    });
    const server = http.createServer((_req, res) => {
      finishRequest = () => res.end('drained');
      requestStarted();
    });
    const io = new Server(server);
    t.after(() => {
      finishRequest?.();
      server.closeAllConnections();
      return io.close();
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    const client = new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`);
    t.after(() => client.terminate());
    const connected = once(io, 'connection');
    await once(client, 'open');
    client.send('40');
    await connected;

    const request = http.get(`http://127.0.0.1:${port}/pending`, { agent: false });
    t.after(() => request.destroy());
    const responseDone = once(request, 'response').then(async ([response]) => {
      response.resume();
      await once(response, 'end');
    });
    await started;

    const calls = [];
    const shutdown = createServerShutdown({
      io,
      async stopWorker() {
        calls.push('worker');
      },
      async closeDatabase() {
        assert.equal(server.listening, false);
        assert.equal(io.engine.clientsCount, 0);
        calls.push('database');
      },
      logger: { log() {} },
    });
    const disconnected = once(client, 'close');
    const closing = shutdown('SIGTERM');
    assert.equal(shutdown('SIGINT'), closing);
    await disconnected;
    assert.deepEqual(calls, ['worker']);
    finishRequest();
    await Promise.all([closing, responseDone]);
    assert.deepEqual(calls, ['worker', 'database']);
  }
);

test('shutdown also closes MongoDB before the HTTP server has started', async () => {
  const io = new Server(http.createServer());
  let closed = false;
  await createServerShutdown({
    io,
    async stopWorker() {},
    async closeDatabase() {
      closed = true;
    },
    logger: { log() {} },
  })('SIGTERM');
  assert.equal(closed, true);
});

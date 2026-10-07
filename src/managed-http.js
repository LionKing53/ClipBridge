// Socket closure is not completion of an async request (clipboard/history/UAC).
// Stop admission first, abort incomplete HTTP bodies, then await every handler.
export function manageRequests(server, listener) {
  const tasks = new Set(); let stopping = false, closing;
  server.on('request', (req, res) => {
    if (stopping) { res.writeHead(503, { Connection: 'close' }); res.end(); return; }
    const task = Promise.resolve().then(() => listener(req, res)).catch(() => { res.destroy(); });
    tasks.add(task); void task.finally(() => tasks.delete(task));
  });
  server.closeAndDrain = () => {
    if (closing) return closing;
    stopping = true;
    closing = (async () => {
      const socketsClosed = new Promise(resolve => server.close(() => resolve()));
      server.closeAllConnections();
      await socketsClosed;
      await Promise.allSettled([...tasks]);
    })();
    return closing;
  };
  return server;
}

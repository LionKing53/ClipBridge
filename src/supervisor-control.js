// Private inherited stdin pipe, not an HTTP/network shutdown endpoint.
// The launcher owns the writer. EOF means that owner exited.
export function attachSupervisorControl(input, shutdown, { onError = () => {} } = {}) {
  if (!input || typeof input.on !== 'function' || typeof shutdown !== 'function') throw new Error('Explicit supervisor pipe and shutdown callback required.');
  let pending = Buffer.alloc(0), completion;
  const detach = () => { input.off('data', data); input.off('end', ended); input.off('error', errored); input.pause(); };
  function request() {
    if (!completion) {
      detach();
      // Pipe errors can arrive while asynchronous bridge cleanup is in flight.
      // They must not turn a graceful close into an unhandled stream exception.
      input.on('error', () => {});
      completion = Promise.resolve().then(shutdown).catch(() => { onError('shutdown_failed'); })
        .finally(() => { input.destroy(); });
    }
    return completion;
  }
  function data(chunk) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (pending.length + bytes.length > 32) { void request(); return; }
    pending = Buffer.concat([pending, bytes]);
    const newline = pending.indexOf(10);
    if (newline >= 0) {
      // Invalid parent commands fail closed too. Never interpret input as code.
      void request();
    }
  }
  function ended() { void request(); }
  function errored() { void request(); }
  input.on('data', data); input.once('end', ended); input.once('error', errored);
  if (input.destroyed || input.readableEnded) void request();
  return { request };
}

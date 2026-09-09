function createServerShutdown({ io, stopWorker, closeDatabase, logger = console }) {
  let shutdownPromise;

  return function shutdown(signal) {
    if (!shutdownPromise) {
      shutdownPromise = (async () => {
        logger.log(`Received ${signal}; shutting down cleanly`);
        await stopWorker();
        // Socket.IO closes its clients before draining the attached HTTP server.
        await io.close();
        await closeDatabase();
        logger.log('Server, delivery worker, and MongoDB connection closed');
      })();
    }
    return shutdownPromise;
  };
}

module.exports = { createServerShutdown };

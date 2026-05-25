const { createServiceJsonClient } = require('./serviceJsonClient');

function createPrijevozClient() {
  return createServiceJsonClient({
    baseUrl: process.env.PRIJEVOZ_API_BASE_URL,
    clientId: process.env.PRIJEVOZ_SERVICE_CLIENT_ID,
    secret: process.env.PRIJEVOZ_SERVICE_SECRET,
  });
}

module.exports = { createPrijevozClient };

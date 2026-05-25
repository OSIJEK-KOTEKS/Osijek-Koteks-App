const axios = require('axios');
const { createServiceAuthHeaders } = require('./serviceAuth');

function createServiceJsonClient({ baseUrl, clientId, secret }) {
  const normalizedBaseUrl = (baseUrl || '').replace(/\/$/, '');

  if (!normalizedBaseUrl) {
    throw new Error('service base URL is required');
  }

  async function requestJson(pathWithQuery, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const bodyString = options.body === undefined ? '' : JSON.stringify(options.body);
    const headers = {
      Accept: 'application/json',
      ...createServiceAuthHeaders({
        method,
        pathWithQuery,
        bodyString,
        clientId,
        secret,
      }),
      ...(options.headers || {}),
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await axios.request({
      method,
      url: `${normalizedBaseUrl}${pathWithQuery}`,
      headers,
      data: options.body === undefined ? undefined : bodyString,
      timeout: options.timeout || 15000,
    });

    return response.data;
  }

  return { requestJson };
}

module.exports = { createServiceJsonClient };

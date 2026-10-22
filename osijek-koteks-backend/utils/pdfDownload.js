/**
 * Helpers for pulling an item's PDF down from wherever it is hosted.
 *
 * Item `pdfUrl` values come from two places: Cloudinary (asfalt uploads) and
 * Google Drive (the scale tickets the bot posts). A Drive "view" link serves an
 * HTML page rather than the file, so it has to be rewritten to the direct
 * download form before we can fetch the bytes.
 */

const axios = require('axios');

function getGoogleDriveDownloadUrl(url) {
  const driveIdMatch =
    url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    url.match(/open\?id=([a-zA-Z0-9_-]+)/);

  if (driveIdMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveIdMatch[1]}`;
  }

  return url;
}

/**
 * Fetch a PDF and return its bytes. Throws on network errors / non-2xx,
 * so callers that treat the download as optional must catch.
 */
async function fetchPdfBuffer(url, { timeout = 20000 } = {}) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    maxRedirects: 5,
    validateStatus: status => status >= 200 && status < 400,
    timeout,
  });
  return Buffer.from(response.data);
}

module.exports = { getGoogleDriveDownloadUrl, fetchPdfBuffer };

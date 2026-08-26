const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mutationEntryPoints = [
  path.join(__dirname, '..', 'routes', 'items.js'),
  path.join(__dirname, '..', 'server.js'),
  path.join(__dirname, '..', 'scripts', 'merge-codes.js'),
  path.join(__dirname, '..', 'scripts', 'migrate-normalize-carriers.js'),
];

test('Item mutation entry points do not bypass the transactional service', () => {
  for (const entryPoint of mutationEntryPoints) {
    const source = fs.readFileSync(entryPoint, 'utf8');
    assert.doesNotMatch(
      source,
      /Item\.(?:create|insertMany|findByIdAndUpdate|findOneAndUpdate|updateOne|updateMany|deleteOne|deleteMany|findByIdAndDelete|findOneAndDelete)\s*\(/
    );
    assert.doesNotMatch(source, /\b(?:item|newItem|updatedItem)\.save\s*\(/);
    assert.doesNotMatch(source, /\b(?:item|newItem|updatedItem)\.deleteOne\s*\(/);
  }
});

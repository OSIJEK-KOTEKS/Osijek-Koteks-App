const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const itemsRouteSource = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'items.js'),
  'utf8'
);

test('Item API routes do not bypass the transactional mutation service', () => {
  assert.doesNotMatch(
    itemsRouteSource,
    /Item\.(?:create|insertMany|findByIdAndUpdate|findOneAndUpdate|updateOne|updateMany|deleteOne|deleteMany|findByIdAndDelete|findOneAndDelete)\s*\(/
  );
  assert.doesNotMatch(itemsRouteSource, /\b(?:item|newItem|updatedItem)\.save\s*\(/);
  assert.doesNotMatch(itemsRouteSource, /\b(?:item|newItem|updatedItem)\.deleteOne\s*\(/);
});

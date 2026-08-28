const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { after, before, beforeEach, test } = require('node:test');

const { MongoDBContainer } = require('@testcontainers/mongodb');
const express = require('express');
const mongoose = require('mongoose');
const supertest = require('supertest');

const DeliveryNoteOutbox = require('../models/DeliveryNoteOutbox');
const DeliveryNoteSyncState = require('../models/DeliveryNoteSyncState');
const Item = require('../models/Item');
const TransportAcceptance = require('../models/TransportAcceptance');
const TransportRequest = require('../models/TransportRequest');
const User = require('../models/User');
const itemsRouter = require('../routes/items');
const { createDeliveryNoteOutboxRepository } = require('../services/deliveryNoteOutboxRepository');
const {
  createDeliveryNoteReconciliationService,
} = require('../services/deliveryNoteReconciliationService');
const { createDeliveryNoteSyncService } = require('../services/deliveryNoteSyncService');
const { createItemMutationService } = require('../services/itemMutationService');
const { buildDeliveryNoteEvent } = require('../utils/deliveryNoteEvent');
const { clearNonceCache, createServiceAuthHeaders } = require('../utils/serviceAuth');

let mongoContainer;
let itemMutations;
let api;
let serviceClients;
let originalServiceAuthClients;

function rawJsonBody(req, _res, buffer) {
  req.rawBody = buffer;
}

function configureServiceActors() {
  const adminId = new mongoose.Types.ObjectId();
  const botId = new mongoose.Types.ObjectId();
  serviceClients = {
    admin: {
      clientId: 'milestone9-admin-test',
      secret: randomUUID(),
      actorUserId: adminId.toString(),
      allowed: [{ method: '*', pathPrefix: '/api/items' }],
    },
    bot: {
      clientId: 'milestone9-bot-test',
      secret: randomUUID(),
      actorUserId: botId.toString(),
      allowed: [{ method: '*', pathPrefix: '/api/items' }],
    },
  };
  process.env.SERVICE_AUTH_CLIENTS_JSON = JSON.stringify(Object.values(serviceClients));

  return {
    admin: {
      _id: adminId,
      email: 'marko.krajina@osijek-koteks.hr',
      password: 'unused-test-password',
      firstName: 'Admin',
      lastName: 'Test',
      company: 'Osijek-Koteks',
      role: 'admin',
      codes: [],
      assignedRegistrations: [],
      hasFullAccess: false,
    },
    bot: {
      _id: botId,
      email: 'quarry-bot@integration.test',
      password: 'unused-test-password',
      firstName: 'Quarry',
      lastName: 'Bot',
      company: 'Test Quarry',
      role: 'bot',
      quarryCode: '23453',
      codes: [],
      assignedRegistrations: [],
      hasFullAccess: false,
    },
  };
}

function signedApiRequest({ actor, method, path, body }) {
  const client = serviceClients[actor];
  const bodyString = body === undefined ? '' : JSON.stringify(body);
  const headers = createServiceAuthHeaders({
    method,
    pathWithQuery: path,
    bodyString,
    clientId: client.clientId,
    secret: client.secret,
  });
  let request = api[method.toLowerCase()](path);

  for (const [name, value] of Object.entries(headers)) {
    request = request.set(name, value);
  }
  if (body !== undefined) {
    request = request.type('application/json').send(bodyString);
  }

  return request;
}

function apiItem(overrides = {}) {
  return {
    title: `RN-API-${new mongoose.Types.ObjectId()}`,
    code: 'BELI_MANASTIR',
    registracija: 'OS-123-AB',
    neto: 24500,
    tezina: 24500,
    prijevoznik: 'Slavonija Transport',
    pdfUrl: 'https://source.example/delivery-note.pdf',
    creationDate: '2026-08-24T07:55:00.000Z',
    ...overrides,
  };
}

function itemData(overrides = {}) {
  return {
    title: `RN-${new mongoose.Types.ObjectId()}`,
    code: 'BELI_MANASTIR',
    createdBy: new mongoose.Types.ObjectId(),
    quarryCode: '23453',
    neto: 24500,
    tezina: 24500,
    prijevoznik: 'Slavonija Transport',
    pdfUrl: 'https://source.example/delivery-note.pdf',
    creationDate: new Date('2026-08-24T07:55:00.000Z'),
    registracija: 'OS-123-AB',
    approvalStatus: 'na čekanju',
    in_transit: false,
    ...overrides,
  };
}

function syncService(overrides = {}) {
  return createDeliveryNoteSyncService({
    SyncStateModel: DeliveryNoteSyncState,
    OutboxModel: DeliveryNoteOutbox,
    targetNames: ['PRODUCTION', 'STAGING'],
    ...overrides,
  });
}

async function createItem(overrides = {}) {
  return itemMutations.withTransaction(({ saveItem }) => saveItem(new Item(itemData(overrides))));
}

before(async () => {
  originalServiceAuthClients = process.env.SERVICE_AUTH_CLIENTS_JSON;
  mongoContainer = await new MongoDBContainer('mongo:8.0.15').start();
  await mongoose.connect(mongoContainer.getConnectionString(), {
    dbName: 'milestone9',
    directConnection: true,
  });
  await Promise.all([
    Item.init(),
    DeliveryNoteSyncState.init(),
    DeliveryNoteOutbox.init(),
    TransportAcceptance.init(),
    TransportRequest.init(),
    User.init(),
  ]);
  itemMutations = createItemMutationService({
    connection: mongoose.connection,
    syncService: syncService(),
  });

  const app = express();
  app.use(express.json({ verify: rawJsonBody }));
  app.set('io', { emit() {} });
  app.use('/api/items', itemsRouter);
  api = supertest(app);
});

after(async () => {
  if (originalServiceAuthClients === undefined) {
    delete process.env.SERVICE_AUTH_CLIENTS_JSON;
  } else {
    process.env.SERVICE_AUTH_CLIENTS_JSON = originalServiceAuthClients;
  }
  await mongoose.disconnect();
  if (mongoContainer) await mongoContainer.stop();
});

beforeEach(async () => {
  clearNonceCache();
  await Promise.all([
    Item.deleteMany({}),
    DeliveryNoteSyncState.deleteMany({}),
    DeliveryNoteOutbox.deleteMany({}),
    TransportAcceptance.deleteMany({}),
    TransportRequest.deleteMany({}),
    User.deleteMany({}),
  ]);
  const actors = configureServiceActors();
  await User.collection.insertMany([actors.admin, actors.bot]);
});

test('commits Item, latest state, and target deliveries together', async () => {
  const item = await createItem();
  const state = await DeliveryNoteSyncState.findOne({ sourceId: item.id }).lean();
  const outbox = await DeliveryNoteOutbox.findOne({ 'event.sourceId': item.id }).lean();

  assert.ok(state);
  assert.equal(state.eventType, 'UPSERT');
  assert.equal(state.quarryCode, '23453');
  assert.equal(state.destinationCode, 'BELI_MANASTIR');
  assert.ok(outbox);
  assert.deepEqual(
    outbox.deliveries.map(delivery => delivery.target),
    ['PRODUCTION', 'STAGING']
  );
});

test('enqueues only meaningful updates and retains a DELETE tombstone', async () => {
  const createdItem = await createItem();
  const originalState = await DeliveryNoteSyncState.findOne({ sourceId: createdItem.id }).lean();

  await itemMutations.withTransaction(async ({ session, saveItem }) => {
    const item = await Item.findById(createdItem._id).session(session);
    item.isPaid = true;
    item.paidAt = new Date();
    await saveItem(item);
  });
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 1);
  assert.equal(
    (await DeliveryNoteSyncState.findOne({ sourceId: createdItem.id })).sourceUpdatedAt.getTime(),
    originalState.sourceUpdatedAt.getTime()
  );

  await itemMutations.withTransaction(async ({ session, saveItem }) => {
    const item = await Item.findById(createdItem._id).session(session);
    item.code = 'OSIJEK';
    await saveItem(item);
  });
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 2);
  assert.equal(
    (await DeliveryNoteSyncState.findOne({ sourceId: createdItem.id })).destinationCode,
    'OSIJEK'
  );

  await itemMutations.withTransaction(async ({ session, deleteItem }) => {
    const item = await Item.findById(createdItem._id).session(session);
    await deleteItem(item);
  });

  assert.equal(await Item.countDocuments(), 0);
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 3);
  const tombstone = await DeliveryNoteSyncState.findOne({ sourceId: createdItem.id }).lean();
  assert.equal(tombstone.eventType, 'DELETE');
  assert.equal(tombstone.destinationCode, 'OSIJEK');
  assert.equal(tombstone.quarryCode, '23453');
});

test('rolls back the Item and SyncState when outbox creation fails', async () => {
  const failingSync = syncService({
    OutboxModel: {
      async create() {
        throw new Error('simulated outbox failure');
      },
    },
  });
  const failingMutations = createItemMutationService({
    connection: mongoose.connection,
    syncService: failingSync,
  });
  const sourceId = new mongoose.Types.ObjectId();

  await assert.rejects(
    () =>
      failingMutations.withTransaction(({ saveItem }) =>
        saveItem(new Item({ ...itemData(), _id: sourceId }))
      ),
    /simulated outbox failure/
  );

  assert.equal(await Item.countDocuments({ _id: sourceId }), 0);
  assert.equal(await DeliveryNoteSyncState.countDocuments({ sourceId: sourceId.toString() }), 0);
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 0);
});

test('replacement commits the old DELETE and new UPSERT in one transaction', async () => {
  const oldItem = await createItem({ title: 'RN-REPLACEMENT' });
  let replacement;

  await itemMutations.withTransaction(async ({ session, saveItem, deleteItem }) => {
    const existing = await Item.findById(oldItem._id).session(session);
    await deleteItem(existing);
    replacement = await saveItem(new Item(itemData({ title: 'RN-REPLACEMENT' })));
  });

  assert.equal(await Item.countDocuments(), 1);
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 3);
  assert.equal((await DeliveryNoteSyncState.findOne({ sourceId: oldItem.id })).eventType, 'DELETE');
  assert.equal(
    (await DeliveryNoteSyncState.findOne({ sourceId: replacement.id })).eventType,
    'UPSERT'
  );
});

test('outbox leases and target results remain independent in MongoDB', async () => {
  const item = await createItem();
  const repository = createDeliveryNoteOutboxRepository({ OutboxModel: DeliveryNoteOutbox });
  const dueAt = new Date('2026-08-26T10:00:00.000Z');

  await DeliveryNoteOutbox.updateOne(
    { 'event.sourceId': item.id },
    { $set: { 'deliveries.$[].nextAttemptAt': dueAt } }
  );
  const production = await repository.claimNext({
    target: 'PRODUCTION',
    now: dueAt,
    leaseUntil: new Date('2026-08-26T10:00:30.000Z'),
    leaseToken: 'production-lease',
  });
  const staging = await repository.claimNext({
    target: 'STAGING',
    now: dueAt,
    leaseUntil: new Date('2026-08-26T10:00:30.000Z'),
    leaseToken: 'staging-lease',
  });

  assert.ok(production);
  assert.ok(staging);
  assert.equal(production.outboxId.toString(), staging.outboxId.toString());

  await repository.markDelivered({
    ...production,
    deliveredAt: new Date('2026-08-26T10:00:01.000Z'),
  });
  await repository.markFailed({
    ...staging,
    lastError: 'HTTP 503',
    nextAttemptAt: new Date('2026-08-26T10:00:05.000Z'),
  });

  const stored = await DeliveryNoteOutbox.findById(production.outboxId).lean();
  const productionState = stored.deliveries.find(delivery => delivery.target === 'PRODUCTION');
  const stagingState = stored.deliveries.find(delivery => delivery.target === 'STAGING');
  assert.equal(productionState.deliveredAt.toISOString(), '2026-08-26T10:00:01.000Z');
  assert.equal(productionState.attemptCount, 0);
  assert.equal(stagingState.deliveredAt, null);
  assert.equal(stagingState.attemptCount, 1);
  assert.equal(stagingState.lastError, 'HTTP 503');
  assert.equal(stagingState.nextAttemptAt.toISOString(), '2026-08-26T10:00:05.000Z');
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 1);
});

test('reconciliation paginates real UPSERT and DELETE states by timestamp and source ID', async () => {
  const baseItem = new Item(itemData());
  baseItem._id = new mongoose.Types.ObjectId();
  baseItem.createdAt = new Date('2026-08-20T00:00:00.000Z');
  baseItem.updatedAt = new Date('2026-08-24T08:00:00.000Z');
  const first = buildDeliveryNoteEvent({ item: baseItem });
  const second = {
    ...first,
    eventId: '00000000-0000-4000-8000-000000000002',
    sourceId: `${first.sourceId}b`,
    eventType: 'DELETE',
  };
  const third = {
    ...first,
    eventId: '00000000-0000-4000-8000-000000000003',
    sourceId: `${first.sourceId}c`,
    sourceUpdatedAt: new Date('2026-08-24T09:00:00.000Z'),
  };
  await DeliveryNoteSyncState.insertMany([first, second, third]);
  const reconciliation = createDeliveryNoteReconciliationService({
    SyncStateModel: DeliveryNoteSyncState,
  });

  const firstPage = await reconciliation.list({ limit: '2' });
  const secondPage = await reconciliation.list({ limit: '2', cursor: firstPage.nextCursor });

  assert.deepEqual(
    firstPage.records.map(record => record.eventType),
    ['UPSERT', 'DELETE']
  );
  assert.deepEqual(
    secondPage.records.map(record => record.sourceId),
    [third.sourceId]
  );
  assert.equal(secondPage.nextCursor, null);
});

test('actual HMAC Item routes publish every meaningful update and the DELETE tombstone', async () => {
  const createResponse = await signedApiRequest({
    actor: 'bot',
    method: 'POST',
    path: '/api/items',
    body: apiItem(),
  });
  assert.equal(createResponse.status, 201, createResponse.text);
  const itemId = createResponse.body._id;
  assert.equal(createResponse.body.quarryCode, '23453');
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 1);

  const payResponse = await signedApiRequest({
    actor: 'admin',
    method: 'PATCH',
    path: `/api/items/${itemId}/pay`,
    body: { isPaid: true },
  });
  assert.equal(payResponse.status, 200, payResponse.text);
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 1);

  const titleResponse = await signedApiRequest({
    actor: 'admin',
    method: 'PATCH',
    path: `/api/items/${itemId}`,
    body: { title: 'RN-API-RENAMED' },
  });
  assert.equal(titleResponse.status, 200, titleResponse.text);
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 1);

  const relevantUpdateResponse = await signedApiRequest({
    actor: 'admin',
    method: 'PATCH',
    path: `/api/items/${itemId}`,
    body: { code: 'OSIJEK', neto: 25000, tezina: 25000 },
  });
  assert.equal(relevantUpdateResponse.status, 200, relevantUpdateResponse.text);
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 2);

  const codeResponse = await signedApiRequest({
    actor: 'admin',
    method: 'PATCH',
    path: `/api/items/${itemId}/code`,
    body: { code: 'VINKOVCI' },
  });
  assert.equal(codeResponse.status, 200, codeResponse.text);
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 3);

  const approvalResponse = await signedApiRequest({
    actor: 'admin',
    method: 'PATCH',
    path: `/api/items/${itemId}/approval`,
    body: { approvalStatus: 'odobreno', inTransit: true },
  });
  assert.equal(approvalResponse.status, 200, approvalResponse.text);
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 4);

  const deleteResponse = await signedApiRequest({
    actor: 'admin',
    method: 'DELETE',
    path: `/api/items/${itemId}`,
  });
  assert.equal(deleteResponse.status, 200, deleteResponse.text);
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 5);

  const tombstone = await DeliveryNoteSyncState.findOne({ sourceId: itemId }).lean();
  assert.equal(tombstone.eventType, 'DELETE');
  assert.equal(tombstone.destinationCode, 'VINKOVCI');
  assert.equal(tombstone.quarryCode, '23453');
});

test('actual replacement route publishes the old DELETE and new UPSERT', async () => {
  const body = apiItem({ title: 'RN-API-REPLACEMENT' });
  const firstResponse = await signedApiRequest({
    actor: 'bot',
    method: 'POST',
    path: '/api/items',
    body,
  });
  assert.equal(firstResponse.status, 201, firstResponse.text);

  const secondResponse = await signedApiRequest({
    actor: 'bot',
    method: 'POST',
    path: '/api/items',
    body,
  });
  assert.equal(secondResponse.status, 201, secondResponse.text);
  assert.notEqual(secondResponse.body._id, firstResponse.body._id);
  assert.equal(await Item.countDocuments(), 1);
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 3);
  assert.equal(
    (await DeliveryNoteSyncState.findOne({ sourceId: firstResponse.body._id })).eventType,
    'DELETE'
  );
  assert.equal(
    (await DeliveryNoteSyncState.findOne({ sourceId: secondResponse.body._id })).eventType,
    'UPSERT'
  );
});

test('old TransportAcceptance link and TransportRequest completion still work', async () => {
  const createResponse = await signedApiRequest({
    actor: 'bot',
    method: 'POST',
    path: '/api/items',
    body: apiItem({ code: 'SITE-1', registracija: 'OS-555-XY' }),
  });
  assert.equal(createResponse.status, 201, createResponse.text);

  const request = await TransportRequest.create({
    kamenolom: 'MOLARIS',
    gradiliste: 'SITE-1',
    brojKamiona: 1,
    prijevozNaDan: '28/08/2026',
    isplataPoT: 5,
    userId: serviceClients.admin.actorUserId,
    userEmail: 'marko.krajina@osijek-koteks.hr',
    assignedTo: 'All',
  });
  const acceptance = await TransportAcceptance.create({
    requestId: request._id,
    userId: serviceClients.bot.actorUserId,
    registrations: [],
    acceptedCount: 1,
    gradiliste: 'SITE-1',
    status: 'approved',
  });

  const approvalResponse = await signedApiRequest({
    actor: 'admin',
    method: 'PATCH',
    path: `/api/items/${createResponse.body._id}/approval`,
    body: { approvalStatus: 'odobreno', inTransit: false },
  });
  assert.equal(approvalResponse.status, 200, approvalResponse.text);

  const [storedItem, storedAcceptance, storedRequest] = await Promise.all([
    Item.findById(createResponse.body._id).lean(),
    TransportAcceptance.findById(acceptance._id).lean(),
    TransportRequest.findById(request._id).lean(),
  ]);
  assert.equal(storedItem.transportAcceptanceId.toString(), acceptance.id);
  assert.deepEqual(storedAcceptance.registrations, ['OS-555-XY']);
  assert.equal(storedRequest.status, 'Završen');
  assert.equal(await DeliveryNoteOutbox.countDocuments(), 2);
});

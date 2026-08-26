function createDeliveryNoteOutboxRepository({ OutboxModel } = {}) {
  const Outbox = OutboxModel || require('../models/DeliveryNoteOutbox');

  async function claimNext({ target, now, leaseUntil, leaseToken }) {
    const dueDelivery = {
      target,
      deliveredAt: null,
      nextAttemptAt: { $lte: now },
      $or: [{ leaseUntil: null }, { leaseUntil: { $lte: now } }],
    };
    const outbox = await Outbox.findOneAndUpdate(
      { deliveries: { $elemMatch: dueDelivery } },
      {
        $set: {
          'deliveries.$[delivery].leaseToken': leaseToken,
          'deliveries.$[delivery].leaseUntil': leaseUntil,
        },
      },
      {
        new: true,
        sort: { createdAt: 1, _id: 1 },
        arrayFilters: [
          {
            'delivery.target': target,
            'delivery.deliveredAt': null,
            'delivery.nextAttemptAt': { $lte: now },
            $or: [
              { 'delivery.leaseUntil': null },
              { 'delivery.leaseUntil': { $lte: now } },
            ],
          },
        ],
      }
    );
    if (!outbox) return null;

    const delivery = outbox.deliveries.find(
      candidate => candidate.target === target && candidate.leaseToken === leaseToken
    );
    if (!delivery) return null;

    return {
      outboxId: outbox._id,
      event: outbox.event.toObject ? outbox.event.toObject() : outbox.event,
      attemptCount: delivery.attemptCount,
      leaseToken,
      target,
    };
  }

  async function markDelivered({ outboxId, target, leaseToken, deliveredAt }) {
    return Outbox.updateOne(
      { _id: outboxId },
      {
        $set: {
          'deliveries.$[delivery].deliveredAt': deliveredAt,
          'deliveries.$[delivery].lastError': null,
          'deliveries.$[delivery].leaseToken': null,
          'deliveries.$[delivery].leaseUntil': null,
        },
      },
      {
        arrayFilters: [
          {
            'delivery.target': target,
            'delivery.leaseToken': leaseToken,
            'delivery.deliveredAt': null,
          },
        ],
      }
    );
  }

  async function markFailed({ outboxId, target, leaseToken, nextAttemptAt, lastError }) {
    return Outbox.updateOne(
      { _id: outboxId },
      {
        $inc: { 'deliveries.$[delivery].attemptCount': 1 },
        $set: {
          'deliveries.$[delivery].nextAttemptAt': nextAttemptAt,
          'deliveries.$[delivery].lastError': lastError,
          'deliveries.$[delivery].leaseToken': null,
          'deliveries.$[delivery].leaseUntil': null,
        },
      },
      {
        arrayFilters: [
          {
            'delivery.target': target,
            'delivery.leaseToken': leaseToken,
            'delivery.deliveredAt': null,
          },
        ],
      }
    );
  }

  return { claimNext, markDelivered, markFailed };
}

module.exports = { createDeliveryNoteOutboxRepository };

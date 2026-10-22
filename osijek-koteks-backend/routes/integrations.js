const express = require('express');

const auth = require('../middleware/auth');
const requireServiceClient = require('../middleware/requireServiceClient');
const {
  ReconciliationQueryError,
  createDeliveryNoteReconciliationService,
} = require('../services/deliveryNoteReconciliationService');

const router = express.Router();
const reconciliation = createDeliveryNoteReconciliationService();

router.get('/delivery-note-sync-state', auth, requireServiceClient, async (req, res) => {
  try {
    const page = await reconciliation.list({
      updatedAfter: req.query.updatedAfter,
      cursor: req.query.cursor,
      limit: req.query.limit,
    });
    res.json(page);
  } catch (error) {
    if (error instanceof ReconciliationQueryError) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Delivery-note reconciliation failed:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

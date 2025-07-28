// migration.js - Run this once to update existing items
require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');
const User = require('./models/User');

async function migrateExistingItems() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Count items without createdBy
    const itemsWithoutCreatedBy = await Item.countDocuments({
      createdBy: {$exists: false},
    });

    console.log(`Found ${itemsWithoutCreatedBy} items without createdBy field`);

    if (itemsWithoutCreatedBy === 0) {
      console.log('✅ No migration needed - all items have createdBy field');
      return;
    }

    // Find first admin user as default creator
    const defaultUser = await User.findOne({role: 'admin'});

    if (!defaultUser) {
      console.error('❌ No admin user found');
      return;
    }

    console.log(
      `Using ${defaultUser.firstName} ${defaultUser.lastName} as default creator`,
    );

    // Update all items without createdBy
    const result = await Item.updateMany(
      {createdBy: {$exists: false}},
      {$set: {createdBy: defaultUser._id}},
    );

    console.log(`✅ Updated ${result.modifiedCount} items`);
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateExistingItems();

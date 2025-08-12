// backend/routes/warranty.js
const express = require('express');
const router = express.Router();
const warrantyController = require('../controllers/warrantyController');

// Health check endpoint
router.get('/health', warrantyController.healthCheck);

// Issue new warranty
router.post('/issue', warrantyController.issueWarranty);

// Get warranty details by token ID or serial number
router.get('/:identifier', warrantyController.getWarranty);

// Validate warranty by token ID or serial number
router.get('/:identifier/validate', warrantyController.validateWarranty);

// Find token ID by serial number
router.get('/serial/:serialNumber/token', warrantyController.findTokenBySerial);

// Claim warranty
router.post('/claim', warrantyController.claimWarranty);

// Get user warranties by address
router.get('/user/:address', warrantyController.getUserWarranties);

module.exports = router;
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    serialNumber: {
        type: String,
        required: true,
        unique: true
    },
    manufacturer: {
        type: String,
        required: true
    },
    retailer: {
        type: String,
        required: true
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    warrantyPeriod: {
        type: Number, // in days
        required: true
    },
    customerAddress: {
        type: String,
        required: true
    },
    tokenId: {
        type: Number,
        unique: true
    },
    transactionHash: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
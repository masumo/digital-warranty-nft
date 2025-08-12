// backend/controllers/warrantyController.js
const Product = require('../models/Product');
const blockchainService = require('../services/blockchainService');

class WarrantyController {
    async issueWarranty(req, res) {
        try {
            const {
                productName,
                productModel,
                serialNumber,
                manufacturer,
                retailer,
                customerAddress,
                warrantyPeriod,
                manufacturerAddress,
                retailerAddress
            } = req.body;

            console.log('Received warranty issuance request:', {
                productName,
                productModel,
                serialNumber,
                customerAddress,
                warrantyPeriod
            });

            // Validate required fields
            if (!productName || !productModel || !serialNumber || !customerAddress) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: productName, productModel, serialNumber, customerAddress'
                });
            }

            // Validate customer address format
            if (!customerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid customer address format'
                });
            }

            // Check if serial number already exists
            const existingProduct = await Product.findOne({ serialNumber });
            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: 'Product with this serial number already exists',
                    existingProduct: {
                        id: existingProduct._id,
                        tokenId: existingProduct.tokenId
                    }
                });
            }

            // Create metadata
            const metadata = {
                name: `Digital Warranty - ${productName}`,
                description: `Digital warranty certificate for ${productName} model ${productModel}`,
                image: "https://via.placeholder.com/400x400/4F46E5/FFFFFF?text=Digital+Warranty",
                external_url: `${req.protocol}://${req.get('host')}/warranty/${serialNumber}`,
                attributes: [
                    {
                        trait_type: "Product Name",
                        value: productName
                    },
                    {
                        trait_type: "Model",
                        value: productModel
                    },
                    {
                        trait_type: "Serial Number",
                        value: serialNumber
                    },
                    {
                        trait_type: "Manufacturer",
                        value: manufacturer || "Unknown"
                    },
                    {
                        trait_type: "Retailer",
                        value: retailer || "Unknown"
                    },
                    {
                        trait_type: "Warranty Period (Days)",
                        value: warrantyPeriod || 365
                    },
                    {
                        trait_type: "Issue Date",
                        value: new Date().toISOString().split('T')[0]
                    }
                ]
            };

            // For demo, use base64 encoded metadata URI
            const metadataURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

            console.log('Metadata URI created, length:', metadataURI.length);

            // Issue warranty on blockchain
            const blockchainResult = await blockchainService.issueWarranty({
                customerAddress,
                productName,
                productModel,
                serialNumber,
                warrantyPeriod: warrantyPeriod || 365,
                manufacturerAddress: manufacturerAddress || customerAddress,
                retailerAddress: retailerAddress || customerAddress,
                metadataURI
            });

            console.log('Blockchain result:', blockchainResult);

            if (!blockchainResult.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to issue warranty on blockchain',
                    error: blockchainResult.error,
                    code: blockchainResult.code
                });
            }

            // Create product record in database
            const productData = {
                name: productName,
                model: productModel,
                serialNumber,
                manufacturer: manufacturer || "Unknown",
                retailer: retailer || "Unknown",
                customerAddress,
                warrantyPeriod: warrantyPeriod || 365,
                transactionHash: blockchainResult.transactionHash
            };

            // Only set tokenId if we have it
            if (blockchainResult.tokenId) {
                productData.tokenId = parseInt(blockchainResult.tokenId);
            }

            const product = new Product(productData);
            await product.save();

            console.log('Product saved to database:', product._id);

            // Response
            const response = {
                success: true,
                message: 'Warranty issued successfully',
                data: {
                    transactionHash: blockchainResult.transactionHash,
                    gasUsed: blockchainResult.gasUsed,
                    blockNumber: blockchainResult.blockNumber,
                    product: {
                        id: product._id,
                        serialNumber: product.serialNumber,
                        productName: product.name,
                        customerAddress: product.customerAddress
                    }
                }
            };

            if (blockchainResult.tokenId) {
                response.data.tokenId = blockchainResult.tokenId;
            }

            if (blockchainResult.warning) {
                response.warning = blockchainResult.warning;
            }

            res.status(201).json(response);

        } catch (error) {
            console.error('Error issuing warranty:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        }
    }

    async getWarranty(req, res) {
        try {
            const { identifier } = req.params;
            let product;
            let tokenId;

            console.log('Getting warranty for identifier:', identifier);

            // Try to find by token ID first
            if (!isNaN(identifier)) {
                tokenId = parseInt(identifier);
                product = await Product.findOne({ tokenId });
            }

            // If not found, try by serial number
            if (!product) {
                product = await Product.findOne({ serialNumber: identifier });
                if (product && product.tokenId) {
                    tokenId = product.tokenId;
                }
            }

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Warranty not found'
                });
            }

            let blockchainDetails = null;
            
            // Try to get blockchain details if we have tokenId
            if (tokenId) {
                try {
                    blockchainDetails = await blockchainService.getWarrantyDetails(tokenId);
                } catch (blockchainError) {
                    console.log('Warning: Could not fetch blockchain details:', blockchainError.message);
                }
            }

            res.json({
                success: true,
                data: {
                    product,
                    blockchain: blockchainDetails,
                    hasBlockchainData: !!blockchainDetails
                }
            });

        } catch (error) {
            console.error('Error getting warranty:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        }
    }

    async validateWarranty(req, res) {
        try {
            const { identifier } = req.params;
            let tokenId;
            let product;

            // Try to find product
            if (!isNaN(identifier)) {
                tokenId = parseInt(identifier);
                product = await Product.findOne({ tokenId });
            } else {
                product = await Product.findOne({ serialNumber: identifier });
                if (product) {
                    tokenId = product.tokenId;
                }
            }

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Warranty not found'
                });
            }

            let isValid = false;
            let validationSource = 'database';

            // Try blockchain validation if we have token ID
            if (tokenId) {
                try {
                    isValid = await blockchainService.isWarrantyValid(tokenId);
                    validationSource = 'blockchain';
                } catch (error) {
                    console.log('Blockchain validation failed, using database:', error.message);
                    // Fallback to database validation
                    const purchaseDate = product.purchaseDate || product.createdAt;
                    const warrantyEndDate = new Date(purchaseDate);
                    warrantyEndDate.setDate(warrantyEndDate.getDate() + product.warrantyPeriod);
                    isValid = product.isActive && (warrantyEndDate > new Date());
                    validationSource = 'database';
                }
            } else {
                // Database-only validation
                const purchaseDate = product.purchaseDate || product.createdAt;
                const warrantyEndDate = new Date(purchaseDate);
                warrantyEndDate.setDate(warrantyEndDate.getDate() + product.warrantyPeriod);
                isValid = product.isActive && (warrantyEndDate > new Date());
            }

            res.json({
                success: true,
                data: {
                    identifier,
                    tokenId,
                    serialNumber: product.serialNumber,
                    isValid,
                    validationSource,
                    product: {
                        name: product.name,
                        model: product.model,
                        purchaseDate: product.purchaseDate || product.createdAt,
                        warrantyPeriod: product.warrantyPeriod
                    }
                }
            });

        } catch (error) {
            console.error('Error validating warranty:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        }
    }

    async claimWarranty(req, res) {
        try {
            const { tokenId, customerPrivateKey } = req.body;

            if (!tokenId || !customerPrivateKey) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: tokenId, customerPrivateKey'
                });
            }

            const result = await blockchainService.claimWarranty(tokenId, customerPrivateKey);

            if (result.success) {
                res.json({
                    success: true,
                    message: 'Warranty claimed successfully',
                    transactionHash: result.transactionHash,
                    gasUsed: result.gasUsed
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to claim warranty',
                    error: result.error
                });
            }

        } catch (error) {
            console.error('Error claiming warranty:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        }
    }

    async getUserWarranties(req, res) {
        try {
            const { address } = req.params;

            if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid address format'
                });
            }

            const products = await Product.find({ 
                customerAddress: address.toLowerCase() 
            }).sort({ createdAt: -1 });

            res.json({
                success: true,
                data: {
                    address,
                    warranties: products,
                    count: products.length
                }
            });

        } catch (error) {
            console.error('Error getting user warranties:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        }
    }

    // New method to find token ID by serial number
    async findTokenBySerial(req, res) {
        try {
            const { serialNumber } = req.params;

            const product = await Product.findOne({ serialNumber });
            
            if (!product) {
                // Try to find in blockchain
                const tokenId = await blockchainService.getTokenIdBySerialNumber(serialNumber);
                
                if (tokenId) {
                    return res.json({
                        success: true,
                        data: {
                            serialNumber,
                            tokenId,
                            source: 'blockchain'
                        }
                    });
                }

                return res.status(404).json({
                    success: false,
                    message: 'No warranty found for this serial number'
                });
            }

            res.json({
                success: true,
                data: {
                    serialNumber,
                    tokenId: product.tokenId,
                    productId: product._id,
                    source: 'database'
                }
            });

        } catch (error) {
            console.error('Error finding token by serial:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        }
    }

    // Health check for blockchain connection
    async healthCheck(req, res) {
        try {
            const contractInfo = await blockchainService.getContractInfo();
            const isDeployed = await blockchainService.isContractDeployed();

            res.json({
                success: true,
                data: {
                    blockchain: {
                        connected: true,
                        contract: contractInfo,
                        deployed: isDeployed
                    },
                    database: {
                        connected: true // MongoDB connection is handled by mongoose
                    },
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Health check failed:', error);
            res.status(500).json({
                success: false,
                message: 'Health check failed',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable'
            });
        }
    }
}

module.exports = new WarrantyController();
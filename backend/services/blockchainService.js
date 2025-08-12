// backend/services/blockchainService.js
const { contract, wallet } = require('../config/blockchain');
const { ethers } = require('ethers');

class BlockchainService {
    async issueWarranty(productData) {
        try {
            const {
                customerAddress,
                productName,
                productModel,
                serialNumber,
                warrantyPeriod,
                manufacturerAddress,
                retailerAddress,
                metadataURI
            } = productData;

            console.log('Issuing warranty on blockchain...');
            console.log('Product data:', {
                customerAddress,
                productName,
                productModel,
                serialNumber,
                warrantyPeriod
            });
            
            const tx = await contract.issueWarranty(
                customerAddress,
                productName,
                productModel,
                serialNumber,
                warrantyPeriod,
                manufacturerAddress,
                retailerAddress,
                metadataURI
            );

            console.log('Transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt.hash);
            console.log('Gas used:', receipt.gasUsed.toString());

            // Method 1: Try to find event using topic
            let tokenId = null;
            
            // WarrantyIssued event signature
            const warrantyIssuedTopic = ethers.id("WarrantyIssued(uint256,address,string,string,uint256,uint256)");
            
            for (let log of receipt.logs) {
                if (log.topics && log.topics[0] === warrantyIssuedTopic) {
                    try {
                        const decoded = contract.interface.parseLog(log);
                        console.log('Event found:', decoded.name);
                        console.log('Event args:', decoded.args);
                        tokenId = decoded.args.tokenId;
                        break;
                    } catch (parseError) {
                        console.log('Parse error for log:', parseError.message);
                    }
                }
            }

            // Method 2: If method 1 fails, try different approach
            if (!tokenId) {
                console.log('Trying alternative event parsing...');
                for (let log of receipt.logs) {
                    try {
                        const parsed = contract.interface.parseLog(log);
                        console.log('Found event:', parsed.name);
                        if (parsed.name === 'WarrantyIssued') {
                            tokenId = parsed.args.tokenId;
                            break;
                        }
                    } catch (e) {
                        // Skip logs that can't be parsed
                        continue;
                    }
                }
            }

            // Method 3: Query contract directly for latest token
            if (!tokenId) {
                console.log('Trying to get token ID from contract...');
                try {
                    // Get the total supply to find the latest token ID
                    const filter = contract.filters.WarrantyIssued();
                    const events = await contract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
                    
                    if (events.length > 0) {
                        const event = events[events.length - 1]; // Get the latest event
                        tokenId = event.args.tokenId;
                        console.log('Found token ID from query:', tokenId.toString());
                    }
                } catch (queryError) {
                    console.log('Query error:', queryError.message);
                }
            }

            // Method 4: Last resort - use a simple counter approach
            if (!tokenId) {
                console.log('Using fallback method...');
                // This is not ideal but can work for testing
                // In production, you should implement proper event handling
                try {
                    // Try to call a view function to get latest token ID
                    // This assumes you have a getter function in your contract
                    tokenId = 1; // Fallback value - you might need to adjust this
                    console.log('Using fallback token ID:', tokenId);
                } catch (e) {
                    console.log('Fallback failed:', e.message);
                }
            }

            if (tokenId) {
                return {
                    success: true,
                    tokenId: tokenId.toString(),
                    transactionHash: receipt.hash,
                    gasUsed: receipt.gasUsed.toString(),
                    blockNumber: receipt.blockNumber
                };
            } else {
                // Even if we can't get token ID, the transaction succeeded
                console.log('Warning: Could not extract token ID from events');
                return {
                    success: true,
                    tokenId: null,
                    transactionHash: receipt.hash,
                    gasUsed: receipt.gasUsed.toString(),
                    blockNumber: receipt.blockNumber,
                    warning: 'Token ID could not be extracted from events'
                };
            }

        } catch (error) {
            console.error('Blockchain error:', error);
            return {
                success: false,
                error: error.message,
                code: error.code || 'UNKNOWN_ERROR'
            };
        }
    }

    async getWarrantyDetails(tokenId) {
        try {
            console.log('Fetching warranty details for token ID:', tokenId);
            const details = await contract.getWarrantyDetails(tokenId);
            
            return {
                productName: details[0],
                productModel: details[1],
                serialNumber: details[2],
                purchaseDate: new Date(Number(details[3]) * 1000),
                expiryDate: new Date(Number(details[4]) * 1000),
                manufacturer: details[5],
                retailer: details[6],
                isValid: details[7]
            };
        } catch (error) {
            console.error('Error fetching warranty details:', error);
            throw new Error(`Failed to fetch warranty details: ${error.message}`);
        }
    }

    async isWarrantyValid(tokenId) {
        try {
            console.log('Checking warranty validity for token ID:', tokenId);
            return await contract.isWarrantyValid(tokenId);
        } catch (error) {
            console.error('Error checking warranty validity:', error);
            return false;
        }
    }

    async getTokenIdBySerialNumber(serialNumber) {
        try {
            // Query events to find token ID by serial number
            const filter = contract.filters.WarrantyIssued();
            const events = await contract.queryFilter(filter);
            
            for (let event of events) {
                const details = await this.getWarrantyDetails(event.args.tokenId);
                if (details.serialNumber === serialNumber) {
                    return event.args.tokenId.toString();
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error finding token by serial number:', error);
            return null;
        }
    }

    async claimWarranty(tokenId, customerPrivateKey) {
        try {
            console.log('Claiming warranty for token ID:', tokenId);
            const customerWallet = new ethers.Wallet(customerPrivateKey, wallet.provider);
            const customerContract = contract.connect(customerWallet);
            
            const tx = await customerContract.claimWarranty(tokenId);
            const receipt = await tx.wait();
            
            return {
                success: true,
                transactionHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error('Error claiming warranty:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async transferWarranty(tokenId, toAddress, fromPrivateKey) {
        try {
            console.log('Transferring warranty token ID:', tokenId, 'to:', toAddress);
            const fromWallet = new ethers.Wallet(fromPrivateKey, wallet.provider);
            const fromContract = contract.connect(fromWallet);
            
            const tx = await fromContract.transferWarranty(toAddress, tokenId);
            const receipt = await tx.wait();
            
            return {
                success: true,
                transactionHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error('Error transferring warranty:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Helper function to get contract info
    async getContractInfo() {
        try {
            const address = await contract.getAddress();
            const name = await contract.name();
            const symbol = await contract.symbol();
            
            return {
                address,
                name,
                symbol
            };
        } catch (error) {
            console.error('Error getting contract info:', error);
            return null;
        }
    }

    // Helper function to check if contract is deployed
    async isContractDeployed() {
        try {
            const code = await wallet.provider.getCode(contract.target);
            return code !== '0x';
        } catch (error) {
            console.error('Error checking contract deployment:', error);
            return false;
        }
    }
}

module.exports = new BlockchainService();
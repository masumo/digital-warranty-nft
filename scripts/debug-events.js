// scripts/debug-events.js
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging WarrantyIssued events...");
    
    const [owner, customer] = await ethers.getSigners();
    console.log("Owner:", owner.address);
    console.log("Customer:", customer.address);
    
    // Get contract instance
    const DigitalWarranty = await ethers.getContractFactory("DigitalWarranty");
    
    // If you already deployed, use the deployed address
    const contractAddress = process.env.CONTRACT_ADDRESS;
    let contract;
    
    if (contractAddress) {
        console.log("Using existing contract at:", contractAddress);
        contract = DigitalWarranty.attach(contractAddress);
    } else {
        console.log("Deploying new contract...");
        contract = await DigitalWarranty.deploy();
        await contract.waitForDeployment();
        console.log("Contract deployed at:", await contract.getAddress());
    }
    
    console.log("\n📋 Contract Info:");
    console.log("Name:", await contract.name());
    console.log("Symbol:", await contract.symbol());
    
    // Test issuing warranty
    console.log("\n🎫 Issuing test warranty...");
    
    const productName = "iPhone 15 Pro";
    const productModel = "A3108";
    const serialNumber = "TEST" + Date.now();
    const warrantyPeriod = 365;
    const metadataURI = "https://example.com/metadata/test";
    
    console.log("Product details:", {
        productName,
        productModel,
        serialNumber,
        warrantyPeriod,
        customer: customer.address
    });
    
    // Issue warranty
    const tx = await contract.issueWarranty(
        customer.address,
        productName,
        productModel,
        serialNumber,
        warrantyPeriod,
        owner.address, // manufacturer
        owner.address, // retailer
        metadataURI
    );
    
    console.log("Transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Block number:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    console.log("\n🔍 Analyzing transaction logs...");
    console.log("Total logs:", receipt.logs.length);
    
    // Log all events
    for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        console.log(`\nLog ${i}:`);
        console.log("  Address:", log.address);
        console.log("  Topics:", log.topics);
        console.log("  Data:", log.data);
        
        try {
            const parsed = contract.interface.parseLog(log);
            console.log("  Parsed Event:", parsed.name);
            console.log("  Args:", parsed.args);
            
            if (parsed.name === 'WarrantyIssued') {
                console.log("  ✅ Found WarrantyIssued event!");
                console.log("  Token ID:", parsed.args.tokenId.toString());
                console.log("  Customer:", parsed.args.customer);
                console.log("  Product:", parsed.args.productName);
                console.log("  Serial:", parsed.args.serialNumber);
            }
        } catch (parseError) {
            console.log("  ❌ Could not parse log:", parseError.message);
        }
    }
    
    // Alternative: Query events directly
    console.log("\n📡 Querying events directly...");
    try {
        const filter = contract.filters.WarrantyIssued();
        const events = await contract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
        
        console.log("Found", events.length, "WarrantyIssued events");
        
        if (events.length > 0) {
            const event = events[0];
            console.log("Event args:", {
                tokenId: event.args.tokenId.toString(),
                customer: event.args.customer,
                productName: event.args.productName,
                serialNumber: event.args.serialNumber
            });
        }
    } catch (queryError) {
        console.log("❌ Event query failed:", queryError.message);
    }
    
    // Test getting warranty details
    console.log("\n📋 Testing warranty details retrieval...");
    try {
        // Try token ID 1 first
        const details = await contract.getWarrantyDetails(1);
        console.log("Warranty details for token 1:");
        console.log("  Product:", details[0]);
        console.log("  Model:", details[1]);
        console.log("  Serial:", details[2]);
        console.log("  Valid:", details[7]);
    } catch (detailsError) {
        console.log("❌ Could not get warranty details:", detailsError.message);
    }
    
    console.log("\n🎉 Debug completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Debug failed:", error);
        process.exit(1);
    });
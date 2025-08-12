const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing DigitalWarranty contract deployment...");
    
    // Get signers
    const [owner, customer, manufacturer, retailer] = await ethers.getSigners();
    console.log("👤 Owner address:", owner.address);
    console.log("🏪 Customer address:", customer.address);
    
    // Deploy contract
    console.log("\n📦 Deploying DigitalWarranty contract...");
    const DigitalWarranty = await ethers.getContractFactory("DigitalWarranty");
    const digitalWarranty = await DigitalWarranty.deploy();
    await digitalWarranty.waitForDeployment();
    
    const contractAddress = await digitalWarranty.getAddress();
    console.log("✅ DigitalWarranty deployed to:", contractAddress);
    
    // Test issuing a warranty
    console.log("\n🎫 Testing warranty issuance...");
    
    const productName = "MacBook Pro";
    const productModel = "M3 Max";
    const serialNumber = "TEST123456789";
    const warrantyPeriod = 365; // days
    const metadataURI = "https://example.com/metadata/1";
    
    const tx = await digitalWarranty.issueWarranty(
        customer.address,
        productName,
        productModel,
        serialNumber,
        warrantyPeriod,
        manufacturer.address,
        retailer.address,
        metadataURI
    );
    
    const receipt = await tx.wait();
    console.log("✅ Warranty issued! Transaction hash:", receipt.hash);
    
    // Get the token ID from the event
    const event = receipt.logs.find(log => {
        try {
            const parsed = digitalWarranty.interface.parseLog(log);
            return parsed.name === 'WarrantyIssued';
        } catch (e) {
            return false;
        }
    });
    
    if (event) {
        const parsedEvent = digitalWarranty.interface.parseLog(event);
        const tokenId = parsedEvent.args.tokenId;
        console.log("🎟️  Token ID:", tokenId.toString());
        
        // Test warranty details
        console.log("\n📋 Testing warranty details retrieval...");
        const details = await digitalWarranty.getWarrantyDetails(tokenId);
        console.log("📝 Warranty Details:");
        console.log("   Product:", details[0]);
        console.log("   Model:", details[1]);
        console.log("   Serial:", details[2]);
        console.log("   Purchase Date:", new Date(Number(details[3]) * 1000));
        console.log("   Expiry Date:", new Date(Number(details[4]) * 1000));
        console.log("   Is Valid:", details[7]);
        
        // Test warranty validation
        const isValid = await digitalWarranty.isWarrantyValid(tokenId);
        console.log("✅ Warranty is valid:", isValid);
        
        // Test ownership
        const owner = await digitalWarranty.ownerOf(tokenId);
        console.log("👤 Owner:", owner);
        console.log("🎯 Expected:", customer.address);
        console.log("✅ Ownership correct:", owner === customer.address);
    }
    
    console.log("\n🎉 All tests completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });
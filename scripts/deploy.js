const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying DigitalWarranty contract...");

  const DigitalWarranty = await hre.ethers.getContractFactory("DigitalWarranty");
  const digitalWarranty = await DigitalWarranty.deploy();

  await digitalWarranty.waitForDeployment();

  const contractAddress = await digitalWarranty.getAddress();
  console.log("DigitalWarranty deployed to:", contractAddress);

  // Save contract address to .env file
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update CONTRACT_ADDRESS in .env
  if (envContent.includes('CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(/CONTRACT_ADDRESS=.*/g, `CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    envContent += `\nCONTRAXT_ADDRESS=${contractAddress}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("Contract address saved to .env file");

  // Verify contract on Etherscan (if on testnet/mainnet)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await digitalWarranty.deployTransaction.wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
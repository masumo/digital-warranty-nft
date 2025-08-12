Digital Warranty NFT System
This project is an implementation of a blockchain-based digital warranty system using Non-Fungible Tokens (NFTs). Its goal is to provide a transparent, secure, and immutable way to manage product warranties.

Key Features
NFT-Based Digital Warranty: Every product warranty is represented by a unique NFT stored on the Ethereum blockchain.

Warranty Issuance: Manufacturers can easily issue new warranties for products, which automatically creates a new NFT for the customer.

Verification: Consumers can verify the authenticity and status of their warranty at any time.

Ownership Transfer: Warranty ownership can be transferred to another party, for example, when the product is resold.

Backend Integration: A backend API built with Node.js and Express.js facilitates interaction between the web application and the smart contract.

Technologies Used
Smart Contracts

Solidity (^0.8.19): The programming language for smart contracts.

Hardhat: A development environment for compiling, deploying, and testing smart contracts.

OpenZeppelin Contracts: A library of secure and tested smart contracts (^4.9.3).

Backend

Node.js & Express.js: A backend framework for building RESTful APIs.

Ethers.js: A library for interacting with the Ethereum blockchain (^6.8.0).

MongoDB & Mongoose: A database and ODM for storing product and warranty data.

Project Structure
The project's main directory structure is as follows:

digital-warranty-nft/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── app.js
│   └── package.json
├── contracts/
│   └── DigitalWarranty.sol
├── scripts/
│   └── deploy.js
├── .env
├── .gitignore
├── hardhat.config.js
└── package.json

Installation and Usage Guide
Prerequisites

Node.js (>=18.0.0)

MongoDB (local or remote)

MetaMask or another Ethereum wallet

Steps

Clone the Repository:
Open your terminal and run the following command to clone the project:

git clone https://github.com/masumo/digital-warranty-nft.git
cd digital-warranty-nft

Install Dependencies:
Run the following commands in the terminal to install all necessary packages:

npm install
cd backend
npm install
cd ..

Configure the Environment:

Create a .env file in the main project directory (digital-warranty-nft).

Fill the .env file with your credentials. You can get RPC URLs from Infura and a private key from MetaMask.

# Blockchain Configuration
SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"
MUMBAI_RPC_URL="https://polygon-mumbai.infura.io/v3/YOUR_INFURA_PROJECT_ID"
PRIVATE_KEY="your_private_key_here"
ETHERSCAN_API_KEY="your_etherscan_api_key"

# Backend Configuration
PORT=3000
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/warranty_system"
JWT_SECRET="your_jwt_secret_here"

# Contract Address (will be filled after deployment)
CONTRACT_ADDRESS=

Compile the Smart Contract:
Run the following command to compile the smart contract and generate the required ABI files:

npx hardhat compile

Deploy the Contract to a Local Network:

Open the first terminal and run the local Hardhat node:

npm run node

Open a second terminal and deploy the contract:

npm run deploy:local

Run the Backend Server:

Open a third terminal and run the backend server:

npm run backend

Test the API Endpoints (using curl)
Once the server is running, you can test its functionality with curl commands from your terminal. Be sure to change the serialNumber to avoid duplicate key errors.

# Issue a Warranty
curl -X POST http://localhost:3000/api/warranty/issue \
-H "Content-Type: application/json" \
-d '{
  "productName": "MacBook Pro M3",
  "productModel": "MRX63",
  "serialNumber": "MAC123456790",
  "manufacturer": "Apple Inc",
  "retailer": "Apple Store Indonesia",
  "customerAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "warrantyPeriod": 365
}' | jq '.'

# Get Warranty Details (replace `1` with the generated tokenId)
curl http://localhost:3000/api/warranty/1 | jq '.'
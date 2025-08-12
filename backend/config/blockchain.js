const { ethers } = require('ethers');
require('dotenv').config();

// Tambahkan baris ini untuk debugging
//console.log("PRIVATE_KEY from .env:", process.env.PRIVATE_KEY);

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Import ABI dari compiled contract
const contractABI = require('../../artifacts/contracts/DigitalWarranty.sol/DigitalWarranty.json').abi;
const contractAddress = process.env.CONTRACT_ADDRESS;

const contract = new ethers.Contract(contractAddress, contractABI, wallet);

module.exports = {
    provider,
    wallet,
    contract,
    contractAddress
};
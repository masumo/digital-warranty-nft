// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract DigitalWarranty is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct Warranty {
        string productName;
        string productModel;
        string serialNumber;
        uint256 purchaseDate;
        uint256 warrantyPeriod; // in seconds
        address manufacturer;
        address retailer;
        bool isActive;
        string metadataURI;
    }

    mapping(uint256 => Warranty) public warranties;
    mapping(string => bool) public serialNumberExists;
    
    event WarrantyIssued(
        uint256 indexed tokenId,
        address indexed customer,
        string productName,
        string serialNumber,
        uint256 purchaseDate,
        uint256 warrantyPeriod
    );
    
    event WarrantyTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );
    
    event WarrantyClaimed(
        uint256 indexed tokenId,
        address indexed customer,
        uint256 claimDate
    );

    constructor() ERC721("DigitalWarranty", "DW") {}

    function issueWarranty(
        address customer,
        string memory productName,
        string memory productModel,
        string memory serialNumber,
        uint256 warrantyPeriodDays,
        address manufacturer,
        address retailer,
        string memory metadataURI
    ) public onlyOwner returns (uint256) {
        require(!serialNumberExists[serialNumber], "Serial number already exists");
        require(customer != address(0), "Invalid customer address");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        uint256 warrantyPeriod = warrantyPeriodDays * 24 * 60 * 60; // Convert days to seconds
        
        warranties[newTokenId] = Warranty({
            productName: productName,
            productModel: productModel,
            serialNumber: serialNumber,
            purchaseDate: block.timestamp,
            warrantyPeriod: warrantyPeriod,
            manufacturer: manufacturer,
            retailer: retailer,
            isActive: true,
            metadataURI: metadataURI
        });
        
        serialNumberExists[serialNumber] = true;
        
        _mint(customer, newTokenId);
        _setTokenURI(newTokenId, metadataURI);
        
        emit WarrantyIssued(
            newTokenId,
            customer,
            productName,
            serialNumber,
            block.timestamp,
            warrantyPeriod
        );
        
        return newTokenId;
    }

    function isWarrantyValid(uint256 tokenId) public view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        
        Warranty memory warranty = warranties[tokenId];
        return warranty.isActive && 
               (warranty.purchaseDate + warranty.warrantyPeriod > block.timestamp);
    }

    function getWarrantyDetails(uint256 tokenId) public view returns (
        string memory productName,
        string memory productModel,
        string memory serialNumber,
        uint256 purchaseDate,
        uint256 expiryDate,
        address manufacturer,
        address retailer,
        bool isValid
    ) {
        require(_exists(tokenId), "Token does not exist");
        
        Warranty memory warranty = warranties[tokenId];
        
        return (
            warranty.productName,
            warranty.productModel,
            warranty.serialNumber,
            warranty.purchaseDate,
            warranty.purchaseDate + warranty.warrantyPeriod,
            warranty.manufacturer,
            warranty.retailer,
            isWarrantyValid(tokenId)
        );
    }

    function claimWarranty(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner of this warranty");
        require(isWarrantyValid(tokenId), "Warranty is not valid or expired");
        
        emit WarrantyClaimed(tokenId, msg.sender, block.timestamp);
    }

    function transferWarranty(address to, uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner of this warranty");
        
        safeTransferFrom(msg.sender, to, tokenId);
        
        emit WarrantyTransferred(tokenId, msg.sender, to);
    }

    function deactivateWarranty(uint256 tokenId) public onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        warranties[tokenId].isActive = false;
    }

    // Override functions required by Solidity
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LuckyMilitiaSkins
 * @dev NFT collection for tactical weapon skins on Base
 */
contract LuckyMilitiaSkins is ERC721Enumerable, Ownable {
    uint256 private _tokenIdCounter;
    
    struct SkinMetadata {
        string weaponType; // pistol, smg, shotgun, railgun
        string rarity;     // common, rare, legendary
        uint256 powerBoost;
    }
    
    mapping(uint256 => SkinMetadata) public skins;
    
    constructor() ERC721("Lucky Militia Tactical Skins", "LMTS") Ownable(msg.sender) {}
    
    function mintSkin(
        address to,
        string memory weaponType,
        string memory rarity,
        uint256 powerBoost
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        skins[tokenId] = SkinMetadata(weaponType, rarity, powerBoost);
        
        return tokenId;
    }
    
    function getSkinMetadata(uint256 tokenId) external view returns (SkinMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Skin does not exist");
        return skins[tokenId];
    }
}

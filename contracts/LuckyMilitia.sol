// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title LuckyMilitia
 * @dev Single unified contract for Game Logic, LMT Currency, and Weapon Skins.
 *      Uses ERC1155:
 *      - ID 0: LMT (Fungible Currency)
 *      - ID 1+: Skins (Non-Fungible / Unique Items)
 */
contract LuckyMilitia is ERC1155, ERC1155Supply, Ownable {
    using Strings for uint256;

    // Token IDs
    uint256 public constant LMT_ID = 0;
    uint256 private _skinIdCounter = 1;

    // Game Config
    uint256 public constant KILL_REWARD = 10 * 10**18;
    uint256 public constant WIN_REWARD = 100 * 10**18;
    
    string public name = "Lucky Militia Universe";
    string public symbol = "LMU";

    // Skin Metadata
    struct SkinMetadata {
        string weaponType; // pistol, smg, shotgun, railgun
        string rarity;     // common, rare, legendary
        uint256 powerBoost;
    }
    mapping(uint256 => SkinMetadata) public skinMetadata;

    // Leaderboard Stats
    struct PlayerStats {
        uint256 kills;
        uint256 wins;
        uint256 gamesPlayed;
        uint256 lastCombatTime;
    }
    mapping(address => PlayerStats) public stats;
    address[] public operators;
    mapping(address => bool) public isOperator;

    // Events
    event KillRecorded(address indexed player, uint256 reward);
    event WinRecorded(address indexed player, uint256 reward);
    event StatsUpdated(address indexed operator, uint256 kills, uint256 wins, uint256 gamesPlayed);
    event SkinMinted(address indexed to, uint256 tokenId, string weaponType, string rarity);

    constructor() ERC1155("https://api.luckymilitia.com/metadata/{id}") Ownable(msg.sender) {
        // Initial LMT Supply to owner if needed
        _mint(msg.sender, LMT_ID, 1000000 * 10**18, "");
    }

    // --- Game Logic ---

    function recordKill(address player) external onlyOwner {
        // Mint LMT Reward
        _mint(player, LMT_ID, KILL_REWARD, "");

        // Update Stats
        _updateLocalStats(player, 1, 0);

        emit KillRecorded(player, KILL_REWARD);
    }

    function recordWin(address player) external onlyOwner {
        // Mint LMT Reward
        _mint(player, LMT_ID, WIN_REWARD, "");

        // Update Stats
        _updateLocalStats(player, 0, 1);

        emit WinRecorded(player, WIN_REWARD);
    }

    function updateStats(
        address operator,
        uint256 kills,
        uint256 wins,
        bool incrementGames
    ) external onlyOwner {
        if (!isOperator[operator]) {
            operators.push(operator);
            isOperator[operator] = true;
        }

        stats[operator].kills += kills;
        stats[operator].wins += wins;
        if (incrementGames) stats[operator].gamesPlayed++;
        stats[operator].lastCombatTime = block.timestamp;

        emit StatsUpdated(operator, stats[operator].kills, stats[operator].wins, stats[operator].gamesPlayed);
    }

    function _updateLocalStats(address player, uint256 kills, uint256 wins) internal {
        if (!isOperator[player]) {
            operators.push(player);
            isOperator[player] = true;
        }
        stats[player].kills += kills;
        stats[player].wins += wins;
        stats[player].lastCombatTime = block.timestamp;
    }

    // --- Skins Logic ---

    function mintSkin(
        address to,
        string memory weaponType,
        string memory rarity,
        uint256 powerBoost
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _skinIdCounter++;
        
        // Mint NFT (Amount = 1)
        _mint(to, tokenId, 1, "");
        
        skinMetadata[tokenId] = SkinMetadata(weaponType, rarity, powerBoost);
        
        emit SkinMinted(to, tokenId, weaponType, rarity);
        return tokenId;
    }

    function getSkinMetadata(uint256 tokenId) external view returns (SkinMetadata memory) {
        require(exists(tokenId), "Skin does not exist");
        return skinMetadata[tokenId];
    }
    
    // --- Views ---

    function getOperatorCount() external view returns (uint256) {
        return operators.length;
    }
    
    function getOperatorStats(address operator) external view returns (PlayerStats memory) {
        return stats[operator];
    }
    
    /**
     * @dev Helper to get LMT balance (ID 0)
     */
    function getLMTBalance(address account) external view returns (uint256) {
        return balanceOf(account, LMT_ID);
    }

    // Overrides required by Solidity
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }
}

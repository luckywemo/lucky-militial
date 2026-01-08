// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LuckyMilitiaLeaderboard
 * @dev Stores on-chain tactical stats for operators on Base
 */
contract LuckyMilitiaLeaderboard is Ownable {
    struct PlayerStats {
        uint256 kills;
        uint256 wins;
        uint256 gamesPlayed;
        uint256 lastCombatTime;
    }
    
    mapping(address => PlayerStats) public stats;
    address[] public operators;
    mapping(address => bool) public isOperator;
    
    event StatsUpdated(address indexed operator, uint256 kills, uint256 wins, uint256 gamesPlayed);
    
    constructor() Ownable(msg.sender) {}
    
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
        
        emit StatsUpdated(
            operator, 
            stats[operator].kills, 
            stats[operator].wins, 
            stats[operator].gamesPlayed
        );
    }
    
    function getOperatorCount() external view returns (uint256) {
        return operators.length;
    }
    
    function getOperatorStats(address operator) external view returns (PlayerStats memory) {
        return stats[operator];
    }
}

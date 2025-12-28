// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LuckyMilitiaRewards
 * @dev Distributes LMT tokens on Base for player achievements
 */
contract LuckyMilitiaRewards is ERC20, Ownable {
    mapping(address => uint256) public playerKills;
    mapping(address => uint256) public playerWins;
    
    uint256 public constant KILL_REWARD = 10 * 10**18; // 10 LMT
    uint256 public constant WIN_REWARD = 100 * 10**18; // 100 LMT
    
    uint256 public dailyLimit = 1000 * 10**18; 
    mapping(address => uint256) public lastRewardTime;
    mapping(address => uint256) public dailyRewardTotal;

    event KillRecorded(address indexed player, uint256 totalKills, uint256 reward);
    event WinRecorded(address indexed player, uint256 totalWins, uint256 reward);
    
    constructor() ERC20("Lucky Militia Token", "LMT") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**18); // 1M Initial Supply
    }
    
    function recordKill(address player) external onlyOwner {
        playerKills[player]++;
        _mint(player, KILL_REWARD);
        emit KillRecorded(player, playerKills[player], KILL_REWARD);
    }
    
    function recordWin(address player) external onlyOwner {
        playerWins[player]++;
        _mint(player, WIN_REWARD);
        emit WinRecorded(player, playerWins[player], WIN_REWARD);
    }
    
    function getPlayerStats(address player) external view returns (uint256 kills, uint256 wins) {
        return (playerKills[player], playerWins[player]);
    }

    function setDailyLimit(uint256 newLimit) external onlyOwner {
        dailyLimit = newLimit;
    }
}

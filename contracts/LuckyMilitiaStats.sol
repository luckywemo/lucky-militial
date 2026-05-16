// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LuckyMilitiaStats
 * @notice On-chain combat record registry for Lucky Militia on Base.
 *         Every match result is a verifiable, permanent transaction on Basescan.
 * @dev Deployed on Base Sepolia (testnet) and Base Mainnet.
 *      Designed to work with Sequence embedded wallets (session key signing).
 */
contract LuckyMilitiaStats {

    // ──────────────────────────────────────────
    //  STRUCTS
    // ──────────────────────────────────────────

    struct PlayerRecord {
        string   username;
        uint256  kills;
        uint256  wins;
        uint256  gamesPlayed;
        uint256  pvpKills;
        uint256  pvpWins;
        uint256  pveKills;
        uint256  pveWins;
        uint256  registeredAt;
        uint256  lastMatchAt;
        bool     exists;
    }

    // ──────────────────────────────────────────
    //  EVENTS (Sequence Indexer watches these)
    // ──────────────────────────────────────────

    event PlayerRegistered(
        address indexed player,
        string  username,
        uint256 timestamp
    );

    event MatchRecorded(
        address indexed player,
        uint256 kills,
        uint256 wins,
        string  mode,
        uint256 score,
        uint256 timestamp
    );

    // ──────────────────────────────────────────
    //  STATE
    // ──────────────────────────────────────────

    address public owner;
    
    mapping(address => PlayerRecord) public players;
    address[] public playerList;
    
    // Scoring weights
    uint256 public constant PVP_KILL_POINTS = 25;
    uint256 public constant PVP_WIN_POINTS  = 100;
    uint256 public constant PVE_KILL_POINTS = 5;
    uint256 public constant PVE_WIN_POINTS  = 20;

    // Authorized relayers (Sequence relayer + your backend)
    mapping(address => bool) public authorizedRelayers;

    // ──────────────────────────────────────────
    //  MODIFIERS
    // ──────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedRelayers[msg.sender] || msg.sender == tx.origin,
            "NOT_AUTHORIZED"
        );
        _;
    }

    // ──────────────────────────────────────────
    //  CONSTRUCTOR
    // ──────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ──────────────────────────────────────────
    //  ADMIN
    // ──────────────────────────────────────────

    function setAuthorizedRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        owner = newOwner;
    }

    // ──────────────────────────────────────────
    //  PLAYER REGISTRATION
    // ──────────────────────────────────────────

    /**
     * @notice Register a new operator. Called once per player.
     * @param player  The player's wallet address (Sequence smart wallet)
     * @param username The chosen codename
     */
    function registerPlayer(address player, string calldata username) external onlyAuthorized {
        require(!players[player].exists, "ALREADY_REGISTERED");
        require(bytes(username).length > 0 && bytes(username).length <= 32, "INVALID_USERNAME");

        players[player] = PlayerRecord({
            username:     username,
            kills:        0,
            wins:         0,
            gamesPlayed:  0,
            pvpKills:     0,
            pvpWins:      0,
            pveKills:     0,
            pveWins:      0,
            registeredAt: block.timestamp,
            lastMatchAt:  0,
            exists:       true
        });

        playerList.push(player);

        emit PlayerRegistered(player, username, block.timestamp);
    }

    // ──────────────────────────────────────────
    //  MATCH RECORDING
    // ──────────────────────────────────────────

    /**
     * @notice Record the result of a completed match.
     * @param player The player's address
     * @param kills  Number of kills this match
     * @param wins   1 if the player won, 0 otherwise
     * @param mode   "pvp" or "pve"
     */
    function recordMatchResult(
        address player,
        uint256 kills,
        uint256 wins,
        string calldata mode
    ) external onlyAuthorized {
        require(players[player].exists, "PLAYER_NOT_REGISTERED");
        require(wins <= 1, "INVALID_WIN_COUNT");

        PlayerRecord storage record = players[player];

        record.kills       += kills;
        record.wins        += wins;
        record.gamesPlayed += 1;
        record.lastMatchAt  = block.timestamp;

        uint256 score;

        // Route to mode-specific counters
        if (_compareStrings(mode, "pvp")) {
            record.pvpKills += kills;
            record.pvpWins  += wins;
            score = (kills * PVP_KILL_POINTS) + (wins * PVP_WIN_POINTS);
        } else {
            record.pveKills += kills;
            record.pveWins  += wins;
            score = (kills * PVE_KILL_POINTS) + (wins * PVE_WIN_POINTS);
        }

        emit MatchRecorded(player, kills, wins, mode, score, block.timestamp);
    }

    // ──────────────────────────────────────────
    //  READ FUNCTIONS
    // ──────────────────────────────────────────

    function getStats(address player) external view returns (
        string memory username,
        uint256 kills,
        uint256 wins,
        uint256 gamesPlayed,
        uint256 pvpKills,
        uint256 pvpWins,
        uint256 pveKills,
        uint256 pveWins,
        uint256 registeredAt,
        uint256 lastMatchAt
    ) {
        PlayerRecord storage r = players[player];
        require(r.exists, "PLAYER_NOT_FOUND");
        return (
            r.username,
            r.kills,
            r.wins,
            r.gamesPlayed,
            r.pvpKills,
            r.pvpWins,
            r.pveKills,
            r.pveWins,
            r.registeredAt,
            r.lastMatchAt
        );
    }

    function getPlayerScore(address player) external view returns (uint256) {
        PlayerRecord storage r = players[player];
        if (!r.exists) return 0;
        return (r.pvpKills * PVP_KILL_POINTS) + (r.pvpWins * PVP_WIN_POINTS)
             + (r.pveKills * PVE_KILL_POINTS) + (r.pveWins * PVE_WIN_POINTS);
    }

    function getPlayerCount() external view returns (uint256) {
        return playerList.length;
    }

    function isRegistered(address player) external view returns (bool) {
        return players[player].exists;
    }

    // ──────────────────────────────────────────
    //  INTERNAL
    // ──────────────────────────────────────────

    function _compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}

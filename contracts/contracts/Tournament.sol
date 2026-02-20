// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Tournament
 * @notice PVP tournament contract for Frost Rush.
 *         Players stake AVAX to enter a 1v1 match.
 *         Results are verified by the backend and signed.
 */
contract Tournament is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Match {
        address player1;
        address player2;
        uint256 stake;
        uint256 score1;
        uint256 score2;
        address winner;
        uint256 prizePool;
        bool resolved;
        bool player1Claimed;
        bool player2Claimed;
        uint256 createdAt;
    }

    /// @notice Address of the backend signer that authorizes match results
    address public backendSigner;

    /// @notice Fee percentage taken from the total pool (e.g., 10 = 10%)
    uint256 public feePercentage = 10;

    /// @notice Total fees collected by the contract
    uint256 public totalFeesCollected;

    /// @notice Counter for match IDs
    uint256 public nextMatchId;

    /// @notice Mapping from match ID to Match data
    mapping(uint256 => Match) public matches;

    event MatchCreated(uint256 indexed matchId, address indexed player1, uint256 stake);
    event MatchJoined(uint256 indexed matchId, address indexed player2, uint256 stake);
    event MatchResolved(uint256 indexed matchId, uint256 score1, uint256 score2, address winner);
    event WinningsClaimed(uint256 indexed matchId, address indexed player, uint256 amount);
    event MatchCancelled(uint256 indexed matchId, address indexed player1, uint256 refundAmount);
    event BackendSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event FeePercentageUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed owner, uint256 amount);

    /**
     * @param _backendSigner Address of the backend hot wallet that signs match results
     */
    constructor(address _backendSigner) Ownable(msg.sender) {
        require(_backendSigner != address(0), "Invalid signer address");
        backendSigner = _backendSigner;
    }

    /**
     * @notice Create a new match and stake AVAX.
     * @return matchId The ID of the created match
     */
    function createMatch() external payable nonReentrant returns (uint256) {
        require(msg.value > 0, "Stake must be > 0");

        uint256 matchId = nextMatchId++;
        matches[matchId] = Match({
            player1: msg.sender,
            player2: address(0),
            stake: msg.value,
            score1: 0,
            score2: 0,
            winner: address(0),
            prizePool: 0,
            resolved: false,
            player1Claimed: false,
            player2Claimed: false,
            createdAt: block.timestamp
        });

        emit MatchCreated(matchId, msg.sender, msg.value);
        return matchId;
    }

    /**
     * @notice Join an existing match by matching the stake.
     * @param matchId The ID of the match to join
     */
    function joinMatch(uint256 matchId) external payable nonReentrant {
        Match storage m = matches[matchId];
        require(m.player1 != address(0), "Match does not exist");
        require(m.player2 == address(0), "Match already full");
        require(m.player1 != msg.sender, "Cannot play against yourself");
        require(msg.value == m.stake, "Must match the stake");

        m.player2 = msg.sender;

        emit MatchJoined(matchId, msg.sender, msg.value);
    }

    /**
     * @notice Resolve a match with scores. Callable by anyone but requires backend signature.
     * @param matchId The ID of the match to resolve
     * @param score1 Score of player 1
     * @param score2 Score of player 2
     * @param signature Backend-signed message authorizing these results
     */
    function resolveMatch(
        uint256 matchId,
        uint256 score1,
        uint256 score2,
        bytes calldata signature
    ) external nonReentrant {
        Match storage m = matches[matchId];
        require(m.player2 != address(0), "Match not joined");
        require(!m.resolved, "Match already resolved");

        // Verify backend signature
        // Hash includes matchId and both scores to prevent manipulation
        bytes32 messageHash = keccak256(abi.encodePacked(
            block.chainid,
            address(this),
            matchId,
            score1,
            score2
        ));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == backendSigner, "Invalid signature");

        m.score1 = score1;
        m.score2 = score2;
        m.resolved = true;

        if (score1 > score2) {
            m.winner = m.player1;
        } else if (score2 > score1) {
            m.winner = m.player2;
        } else {
            // Tie
            m.winner = address(0);
        }

        // Calculate and track fees immediately upon resolution
        uint256 totalPool = m.stake * 2;
        uint256 fee = (totalPool * feePercentage) / 100;
        m.prizePool = totalPool - fee;
        totalFeesCollected += fee;

        emit MatchResolved(matchId, score1, score2, m.winner);
    }

    /**
     * @notice Claim winnings after a match is resolved.
     * @param matchId The ID of the match
     */
    function claimWinnings(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        require(m.resolved, "Match not resolved");

        uint256 prizePool = m.prizePool;

        if (m.winner != address(0)) {
            // There is a winner
            require(msg.sender == m.winner, "Only winner can claim");
            require(!m.player1Claimed && !m.player2Claimed, "Already claimed");

            m.player1Claimed = true;
            m.player2Claimed = true;

            (bool success, ) = payable(m.winner).call{value: prizePool}("");
            require(success, "Transfer failed");

            emit WinningsClaimed(matchId, m.winner, prizePool);
        } else {
            // Tie - each participant gets 50% of prize pool
            uint256 halfPrize = prizePool / 2;
            if (msg.sender == m.player1) {
                require(!m.player1Claimed, "Player 1 already claimed");
                m.player1Claimed = true;
                (bool success, ) = payable(m.player1).call{value: halfPrize}("");
                require(success, "Transfer failed");
                emit WinningsClaimed(matchId, m.player1, halfPrize);
            } else if (msg.sender == m.player2) {
                require(!m.player2Claimed, "Player 2 already claimed");
                m.player2Claimed = true;
                (bool success, ) = payable(m.player2).call{value: halfPrize}("");
                require(success, "Transfer failed");
                emit WinningsClaimed(matchId, m.player2, halfPrize);
            } else {
                revert("Not a participant");
            }
        }
    }

    /**
     * @notice Cancel a match that hasn't been joined yet. Returns stake to player 1.
     * @param matchId The ID of the match to cancel
     */
    function cancelMatch(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        require(m.player1 == msg.sender, "Only creator can cancel");
        require(m.player2 == address(0), "Cannot cancel joined match");
        require(!m.resolved, "Already resolved");

        uint256 refundAmount = m.stake;
        
        // Clear match data to prevent re-entry
        delete matches[matchId];

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Transfer failed");

        emit MatchCancelled(matchId, msg.sender, refundAmount);
    }

    /**
     * @notice Update the backend signer address. Only callable by contract owner.
     * @param newSigner New backend signer address
     */
    function setBackendSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer address");
        address oldSigner = backendSigner;
        backendSigner = newSigner;
        emit BackendSignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Update the fee percentage. Only callable by contract owner.
     * @param newFee New fee percentage (e.g., 5 for 5%)
     */
    function setFeePercentage(uint256 newFee) external onlyOwner {
        require(newFee <= 20, "Fee too high"); // Cap at 20%
        uint256 oldFee = feePercentage;
        feePercentage = newFee;
        emit FeePercentageUpdated(oldFee, newFee);
    }

    /**
     * @notice Withdraw collected fees to the owner.
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = totalFeesCollected;
        require(amount > 0, "No fees to withdraw");
        
        totalFeesCollected = 0;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FeesWithdrawn(owner(), amount);
    }

    /**
     * @notice Get match details
     */
    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }
}

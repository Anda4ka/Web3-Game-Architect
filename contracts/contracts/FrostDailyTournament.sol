// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FrostDailyTournament
 * @notice Global daily tournament contract where players pay entry fees in AVAX.
 *         Prizes are claimed using backend signatures based on leaderboard results.
 */
contract FrostDailyTournament is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Current active tournament ID
    uint256 public currentTournamentId;
    
    /// @notice Entry fee in native AVAX
    uint256 public entryFee;
    
    /// @notice Address of the backend server that signs prize claims
    address public backendSigner;

    /// @notice Total funds available for prizes
    uint256 public prizePool;
    
    /// @notice Accumulated protocol fees
    uint256 public protocolFee;

    /// @notice Protocol fee percentage (e.g. 10 = 10%)
    uint256 public constant PROTOCOL_FEE_PERCENT = 10;

    /// @notice Mapping from tournamentId => player => isParticipating
    mapping(uint256 => mapping(address => bool)) public isRegistered;

    /// @notice Mapping from tournamentId => player => hasClaimedPrize
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event TournamentStarted(uint256 indexed tournamentId);
    event PlayerEntered(uint256 indexed tournamentId, address indexed player, uint256 fee);
    event PrizeClaimed(uint256 indexed tournamentId, address indexed player, uint256 amount);
    event BackendSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event EntryFeeUpdated(uint256 oldFee, uint256 newFee);
    event ProtocolFeeWithdrawn(address indexed owner, uint256 amount);

    /**
     * @param _backendSigner Address for ECDSA signature verification
     * @param _entryFee Initial cost to join a tournament
     */
    constructor(address _backendSigner, uint256 _entryFee) Ownable(msg.sender) {
        require(_backendSigner != address(0), "Invalid signer");
        backendSigner = _backendSigner;
        entryFee = _entryFee;
        currentTournamentId = 1;
        emit TournamentStarted(currentTournamentId);
    }

    /**
     * @notice Player pays entry fee to participate in the current tournament.
     */
    function enterTournament() external payable nonReentrant {
        require(msg.value == entryFee, "Incorrect entry fee");
        require(!isRegistered[currentTournamentId][msg.sender], "Already registered");

        uint256 fee = (msg.value * PROTOCOL_FEE_PERCENT) / 100;
        protocolFee += fee;
        prizePool += (msg.value - fee);

        isRegistered[currentTournamentId][msg.sender] = true;

        emit PlayerEntered(currentTournamentId, msg.sender, msg.value);
    }

    /**
     * @notice Claim tournament prize from the pool using backend signature.
     * @param tournamentId ID of the tournament the player participated in
     * @param prizeAmount Amount of native AVAX to claim
     * @param signature Backend ECDSA signature
     */
    function claimPrize(
        uint256 tournamentId,
        uint256 prizeAmount,
        bytes calldata signature
    ) external nonReentrant {
        require(isRegistered[tournamentId][msg.sender], "Not a participant");
        require(!hasClaimed[tournamentId][msg.sender], "Prize already claimed");
        require(prizeAmount <= prizePool, "Insufficient prize pool");
        
        // Sanity check to prevent draining by compromised backend
        require(prizeAmount <= (prizePool * 80) / 100, "Prize exceeds sanity limit");

        // Verify signature: (chainId, contract, tournamentId, player, prizeAmount)
        bytes32 messageHash = keccak256(abi.encodePacked(
            block.chainid,
            address(this),
            tournamentId,
            msg.sender,
            prizeAmount
        ));
        
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        require(ethSignedHash.recover(signature) == backendSigner, "Invalid signature");

        hasClaimed[tournamentId][msg.sender] = true;
        prizePool -= prizeAmount;

        (bool success, ) = payable(msg.sender).call{value: prizeAmount}("");
        require(success, "Transfer failed");

        emit PrizeClaimed(tournamentId, msg.sender, prizeAmount);
    }

    /**
     * @notice Start the next tournament. Only owner.
     */
    function nextTournament() external onlyOwner {
        currentTournamentId++;
        emit TournamentStarted(currentTournamentId);
    }

    /**
     * @notice Update entry fee. Only owner.
     */
    function setEntryFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = entryFee;
        entryFee = _newFee;
        emit EntryFeeUpdated(oldFee, _newFee);
    }

    /**
     * @notice Update backend signer address. Only owner.
     */
    function setBackendSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "Invalid signer");
        address oldSigner = backendSigner;
        backendSigner = _newSigner;
        emit BackendSignerUpdated(oldSigner, _newSigner);
    }

    /**
     * @notice Withdraw excess funds or fees from the contract. Only owner.
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= protocolFee, "Amount exceeds protocol fee");
        protocolFee -= amount;
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdraw failed");
        emit ProtocolFeeWithdrawn(owner(), amount);
    }

    receive() external payable {
        prizePool += msg.value;
    }
}

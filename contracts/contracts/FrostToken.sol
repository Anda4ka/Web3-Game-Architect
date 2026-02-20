// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FrostToken ($FROST)
 * @notice ERC-20 token for Frost Rush game rewards.
 *         Tokens are minted via claimReward() with a backend-signed message (anti-cheat).
 *         Players can also burn tokens for in-game upgrades.
 */
contract FrostToken is ERC20, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Maximum total supply: 1 billion $FROST
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18;

    /// @notice Maximum claimable per single run: 1000 $FROST
    uint256 public constant MAX_CLAIM_PER_RUN = 1_000 * 1e18;

    /// @notice Address of the backend signer that authorizes reward claims
    address public backendSigner;

    /// @notice Tracks used nonces to prevent replay attacks (keccak256(wallet, runId) => used)
    mapping(bytes32 => bool) public usedNonces;

    /// @notice Emitted when a player claims $FROST reward
    event RewardClaimed(address indexed player, uint256 amount, uint256 runId);

    /// @notice Emitted when a player burns $FROST for upgrades
    event BurnedForUpgrade(address indexed player, uint256 amount);

    /// @notice Emitted when the backend signer is updated
    event BackendSignerUpdated(address indexed oldSigner, address indexed newSigner);

    /**
     * @param _backendSigner Address of the backend hot wallet that signs reward claims
     */
    constructor(address _backendSigner) ERC20("Frost Token", "FROST") Ownable(msg.sender) {
        require(_backendSigner != address(0), "Invalid signer address");
        backendSigner = _backendSigner;
    }

    /**
     * @notice Claim $FROST reward after a game run.
     * @param amount Amount of $FROST to mint (in wei, 18 decimals)
     * @param runId Unique identifier for the game run (prevents replay)
     * @param signature Backend-signed message authorizing this claim
     */
    function claimReward(uint256 amount, uint256 runId, bytes calldata signature) external {
        require(amount > 0, "Amount must be > 0");
        require(amount <= MAX_CLAIM_PER_RUN, "Exceeds max claim per run");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");

        // Anti-replay: each (wallet, runId) pair can only be used once
        bytes32 nonceKey = keccak256(abi.encodePacked(msg.sender, runId));
        require(!usedNonces[nonceKey], "Already claimed");

        // Verify backend signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            block.chainid,
            address(this),
            msg.sender,
            amount,
            runId
        ));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == backendSigner, "Invalid signature");

        // Mark nonce as used and mint tokens
        usedNonces[nonceKey] = true;
        _mint(msg.sender, amount);

        emit RewardClaimed(msg.sender, amount, runId);
    }

    /**
     * @notice Burn $FROST tokens for in-game upgrades (shop purchases).
     * @param amount Amount of $FROST to burn
     */
    function burnForUpgrade(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        _burn(msg.sender, amount);

        emit BurnedForUpgrade(msg.sender, amount);
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
}

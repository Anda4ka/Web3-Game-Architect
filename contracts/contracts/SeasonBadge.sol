// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SeasonBadge
 * @notice ERC-721 NFT for Frost Rush seasonal milestone achievements.
 *         Each wallet can mint one badge per season, verified by backend signature.
 */
contract SeasonBadge is ERC721, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Address of the backend signer that authorizes badge minting
    address public backendSigner;

    /// @notice Auto-incrementing token ID counter (starts at 1)
    uint256 private _tokenIdCounter;

    /// @notice Tracks whether a wallet has minted a badge for a given season
    mapping(address => mapping(uint256 => bool)) public hasMinted;

    /// @notice Maps seasonId to its metadata URI (IPFS)
    mapping(uint256 => string) public seasonURI;

    /// @notice Base URI for tokens without specific season URI
    string public baseURI;

    /// @notice Returns the total number of badges minted
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /// @notice Maps tokenId to its seasonId (for tokenURI lookup)
    mapping(uint256 => uint256) public tokenSeason;

    /// @notice Emitted when a badge is minted
    event BadgeMinted(address indexed player, uint256 indexed seasonId, uint256 tokenId);

    /// @notice Emitted when a season URI is updated
    event SeasonURIUpdated(uint256 indexed seasonId, string uri);

    /// @notice Emitted when the backend signer is updated
    event BackendSignerUpdated(address indexed oldSigner, address indexed newSigner);

    /**
     * @param _backendSigner Address of the backend hot wallet that signs mint authorizations
     */
    constructor(address _backendSigner) ERC721("Frost Rush Season Badge", "FRBADGE") Ownable(msg.sender) {
        require(_backendSigner != address(0), "Invalid signer address");
        backendSigner = _backendSigner;
        _tokenIdCounter = 0; // First mint will be tokenId 1
    }

    /**
     * @notice Mint a season badge NFT for the caller.
     * @param seasonId The season number for this badge
     * @param signature Backend-signed message authorizing this mint
     */
    function mintBadge(uint256 seasonId, bytes calldata signature) external {
        require(!hasMinted[msg.sender][seasonId], "Already minted for this season");

        // Verify backend signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            block.chainid,
            address(this),
            msg.sender,
            seasonId
        ));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == backendSigner, "Invalid signature");

        // Mark as minted for this season
        hasMinted[msg.sender][seasonId] = true;

        // Increment counter and mint (tokenId starts at 1)
        _tokenIdCounter += 1;
        uint256 newTokenId = _tokenIdCounter;

        // Store season mapping for tokenURI
        tokenSeason[newTokenId] = seasonId;

        _safeMint(msg.sender, newTokenId);

        emit BadgeMinted(msg.sender, seasonId, newTokenId);
    }

    /**
     * @notice Returns the metadata URI for a given token.
     * @param tokenId The token to query
     * @return The season URI if set, otherwise empty string
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // This will revert if token doesn't exist (OZ 5.x behavior)
        _requireOwned(tokenId);

        uint256 sId = tokenSeason[tokenId];
        string memory uri = seasonURI[sId];

        if (bytes(uri).length > 0) {
            return uri;
        }

        // Fallback: return base URI + tokenId if no season URI set
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, Strings.toString(tokenId))) : "";
    }

    /**
     * @notice Set the base URI for fallback tokens. Only callable by contract owner.
     * @param uri The IPFS or HTTP URI for the base URI
     */
    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI = uri;
    }

    /**
     * @notice Set the metadata URI for a season. Only callable by contract owner.
     * @param seasonId The season number
     * @param uri The IPFS or HTTP URI for the season metadata
     */
    function setSeasonURI(uint256 seasonId, string calldata uri) external onlyOwner {
        seasonURI[seasonId] = uri;

        emit SeasonURIUpdated(seasonId, uri);
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

export const FROST_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with deployed address
export const SEASON_BADGE_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with deployed address
export const TOURNAMENT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with deployed address

export const FROST_TOKEN_ABI = [
  "function claimReward(uint256 amount, uint256 runId, bytes signature) external",
  "function burnForUpgrade(uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "event RewardClaimed(address indexed player, uint256 amount, uint256 runId)",
  "event BurnedForUpgrade(address indexed player, uint256 amount)"
];

export const SEASON_BADGE_ABI = [
  "function mintBadge(uint256 seasonId, bytes signature) external",
  "function hasMinted(address player, uint256 seasonId) view returns (bool)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event BadgeMinted(address indexed player, uint256 indexed seasonId, uint256 tokenId)"
];

export const TOURNAMENT_ABI = [
  "function createMatch() external payable returns (uint256)",
  "function joinMatch(uint256 matchId) external payable",
  "function resolveMatch(uint256 matchId, uint256 score1, uint256 score2, bytes signature) external",
  "function claimWinnings(uint256 matchId) external",
  "function getMatch(uint256 matchId) view returns (tuple(address player1, address player2, uint256 stake, uint256 score1, uint256 score2, address winner, uint256 prizePool, bool resolved, bool player1Claimed, bool player2Claimed, uint256 createdAt))",
  "event MatchCreated(uint256 indexed matchId, address indexed player1, uint256 stake)",
  "event MatchJoined(uint256 indexed matchId, address indexed player2, uint256 stake)",
  "event MatchResolved(uint256 indexed matchId, uint256 score1, uint256 score2, address winner)",
  "event WinningsClaimed(uint256 indexed matchId, address indexed player, uint256 amount)"
];

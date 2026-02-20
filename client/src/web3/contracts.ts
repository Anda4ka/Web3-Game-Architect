export const FROST_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with deployed address
export const SEASON_BADGE_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with deployed address
export const DAILY_TOURNAMENT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with deployed address

export const FROST_TOKEN_ABI = [
  "function burn(uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

export const SEASON_BADGE_ABI = [
  "function mintBadge(uint256 seasonId, bytes signature) external",
  "function hasMinted(address player, uint256 seasonId) view returns (bool)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event BadgeMinted(address indexed player, uint256 indexed seasonId, uint256 tokenId)"
];

export const DAILY_TOURNAMENT_ABI = [
  "function currentTournamentId() view returns (uint256)",
  "function entryFee() view returns (uint256)",
  "function isRegistered(uint256 tournamentId, address player) view returns (bool)",
  "function hasClaimed(uint256 tournamentId, address player) view returns (bool)",
  "function enterTournament() external payable",
  "function claimPrize(uint256 tournamentId, uint256 prizeAmount, bytes signature) external",
  "event PlayerEntered(uint256 indexed tournamentId, address indexed player, uint256 fee)",
  "event PrizeClaimed(uint256 indexed tournamentId, address indexed player, uint256 amount)"
];

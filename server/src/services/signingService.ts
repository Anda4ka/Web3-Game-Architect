import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

export class SigningService {
  private wallet: ethers.Wallet;

  constructor() {
    const privateKey = process.env.BACKEND_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('BACKEND_PRIVATE_KEY not set');
    }
    this.wallet = new ethers.Wallet(privateKey);
  }

  /**
   * Signs a prize claim request for FrostDailyTournament.
   */
  async signPrizeClaim(
    chainId: number,
    contractAddress: string,
    tournamentId: number,
    playerAddress: string,
    prizeAmount: bigint
  ): Promise<string> {
    const messageHash = ethers.solidityPackedKeccak256(
      ['uint256', 'address', 'uint256', 'address', 'uint256'],
      [chainId, contractAddress, tournamentId, playerAddress, prizeAmount]
    );
    
    return this.wallet.signMessage(ethers.getBytes(messageHash));
  }

  /**
   * Signs a mint badge request for SeasonBadge.
   */
  async signMintBadge(
    chainId: number,
    contractAddress: string,
    playerAddress: string,
    seasonId: number
  ): Promise<string> {
    const messageHash = ethers.solidityPackedKeccak256(
      ['uint256', 'address', 'address', 'uint256'],
      [chainId, contractAddress, playerAddress, seasonId]
    );

    return this.wallet.signMessage(ethers.getBytes(messageHash));
  }

  /**
   * Signs a tournament match resolution for Tournament.
   */
  async signResolveMatch(
    chainId: number,
    contractAddress: string,
    matchId: number,
    score1: number,
    score2: number
  ): Promise<string> {
    const messageHash = ethers.solidityPackedKeccak256(
      ['uint256', 'address', 'uint256', 'uint256', 'uint256'],
      [chainId, contractAddress, matchId, score1, score2]
    );

    return this.wallet.signMessage(ethers.getBytes(messageHash));
  }

  getAddress(): string {
    return this.wallet.address;
  }
}

export const signingService = new SigningService();

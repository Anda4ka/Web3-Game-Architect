import { Contract, ethers } from 'ethers';
import { walletManager } from './wallet';
import {
  FROST_TOKEN_ADDRESS,
  FROST_TOKEN_ABI,
  SEASON_BADGE_ADDRESS,
  SEASON_BADGE_ABI,
  TOURNAMENT_ADDRESS,
  TOURNAMENT_ABI
} from './contracts';

export interface RunLogs {
  score: number;
  crystals: number;
  durationMs: number;
  telemetry: any[];
}

export class GameWeb3Service {
  private apiBaseUrl = 'http://localhost:3000'; // Adjust as needed

  /**
   * Submits game logs to the backend and claims $FROST tokens on-chain.
   */
  public async submitRunAndClaim(runId: number, logs: RunLogs): Promise<string> {
    const address = walletManager.getAddress();
    if (!address) throw new Error('Wallet not connected');

    // 1. Get signature from backend
    const response = await fetch(`${this.apiBaseUrl}/api/runs/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: address,
        runId,
        runLogs: logs
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Validation failed');
    }

    // 2. Call smart contract to claim reward
    const signer = walletManager.getSigner();
    if (!signer) throw new Error('Signer not available');

    const contract = new Contract(FROST_TOKEN_ADDRESS, FROST_TOKEN_ABI, signer);
    
    const tx = await contract.claimReward(
      data.amount,
      data.runId,
      data.signature
    );

    await tx.wait();
    return tx.hash;
  }

  /**
   * Authorizes and mints a season badge NFT.
   */
  public async mintSeasonBadge(seasonId: number, score: number): Promise<string> {
    const address = walletManager.getAddress();
    if (!address) throw new Error('Wallet not connected');

    // 1. Get authorization from backend
    const response = await fetch(`${this.apiBaseUrl}/api/badges/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: address,
        seasonId,
        score
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Authorization failed');
    }

    // 2. Call smart contract to mint
    const signer = walletManager.getSigner();
    if (!signer) throw new Error('Signer not available');

    const contract = new Contract(SEASON_BADGE_ADDRESS, SEASON_BADGE_ABI, signer);
    
    const tx = await contract.mintBadge(seasonId, data.signature);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Gets the player's $FROST balance.
   */
  public async getFrostBalance(): Promise<string> {
    const address = walletManager.getAddress();
    if (!address) return '0';

    const signer = walletManager.getSigner();
    if (!signer) return '0';

    const contract = new Contract(FROST_TOKEN_ADDRESS, FROST_TOKEN_ABI, signer);
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, 18);
  }
}

export const gameWeb3Service = new GameWeb3Service();

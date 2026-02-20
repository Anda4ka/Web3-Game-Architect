import { Contract, ethers } from 'ethers';
import { walletManager } from './wallet';
import {
  FROST_TOKEN_ADDRESS,
  FROST_TOKEN_ABI,
  SEASON_BADGE_ADDRESS,
  SEASON_BADGE_ABI,
  DAILY_TOURNAMENT_ADDRESS,
  DAILY_TOURNAMENT_ABI
} from './contracts';

export interface RunLogs {
  score: number;
  crystals: number;
  durationMs: number;
  telemetry: any[];
}

export class GameWeb3Service {
  private get apiBaseUrl(): string {
    return import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  private get contractAddress(): string {
    // In production, enforce existence, fallback to constant otherwise
    return import.meta.env.VITE_CONTRACT_ADDRESS || DAILY_TOURNAMENT_ADDRESS;
  }

  /**
   * Submits game logs to the backend for leaderboard.
   */
  public async submitRun(logs: RunLogs): Promise<void> {
    const address = walletManager.getAddress();
    if (!address) throw new Error('Wallet not connected');

    const response = await fetch(`${this.apiBaseUrl}/api/runs/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: address,
        runLogs: logs
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Submission failed');
    }
  }

  /**
   * Enters the current daily tournament.
   */
  public async enterTournament(): Promise<string> {
    const signer = walletManager.getSigner();
    if (!signer) throw new Error('Signer not available');

    const contract = new Contract(DAILY_TOURNAMENT_ADDRESS, DAILY_TOURNAMENT_ABI, signer);
    const fee = await contract.entryFee();

    const tx = await contract.enterTournament({ value: fee });
    await tx.wait();
    return tx.hash;
  }

  /**
   * 1. Requests the signature from the backend for a specific score and session.
   */
  public async requestClaimSignature(
    walletAddress: string,
    sessionId: string,
    tournamentId: number,
    score: number
  ): Promise<{ signature: string; amount: string; tournamentId: number }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          sessionId,
          tournamentId,
          score
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Server rejected claim request');
      }

      return {
        signature: data.signature,
        amount: data.amount,
        tournamentId: data.tournamentId
      };
    } catch (error: any) {
      console.error('requestClaimSignature error:', error);
      throw new Error(`Failed to request signature: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * 2. Executes the smart contract transaction using the backend's signature.
   */
  public async executeClaimTransaction(
    tournamentId: number,
    prizeAmount: string,
    signature: string
  ): Promise<string> {
    try {
      const signer = walletManager.getSigner();
      if (!signer) throw new Error('Signer not available (wallet disconnected?)');

      // Use dynamic contract address if set
      const addressToUse = this.contractAddress;
      const contract = new Contract(addressToUse, DAILY_TOURNAMENT_ABI, signer);

      const tx = await contract.claimPrize(
        tournamentId,
        prizeAmount,
        signature
      );

      await tx.wait();
      return tx.hash;
    } catch (error: any) {
      console.error('executeClaimTransaction error:', error);
      // Try to extract user rejection error specifically (e.g. MetaMask "User denied transaction")
      if (error?.code === 'ACTION_REJECTED' || error?.message?.includes('user rejected')) {
        throw new Error('Transaction was cancelled by the user.');
      }
      throw new Error(`Claim transaction failed: ${error?.reason || error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Authorizes and mints a season badge NFT.
   */
  public async mintSeasonBadge(seasonId: number, score: number): Promise<string> {
    const address = walletManager.getAddress();
    if (!address) throw new Error('Wallet not connected');

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

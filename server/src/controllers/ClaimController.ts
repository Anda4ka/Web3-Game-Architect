import { Request, Response } from 'express';
import { validationService } from '../services/validationService';
import { signingService } from '../services/signingService';
import { ethers } from 'ethers';

// Temporary in-memory store for session scores since we don't have a DB connected yet.
// In a real application, this would be fetched from a database.
const sessionScores: Record<string, number> = {
    // mockSessionId: mockScore
    "mock-session-123": 500,
    "mock-session-456": 1200
};

export class ClaimController {
    /**
     * Handles the request to claim a tournament reward.
     */
    public async claimReward(req: Request, res: Response): Promise<void> {
        try {
            const { walletAddress, sessionId, tournamentId } = req.body;

            // 1. Validate input
            if (!walletAddress || !sessionId || tournamentId === undefined) {
                res.status(400).json({ success: false, error: 'Missing required parameters: walletAddress, sessionId, or tournamentId' });
                return;
            }

            if (!ethers.isAddress(walletAddress)) {
                res.status(400).json({ success: false, error: 'Invalid wallet address' });
                return;
            }

            // 2. Validate Session (Mock logic since ValidationService expects full RunLogs which we don't receive here based on prompt)
            // In a real scenario, the session ID would correlate to a validated run in the DB.
            const score = sessionScores[sessionId];

            if (score === undefined) {
                res.status(403).json({ success: false, error: 'Invalid or expired session ID.' });
                return;
            }

            // 3. Calculate Prize
            // HARDCODED MVP LOGIC: prizeAmount = score * 100000000000000 (roughly 0.0001 AVAX per point)
            const prizePerPoint = 100000000000000n; // Use BigInt (n suffix)
            const prizeAmountBigInt = BigInt(score) * prizePerPoint;
            const prizeAmount = prizeAmountBigInt.toString();

            // 4. Get Environment Variables
            const chainIdStr = process.env.CHAIN_ID;
            const contractAddress = process.env.CONTRACT_ADDRESS;

            if (!chainIdStr || !contractAddress) {
                console.error("Missing CHAIN_ID or CONTRACT_ADDRESS in environment variables.");
                res.status(500).json({ success: false, error: 'Server misconfiguration.' });
                return;
            }

            const chainId = parseInt(chainIdStr, 10);

            // 5. Generate Signature
            const signature = await signingService.signPrizeClaim(
                walletAddress,
                tournamentId,
                prizeAmount,
                contractAddress,
                chainId
            );

            // Optional: Mark session as claimed to prevent replay attacks (in-memory for MVP)
            delete sessionScores[sessionId];

            // 6. Return Response
            res.status(200).json({
                success: true,
                signature,
                amount: prizeAmount,
                tournamentId
            });

        } catch (error: any) {
            console.error('Error claiming reward:', error);
            res.status(500).json({ success: false, error: 'Internal server error while processing claim.' });
        }
    }
}

export const claimController = new ClaimController();

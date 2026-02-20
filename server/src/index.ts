import Fastify from 'fastify';
import cors from '@fastify/cors';
import postgres from '@fastify/postgres';
import dotenv from 'dotenv';
import { validationService, RunLogs } from './services/validationService.js';
import { signingService } from './services/signingService.js';

dotenv.config();

const fastify = Fastify({
  logger: true
});

// Register Plugins
fastify.register(cors, {
  origin: '*' // In production, restrict this to your game domain
});

// Database connection
fastify.register(postgres, {
  connectionString: process.env.DATABASE_URL
});

// ─── Health Check ──────────────────────────────────────────────────
fastify.get('/health', async () => {
  return { status: 'ok', signer: signingService.getAddress() };
});

// ─── Submit Run (Leaderboard only) ───────────────────────────────────
interface SubmitRunBody {
  walletAddress: string;
  runLogs: RunLogs;
}

fastify.post<{ Body: SubmitRunBody }>('/api/runs/submit', async (request, reply) => {
  const { walletAddress, runLogs } = request.body;

  if (!walletAddress || !runLogs) {
    return reply.status(400).send({ error: 'Missing parameters' });
  }

  // 1. Validate the run (Anti-cheat)
  const validation = validationService.validateRun(runLogs);
  if (!validation.valid) {
    return reply.status(403).send({ error: 'Validation failed', reason: validation.reason });
  }

  // 2. Store in DB for leaderboard
  try {
    const client = await fastify.pg.connect();
    await client.query(
      'INSERT INTO runs (user_address, score, crystals, duration_ms) VALUES ($1, $2, $3, $4)',
      [walletAddress, runLogs.score, runLogs.crystals, runLogs.durationMs]
    );
    client.release();
    return { success: true };
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Database error' });
  }
});

// ─── Badge Minting Authorization ───────────────────────────────────
fastify.post('/api/badges/authorize', async (request, reply) => {
  const { walletAddress, seasonId, score } = request.body as any;

  // Milestone check: e.g., score > 10000
  if (score < 10000) {
    return reply.status(403).send({ error: 'Score threshold not reached' });
  }

  try {
    const chainId = parseInt(process.env.CHAIN_ID || '43113');
    const contractAddress = process.env.SEASON_BADGE_ADDRESS || '';

    const signature = await signingService.signMintBadge(
      chainId,
      contractAddress,
      walletAddress,
      seasonId
    );

    return { success: true, signature };
  } catch (err) {
    return reply.status(500).send({ error: 'Signature generation failed' });
  }
});

// ─── Claim Tournament Prize ────────────────────────────────────────
fastify.post('/api/tournament/claim', async (request, reply) => {
  const { walletAddress, tournamentId } = request.body as any;

  if (!walletAddress || tournamentId === undefined) {
    return reply.status(400).send({ error: 'Missing parameters' });
  }

  // In production: check DB if user is a winner in this tournament
  // For MVP: let's assume we fetch the prize amount for this user
  const prizeAmountAVAX = "0.5"; // Example: fetched from DB/Leaderboard
  const prizeAmountWei = ethers.parseEther(prizeAmountAVAX);

  try {
    const chainId = parseInt(process.env.CHAIN_ID || '43113');
    const contractAddress = process.env.DAILY_TOURNAMENT_ADDRESS || '';

    const signature = await signingService.signPrizeClaim(
      chainId,
      contractAddress,
      tournamentId,
      walletAddress,
      prizeAmountWei
    );

    return {
      success: true,
      tournamentId,
      prizeAmount: prizeAmountWei.toString(),
      signature
    };
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Signature generation failed' });
  }
});

// ─── Start Server ──────────────────────────────────────────────────
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

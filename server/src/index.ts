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

// ─── Submit Run & Get Signature ────────────────────────────────────
interface SubmitRunBody {
  walletAddress: string;
  runLogs: RunLogs;
  runId: number;
}

fastify.post<{ Body: SubmitRunBody }>('/api/runs/submit', async (request, reply) => {
  const { walletAddress, runLogs, runId } = request.body;

  if (!walletAddress || !runLogs || !runId) {
    return reply.status(400).send({ error: 'Missing parameters' });
  }

  // 1. Validate the run (Anti-cheat)
  const validation = validationService.validateRun(runLogs);
  if (!validation.valid) {
    return reply.status(403).send({ error: 'Validation failed', reason: validation.reason });
  }

  // 2. [Optional] Store run in DB
  // For MVP, we can skip DB persistence if we want, but it's better to have it.
  /*
  try {
    const client = await fastify.pg.connect();
    await client.query(
      'INSERT INTO runs (user_address, score, crystals, duration_ms, run_id) VALUES ($1, $2, $3, $4, $5)',
      [walletAddress, runLogs.score, runLogs.crystals, runLogs.durationMs, runId]
    );
    client.release();
  } catch (err) {
    fastify.log.error(err);
  }
  */

  // 3. Generate Signature
  try {
    const chainId = parseInt(process.env.CHAIN_ID || '43113');
    const contractAddress = process.env.FROST_TOKEN_ADDRESS || '';
    
    // Amount to mint: for MVP, 1 crystal = 1 $FROST (scaled to 18 decimals)
    const amount = BigInt(runLogs.crystals) * BigInt(10**18);

    const signature = await signingService.signClaimReward(
      chainId,
      contractAddress,
      walletAddress,
      amount,
      runId
    );

    return {
      success: true,
      amount: amount.toString(),
      runId,
      signature
    };
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Signature generation failed' });
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

// ─── Tournament Match Resolution ───────────────────────────────────
fastify.post('/api/tournament/resolve', async (request, reply) => {
  const { matchId, score1, score2 } = request.body as any;

  if (matchId === undefined || score1 === undefined || score2 === undefined) {
    return reply.status(400).send({ error: 'Missing parameters' });
  }

  try {
    const chainId = parseInt(process.env.CHAIN_ID || '43113');
    const contractAddress = process.env.TOURNAMENT_ADDRESS || '';

    const signature = await signingService.signResolveMatch(
      chainId,
      contractAddress,
      matchId,
      score1,
      score2
    );

    return {
      success: true,
      matchId,
      score1,
      score2,
      signature
    };
  } catch (err) {
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

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { validationService } from './services/validationService.js';
import { signingService } from './services/signingService.js';
import routes from './routes/index.js'; // Adjust extension if needed based on tsconfig

dotenv.config();

const app = express();

// Register Middlewares
app.use(cors({
  origin: '*' // In production, restrict this to your game domain
}));
app.use(express.json());

// ─── Health Check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', signer: signingService.getSignerAddress() });
});

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api', routes);

// ─── Start Server ──────────────────────────────────────────────────
const start = () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();

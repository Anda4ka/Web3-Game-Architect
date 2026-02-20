import { Router } from 'express';
import { claimController } from '../controllers/ClaimController';

const router = Router();

// Routes for tournament claims
router.post('/claim', claimController.claimReward.bind(claimController));

export default router;

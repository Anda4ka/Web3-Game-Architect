import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const backendSignerAddress = process.env.BACKEND_SIGNER_ADDRESS;

  if (!backendSignerAddress) {
    throw new Error("BACKEND_SIGNER_ADDRESS not set in .env");
  }

  console.log("═══════════════════════════════════════════════");
  console.log("  Frost Rush — Contract Deployment");
  console.log("═══════════════════════════════════════════════");
  console.log("Deploying from:", deployer.address);
  console.log("Backend signer:", backendSignerAddress);
  console.log("");

  // ─── Deploy FrostToken ─────────────────────────────────────────────
  console.log("Deploying FrostToken...");
  const FrostToken = await ethers.getContractFactory("FrostToken");
  const frostToken = await FrostToken.deploy(backendSignerAddress);
  await frostToken.waitForDeployment();
  const frostTokenAddress = await frostToken.getAddress();
  console.log("✅ FrostToken deployed to:", frostTokenAddress);

  // ─── Deploy SeasonBadge ────────────────────────────────────────────
  console.log("\nDeploying SeasonBadge...");
  const SeasonBadge = await ethers.getContractFactory("SeasonBadge");
  const seasonBadge = await SeasonBadge.deploy(backendSignerAddress);
  await seasonBadge.waitForDeployment();
  const seasonBadgeAddress = await seasonBadge.getAddress();
  console.log("✅ SeasonBadge deployed to:", seasonBadgeAddress);

  // ─── Deploy Tournament ─────────────────────────────────────────────
  console.log("\nDeploying Tournament...");
  const Tournament = await ethers.getContractFactory("Tournament");
  const tournament = await Tournament.deploy(backendSignerAddress);
  await tournament.waitForDeployment();
  const tournamentAddress = await tournament.getAddress();
  console.log("✅ Tournament deployed to:", tournamentAddress);

  // ─── Summary ───────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Deployment Complete!");
  console.log("═══════════════════════════════════════════════");
  console.log("");
  console.log("📋 Update these in frost-rush/client/src/web3/contracts.ts:");
  console.log(`  FROST_TOKEN: '${frostTokenAddress}'`);
  console.log(`  SEASON_BADGE: '${seasonBadgeAddress}'`);
  console.log(`  TOURNAMENT: '${tournamentAddress}'`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

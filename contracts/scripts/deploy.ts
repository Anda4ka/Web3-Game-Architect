import { ethers } from "hardhat";

async function main() {
  // 1. ПУБЛИЧНЫЙ адрес твоего бэкенд-кошелька (тот, чей приватник лежит в server/.env)
  // Это НЕ твой основной кошелек. Это кошелек-робот.
  const backendSignerAddress = "0x2eA997B75F21712de74E80edc63A060ca27211A3";

  // 2. Взнос за участие в турнире (например, 0.01 AVAX)
  const entryFee = ethers.parseEther("0.01");

  console.log("Начинаем деплой FrostDailyTournament...");

  const Tournament = await ethers.getContractFactory("FrostDailyTournament");
  const tournament = await Tournament.deploy(backendSignerAddress, entryFee);

  await tournament.waitForDeployment();
  const contractAddress = await tournament.getAddress();

  console.log("====================================");
  console.log(`АДРЕС КОНТРАКТА: ${contractAddress}`);
  console.log("====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
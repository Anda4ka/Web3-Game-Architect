import { expect } from "chai";
import { ethers } from "hardhat";
import { Tournament } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Tournament", function () {
  let tournament: Tournament;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let backendSigner: SignerWithAddress;
  let otherSigner: SignerWithAddress;

  // Helper: create a valid backend signature for resolveMatch
  async function signResolveMatch(
    signer: SignerWithAddress,
    matchId: number,
    score1: number,
    score2: number
  ): Promise<string> {
    const network = await ethers.provider.getNetwork();
    const contractAddress = await tournament.getAddress();
    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256", "uint256", "uint256"],
      [network.chainId, contractAddress, matchId, score1, score2]
    );
    return signer.signMessage(ethers.getBytes(messageHash));
  }

  beforeEach(async function () {
    [owner, player1, player2, backendSigner, otherSigner] = await ethers.getSigners();

    const TournamentFactory = await ethers.getContractFactory("Tournament");
    tournament = await TournamentFactory.deploy(backendSigner.address);
    await tournament.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy with correct backendSigner", async function () {
      expect(await tournament.backendSigner()).to.equal(backendSigner.address);
    });

    it("should have correct initial fee", async function () {
      expect(await tournament.feePercentage()).to.equal(10n);
    });
  });

  describe("Match Lifecycle", function () {
    const stake = ethers.parseEther("1");

    it("should allow creating a match", async function () {
      await expect(tournament.connect(player1).createMatch({ value: stake }))
        .to.emit(tournament, "MatchCreated")
        .withArgs(0, player1.address, stake);

      const m = await tournament.matches(0);
      expect(m.player1).to.equal(player1.address);
      expect(m.stake).to.equal(stake);
    });

    it("should allow joining a match", async function () {
      await tournament.connect(player1).createMatch({ value: stake });

      await expect(tournament.connect(player2).joinMatch(0, { value: stake }))
        .to.emit(tournament, "MatchJoined")
        .withArgs(0, player2.address, stake);

      const m = await tournament.matches(0);
      expect(m.player2).to.equal(player2.address);
    });

    it("should resolve a match and identify winner (P1 wins)", async function () {
      await tournament.connect(player1).createMatch({ value: stake });
      await tournament.connect(player2).joinMatch(0, { value: stake });

      const score1 = 1000;
      const score2 = 500;
      const signature = await signResolveMatch(backendSigner, 0, score1, score2);

      await expect(tournament.resolveMatch(0, score1, score2, signature))
        .to.emit(tournament, "MatchResolved")
        .withArgs(0, score1, score2, player1.address);

      const m = await tournament.matches(0);
      expect(m.resolved).to.be.true;
      expect(m.winner).to.equal(player1.address);
    });

    it("should allow winner to claim winnings", async function () {
      await tournament.connect(player1).createMatch({ value: stake });
      await tournament.connect(player2).joinMatch(0, { value: stake });

      const score1 = 1000;
      const score2 = 500;
      const signature = await signResolveMatch(backendSigner, 0, score1, score2);
      await tournament.resolveMatch(0, score1, score2, signature);

      const totalPool = stake * 2n;
      const fee = (totalPool * 10n) / 100n;
      const prize = totalPool - fee;

      const initialBalance = await ethers.provider.getBalance(player1.address);
      
      const tx = await tournament.connect(player1).claimWinnings(0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalBalance = await ethers.provider.getBalance(player1.address);
      
      expect(finalBalance).to.equal(initialBalance + prize - gasUsed);
    });

    it("should handle ties and split prize", async function () {
      await tournament.connect(player1).createMatch({ value: stake });
      await tournament.connect(player2).joinMatch(0, { value: stake });

      const score1 = 500;
      const score2 = 500;
      const signature = await signResolveMatch(backendSigner, 0, score1, score2);
      await tournament.resolveMatch(0, score1, score2, signature);

      const totalPool = stake * 2n;
      const fee = (totalPool * 10n) / 100n;
      const prize = (totalPool - fee) / 2n;

      const balance1Before = await ethers.provider.getBalance(player1.address);
      const tx1 = await tournament.connect(player1).claimWinnings(0);
      const receipt1 = await tx1.wait();
      const gas1 = receipt1!.gasUsed * receipt1!.gasPrice;
      
      expect(await ethers.provider.getBalance(player1.address)).to.equal(balance1Before + prize - gas1);

      const balance2Before = await ethers.provider.getBalance(player2.address);
      const tx2 = await tournament.connect(player2).claimWinnings(0);
      const receipt2 = await tx2.wait();
      const gas2 = receipt2!.gasUsed * receipt2!.gasPrice;

      expect(await ethers.provider.getBalance(player2.address)).to.equal(balance2Before + prize - gas2);
    });
  });

  describe("Admin Functions", function () {
    it("should allow owner to withdraw fees", async function () {
      const stake = ethers.parseEther("1");
      await tournament.connect(player1).createMatch({ value: stake });
      await tournament.connect(player2).joinMatch(0, { value: stake });

      const signature = await signResolveMatch(backendSigner, 0, 100, 50);
      await tournament.resolveMatch(0, 100, 50, signature);

      const expectedFee = (stake * 2n * 10n) / 100n;
      expect(await tournament.totalFeesCollected()).to.equal(expectedFee);

      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      const tx = await tournament.withdrawFees();
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * receipt!.gasPrice;

      expect(await ethers.provider.getBalance(owner.address)).to.equal(initialOwnerBalance + expectedFee - gas);
      expect(await tournament.totalFeesCollected()).to.equal(0n);
    });
  });
});

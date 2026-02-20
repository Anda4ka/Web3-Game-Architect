import { expect } from "chai";
import { ethers } from "hardhat";
import { FrostDailyTournament } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FrostDailyTournament", function () {
  let tournament: FrostDailyTournament;
  let owner: SignerWithAddress;
  let player: SignerWithAddress;
  let backendSigner: SignerWithAddress;
  let otherSigner: SignerWithAddress;

  const ENTRY_FEE = ethers.parseEther("0.1");

  // Helper: create a valid backend signature for claimPrize
  async function signPrizeClaim(
    signer: SignerWithAddress,
    tournamentAddress: string,
    tournamentId: number,
    playerAddress: string,
    prizeAmount: bigint
  ): Promise<string> {
    const network = await ethers.provider.getNetwork();
    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256", "address", "uint256"],
      [network.chainId, tournamentAddress, tournamentId, playerAddress, prizeAmount]
    );
    return signer.signMessage(ethers.getBytes(messageHash));
  }

  beforeEach(async function () {
    [owner, player, backendSigner, otherSigner] = await ethers.getSigners();

    const TournamentFactory = await ethers.getContractFactory("FrostDailyTournament");
    tournament = await TournamentFactory.deploy(backendSigner.address, ENTRY_FEE);
    await tournament.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set initial values correctly", async function () {
      expect(await tournament.backendSigner()).to.equal(backendSigner.address);
      expect(await tournament.entryFee()).to.equal(ENTRY_FEE);
      expect(await tournament.currentTournamentId()).to.equal(1n);
    });
  });

  describe("Tournament Entry", function () {
    it("should allow a player to enter by paying the fee", async function () {
      await expect(tournament.connect(player).enterTournament({ value: ENTRY_FEE }))
        .to.emit(tournament, "PlayerEntered")
        .withArgs(1, player.address, ENTRY_FEE);

      expect(await tournament.isRegistered(1, player.address)).to.be.true;
    });

    it("should fail if fee is incorrect", async function () {
      await expect(tournament.connect(player).enterTournament({ value: ethers.parseEther("0.05") }))
        .to.be.revertedWith("Incorrect entry fee");
    });

    it("should fail if player is already registered", async function () {
      await tournament.connect(player).enterTournament({ value: ENTRY_FEE });
      await expect(tournament.connect(player).enterTournament({ value: ENTRY_FEE }))
        .to.be.revertedWith("Already registered");
    });
  });

  describe("Prize Claiming", function () {
    const prizeAmount = ethers.parseEther("0.5");

    beforeEach(async function () {
      // Setup: register player and fund the contract
      await tournament.connect(player).enterTournament({ value: ENTRY_FEE });
      // Send some extra AVAX to contract for prizes
      await owner.sendTransaction({
        to: await tournament.getAddress(),
        value: ethers.parseEther("5")
      });
    });

    it("should allow claiming a prize with a valid signature", async function () {
      const tournamentId = 1;
      const signature = await signPrizeClaim(
        backendSigner,
        await tournament.getAddress(),
        tournamentId,
        player.address,
        prizeAmount
      );

      const initialBalance = await ethers.provider.getBalance(player.address);

      const tx = await tournament.connect(player).claimPrize(tournamentId, prizeAmount, signature);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      expect(await tournament.hasClaimed(tournamentId, player.address)).to.be.true;
      
      const finalBalance = await ethers.provider.getBalance(player.address);
      expect(finalBalance).to.equal(initialBalance + prizeAmount - gasUsed);
    });

    it("should fail if signature is invalid (wrong signer)", async function () {
      const signature = await signPrizeClaim(
        otherSigner,
        await tournament.getAddress(),
        1,
        player.address,
        prizeAmount
      );

      await expect(
        tournament.connect(player).claimPrize(1, prizeAmount, signature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("should fail if player tries to claim twice", async function () {
      const signature = await signPrizeClaim(
        backendSigner,
        await tournament.getAddress(),
        1,
        player.address,
        prizeAmount
      );

      await tournament.connect(player).claimPrize(1, prizeAmount, signature);
      
      await expect(
        tournament.connect(player).claimPrize(1, prizeAmount, signature)
      ).to.be.revertedWith("Prize already claimed");
    });

    it("should fail if player is not registered for the tournament", async function () {
        // Use tournament ID 2 for which player isn't registered
        const signature = await signPrizeClaim(
            backendSigner,
            await tournament.getAddress(),
            2,
            player.address,
            prizeAmount
        );

        await expect(
            tournament.connect(player).claimPrize(2, prizeAmount, signature)
        ).to.be.revertedWith("Not a participant");
    });
  });

  describe("Admin Functions", function () {
    it("should allow owner to advance tournament ID", async function () {
      await tournament.nextTournament();
      expect(await tournament.currentTournamentId()).to.equal(2n);
    });

    it("should allow owner to change entry fee", async function () {
      const newFee = ethers.parseEther("0.2");
      await tournament.setEntryFee(newFee);
      expect(await tournament.entryFee()).to.equal(newFee);
    });

    it("should allow owner to withdraw funds", async function () {
        const withdrawAmount = ethers.parseEther("0.05");
        await tournament.connect(player).enterTournament({ value: ENTRY_FEE });
        
        const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
        const tx = await tournament.withdraw(withdrawAmount);
        const receipt = await tx.wait();
        const gas = receipt!.gasUsed * receipt!.gasPrice;

        expect(await ethers.provider.getBalance(owner.address)).to.equal(initialOwnerBalance + withdrawAmount - gas);
    });
  });
});

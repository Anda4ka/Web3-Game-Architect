import { expect } from "chai";
import { ethers } from "hardhat";
import { FrostToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FrostToken", function () {
  let frostToken: FrostToken;
  let owner: SignerWithAddress;
  let player: SignerWithAddress;
  let backendSigner: SignerWithAddress;
  let otherSigner: SignerWithAddress;

  // Helper: create a valid backend signature for claimReward
  async function signClaimReward(
    signer: SignerWithAddress,
    playerAddress: string,
    amount: bigint,
    runId: number
  ): Promise<string> {
    const network = await ethers.provider.getNetwork();
    const contractAddress = await frostToken.getAddress();
    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "address", "address", "uint256", "uint256"],
      [network.chainId, contractAddress, playerAddress, amount, runId]
    );
    return signer.signMessage(ethers.getBytes(messageHash));
  }

  beforeEach(async function () {
    [owner, player, backendSigner, otherSigner] = await ethers.getSigners();

    const FrostTokenFactory = await ethers.getContractFactory("FrostToken");
    frostToken = await FrostTokenFactory.deploy(backendSigner.address);
    await frostToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy with correct backendSigner", async function () {
      expect(await frostToken.backendSigner()).to.equal(backendSigner.address);
    });

    it("should have correct name and symbol", async function () {
      expect(await frostToken.name()).to.equal("Frost Token");
      expect(await frostToken.symbol()).to.equal("FROST");
    });

    it("should have zero initial supply", async function () {
      expect(await frostToken.totalSupply()).to.equal(0n);
    });
  });

  describe("claimReward", function () {
    it("should mint tokens with valid signature", async function () {
      const amount = ethers.parseEther("100");
      const runId = 1;
      const signature = await signClaimReward(backendSigner, player.address, amount, runId);

      await expect(frostToken.connect(player).claimReward(amount, runId, signature))
        .to.emit(frostToken, "RewardClaimed")
        .withArgs(player.address, amount, runId);

      expect(await frostToken.balanceOf(player.address)).to.equal(amount);
    });

    it("should revert with wrong signer", async function () {
      const amount = ethers.parseEther("100");
      const runId = 2;
      // Sign with otherSigner instead of backendSigner
      const signature = await signClaimReward(otherSigner, player.address, amount, runId);

      await expect(
        frostToken.connect(player).claimReward(amount, runId, signature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("should revert on replay attack (same runId)", async function () {
      const amount = ethers.parseEther("50");
      const runId = 3;
      const signature = await signClaimReward(backendSigner, player.address, amount, runId);

      // First claim succeeds
      await frostToken.connect(player).claimReward(amount, runId, signature);

      // Second claim with same runId should fail
      await expect(
        frostToken.connect(player).claimReward(amount, runId, signature)
      ).to.be.revertedWith("Already claimed");
    });

    it("should revert when amount exceeds max per run", async function () {
      const amount = ethers.parseEther("1001"); // MAX_CLAIM_PER_RUN = 1000
      const runId = 4;
      const signature = await signClaimReward(backendSigner, player.address, amount, runId);

      await expect(
        frostToken.connect(player).claimReward(amount, runId, signature)
      ).to.be.revertedWith("Exceeds max claim per run");
    });

    it("should revert when amount is zero", async function () {
      const amount = 0n;
      const runId = 5;
      const signature = await signClaimReward(backendSigner, player.address, amount, runId);

      await expect(
        frostToken.connect(player).claimReward(amount, runId, signature)
      ).to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("burnForUpgrade", function () {
    it("should burn tokens from caller balance", async function () {
      // First mint some tokens
      const mintAmount = ethers.parseEther("500");
      const runId = 10;
      const signature = await signClaimReward(backendSigner, player.address, mintAmount, runId);
      await frostToken.connect(player).claimReward(mintAmount, runId, signature);

      // Burn half
      const burnAmount = ethers.parseEther("200");
      await expect(frostToken.connect(player).burnForUpgrade(burnAmount))
        .to.emit(frostToken, "BurnedForUpgrade")
        .withArgs(player.address, burnAmount);

      expect(await frostToken.balanceOf(player.address)).to.equal(
        mintAmount - burnAmount
      );
    });

    it("should revert when burning zero", async function () {
      await expect(
        frostToken.connect(player).burnForUpgrade(0)
      ).to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("setBackendSigner", function () {
    it("should allow owner to change signer", async function () {
      await expect(frostToken.connect(owner).setBackendSigner(otherSigner.address))
        .to.emit(frostToken, "BackendSignerUpdated")
        .withArgs(backendSigner.address, otherSigner.address);

      expect(await frostToken.backendSigner()).to.equal(otherSigner.address);
    });

    it("should revert when non-owner tries to change signer", async function () {
      await expect(
        frostToken.connect(player).setBackendSigner(otherSigner.address)
      ).to.be.revertedWithCustomError(frostToken, "OwnableUnauthorizedAccount");
    });

    it("should revert when setting zero address", async function () {
      await expect(
        frostToken.connect(owner).setBackendSigner(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid signer address");
    });
  });
});

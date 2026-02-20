import { expect } from "chai";
import { ethers } from "hardhat";
import { FrostToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FrostToken (New Architecture)", function () {
  let frostToken: FrostToken;
  let owner: SignerWithAddress;
  let player: SignerWithAddress;
  let treasury: SignerWithAddress;

  const TOTAL_SUPPLY = ethers.parseEther("1000000000");

  beforeEach(async function () {
    [owner, player, treasury] = await ethers.getSigners();

    const FrostTokenFactory = await ethers.getContractFactory("FrostToken");
    // Deploying as owner (treasury)
    frostToken = await FrostTokenFactory.connect(owner).deploy();
    await frostToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should mint total supply to owner on deploy", async function () {
      expect(await frostToken.totalSupply()).to.equal(TOTAL_SUPPLY);
      expect(await frostToken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
    });

    it("should have correct name and symbol", async function () {
      expect(await frostToken.name()).to.equal("Frost Token");
      expect(await frostToken.symbol()).to.equal("FROST");
    });

    it("should NOT have a mint function (check ABI)", async function () {
        // @ts-ignore
        expect(frostToken.mint).to.be.undefined;
        // @ts-ignore
        expect(frostToken.claimReward).to.be.undefined;
    });
  });

  describe("Burning", function () {
    it("should allow users to burn their tokens", async function () {
      const burnAmount = ethers.parseEther("1000");
      
      // First transfer some tokens to player
      await frostToken.transfer(player.address, burnAmount);
      expect(await frostToken.balanceOf(player.address)).to.equal(burnAmount);

      // Burn
      await expect(frostToken.connect(player).burn(burnAmount))
        .to.emit(frostToken, "Transfer") // ERC20 emits Transfer to zero address on burn
        .withArgs(player.address, ethers.ZeroAddress, burnAmount);

      expect(await frostToken.balanceOf(player.address)).to.equal(0n);
      expect(await frostToken.totalSupply()).to.equal(TOTAL_SUPPLY - burnAmount);
    });

    it("should fail to burn more than balance", async function () {
        const amount = ethers.parseEther("1");
        await expect(frostToken.connect(player).burn(amount))
            .to.be.revertedWithCustomError(frostToken, "ERC20InsufficientBalance");
    });
  });
});

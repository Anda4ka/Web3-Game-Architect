import { expect } from "chai";
import { ethers } from "hardhat";
import { SeasonBadge } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SeasonBadge", function () {
  let seasonBadge: SeasonBadge;
  let owner: SignerWithAddress;
  let player: SignerWithAddress;
  let backendSigner: SignerWithAddress;
  let otherSigner: SignerWithAddress;

  // Helper: create a valid backend signature for mintBadge
  async function signMintBadge(
    signer: SignerWithAddress,
    playerAddress: string,
    seasonId: number
  ): Promise<string> {
    const network = await ethers.provider.getNetwork();
    const contractAddress = await seasonBadge.getAddress();
    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "address", "address", "uint256"],
      [network.chainId, contractAddress, playerAddress, seasonId]
    );
    return signer.signMessage(ethers.getBytes(messageHash));
  }

  beforeEach(async function () {
    [owner, player, backendSigner, otherSigner] = await ethers.getSigners();

    const SeasonBadgeFactory = await ethers.getContractFactory("SeasonBadge");
    seasonBadge = await SeasonBadgeFactory.deploy(backendSigner.address);
    await seasonBadge.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy with correct backendSigner", async function () {
      expect(await seasonBadge.backendSigner()).to.equal(backendSigner.address);
    });

    it("should have correct name and symbol", async function () {
      expect(await seasonBadge.name()).to.equal("Frost Rush Season Badge");
      expect(await seasonBadge.symbol()).to.equal("FRBADGE");
    });
  });

  describe("mintBadge", function () {
    it("should mint NFT with valid signature", async function () {
      const seasonId = 1;
      const signature = await signMintBadge(backendSigner, player.address, seasonId);

      await expect(seasonBadge.connect(player).mintBadge(seasonId, signature))
        .to.emit(seasonBadge, "BadgeMinted")
        .withArgs(player.address, seasonId, 1); // tokenId = 1

      // Player should own 1 NFT
      expect(await seasonBadge.balanceOf(player.address)).to.equal(1n);

      // Token 1 should be owned by player
      expect(await seasonBadge.ownerOf(1)).to.equal(player.address);
    });

    it("should revert with wrong signer", async function () {
      const seasonId = 2;
      // Sign with otherSigner instead of backendSigner
      const signature = await signMintBadge(otherSigner, player.address, seasonId);

      await expect(
        seasonBadge.connect(player).mintBadge(seasonId, signature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("should revert on double mint for same season", async function () {
      const seasonId = 3;
      const signature = await signMintBadge(backendSigner, player.address, seasonId);

      // First mint succeeds
      await seasonBadge.connect(player).mintBadge(seasonId, signature);

      // Second mint for same season should fail
      await expect(
        seasonBadge.connect(player).mintBadge(seasonId, signature)
      ).to.be.revertedWith("Already minted for this season");
    });

    it("should allow minting for different seasons", async function () {
      const sig1 = await signMintBadge(backendSigner, player.address, 1);
      const sig2 = await signMintBadge(backendSigner, player.address, 2);

      await seasonBadge.connect(player).mintBadge(1, sig1);
      await seasonBadge.connect(player).mintBadge(2, sig2);

      expect(await seasonBadge.balanceOf(player.address)).to.equal(2n);
    });
  });

  describe("hasMinted", function () {
    it("should return false before minting", async function () {
      expect(await seasonBadge.hasMinted(player.address, 1)).to.equal(false);
    });

    it("should return true after minting", async function () {
      const seasonId = 1;
      const signature = await signMintBadge(backendSigner, player.address, seasonId);
      await seasonBadge.connect(player).mintBadge(seasonId, signature);

      expect(await seasonBadge.hasMinted(player.address, seasonId)).to.equal(true);
    });
  });

  describe("setSeasonURI", function () {
    it("should allow owner to set season URI", async function () {
      const uri = "ipfs://QmTestHash123/season1.json";
      await expect(seasonBadge.connect(owner).setSeasonURI(1, uri))
        .to.emit(seasonBadge, "SeasonURIUpdated")
        .withArgs(1, uri);

      expect(await seasonBadge.seasonURI(1)).to.equal(uri);
    });

    it("should revert when non-owner tries to set URI", async function () {
      await expect(
        seasonBadge.connect(player).setSeasonURI(1, "ipfs://fake")
      ).to.be.revertedWithCustomError(seasonBadge, "OwnableUnauthorizedAccount");
    });

    it("should return season URI from tokenURI after mint", async function () {
      const uri = "ipfs://QmTestHash123/season1.json";
      await seasonBadge.connect(owner).setSeasonURI(1, uri);

      const signature = await signMintBadge(backendSigner, player.address, 1);
      await seasonBadge.connect(player).mintBadge(1, signature);

      expect(await seasonBadge.tokenURI(1)).to.equal(uri);
    });
  });

  describe("setBackendSigner", function () {
    it("should allow owner to change signer", async function () {
      await expect(seasonBadge.connect(owner).setBackendSigner(otherSigner.address))
        .to.emit(seasonBadge, "BackendSignerUpdated")
        .withArgs(backendSigner.address, otherSigner.address);

      expect(await seasonBadge.backendSigner()).to.equal(otherSigner.address);
    });

    it("should revert when non-owner tries to change signer", async function () {
      await expect(
        seasonBadge.connect(player).setBackendSigner(otherSigner.address)
      ).to.be.revertedWithCustomError(seasonBadge, "OwnableUnauthorizedAccount");
    });
  });
});

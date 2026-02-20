import { ethers } from "ethers";

/**
 * Service for generating ECDSA signatures for Frost Rush smart contracts.
 */
class SigningService {
  private wallet: ethers.Wallet;

  constructor() {
    // Ensure PRIVATE_KEY is set in the environment variables
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Missing PRIVATE_KEY environment variable. Backend Signer cannot be initialized.");
    }

    // Initialize the wallet using the private key
    this.wallet = new ethers.Wallet(privateKey);
  }

  /**
   * Generates an ECDSA signature for claiming a prize in the FrostDailyTournament contract.
   * 
   * The signature must match the Solidity code:
   * keccak256(abi.encodePacked(
   *     uint256 block.chainid,
   *     address address(this),
   *     uint256 tournamentId,
   *     address msg.sender,
   *     uint256 prizeAmount
   * ))
   * 
   * @param playerAddress Address of the player claiming the prize (`msg.sender` in Solidity).
   * @param tournamentId ID of the tournament.
   * @param prizeAmount Amount of prize to claim in Wei as a string.
   * @param contractAddress Address of the tournament contract.
   * @param chainId Chain ID of the network.
   * @returns The generated ECDSA signature as a hex string.
   */
  public async signPrizeClaim(
    playerAddress: string,
    tournamentId: number | string,
    prizeAmount: string,
    contractAddress: string,
    chainId: number
  ): Promise<string> {
    // Define the types and values exactly as expected by abi.encodePacked in Solidity
    const types = ["uint256", "address", "uint256", "address", "uint256"];
    const values = [chainId, contractAddress, tournamentId, playerAddress, prizeAmount];

    // Hash the parameters using keccak256 and encodePacked
    const messageHash = ethers.solidityPackedKeccak256(types, values);

    // Compute the Ethereum Signed Message Hash and sign it
    // The wallet.signMessage automatically prefixes the hash with "\x19Ethereum Signed Message:\n32"
    // But since we are passing a bytes-like hex string (messageHash), ethers v6 handles it correctly
    const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));

    return signature;
  }

  /**
   * Returns the public address of the backend signer.
   */
  public getSignerAddress(): string {
    return this.wallet.address;
  }
}

// Export a singleton instance of the service
export const signingService = new SigningService();

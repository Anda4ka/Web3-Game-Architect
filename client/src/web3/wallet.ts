import { BrowserProvider, JsonRpcSigner } from 'ethers';

export class WalletManager {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;
  private address: string | null = null;
  private listeners: ((address: string | null) => void)[] = [];

  constructor() {
    if (window.ethereum) {
      this.provider = new BrowserProvider(window.ethereum);
      
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          this.address = accounts[0];
        } else {
          this.address = null;
          this.signer = null;
        }
        this.notifyListeners();
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }

  public async connect(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask or Core wallet not found');
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.address = accounts[0];
      this.signer = await this.provider!.getSigner();
      this.notifyListeners();
      return this.address!;
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return !!this.address;
  }

  public getAddress(): string | null {
    return this.address;
  }

  public getSigner(): JsonRpcSigner | null {
    return this.signer;
  }

  public onConnect(callback: (address: string) => void) {
    this.onWalletChanged((addr) => {
      if (addr) callback(addr);
    });
  }

  public onDisconnect(callback: () => void) {
    this.onWalletChanged((addr) => {
      if (!addr) callback();
    });
  }

  public truncateAddress(address?: string): string {
    const addr = address || this.address;
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.address));
  }

  public async switchToAvalanche(): Promise<void> {
    await this.switchChain(
      '0xa86a', // 43114
      'Avalanche C-Chain',
      ['https://api.avax.network/ext/bc/C/rpc'],
      'AVAX',
      'https://snowtrace.io'
    );
  }

  public async switchToFuji(): Promise<void> {
    await this.switchChain(
      '0xa869', // 43113
      'Avalanche Fuji Testnet',
      ['https://api.avax-test.network/ext/bc/C/rpc'],
      'AVAX',
      'https://testnet.snowtrace.io'
    );
  }

  private async switchChain(
    chainId: string,
    chainName: string,
    rpcUrls: string[],
    symbol: string,
    explorer: string
  ): Promise<void> {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId,
              chainName,
              nativeCurrency: { name: symbol, symbol, decimals: 18 },
              rpcUrls,
              blockExplorerUrls: [explorer],
            },
          ],
        });
      } else {
        throw error;
      }
    }
  }
}

export const walletManager = new WalletManager();

declare global {
  interface Window {
    ethereum: any;
  }
}

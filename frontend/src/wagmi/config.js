import { http, createConfig, fallback } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

// Get your WalletConnect Project ID from https://cloud.walletconnect.com/
const projectId = "b56e18d47c72ab683b10814fe9495694";

// Enhanced RPC configuration for BSC Testnet reliability
export const config = createConfig({
  chains: [bscTestnet],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId,
      metadata: {
        name: "STIM Prediction Platform",
        description: "Decentralized prediction and staking platform",
        url: "https://stimapp.com",
        icons: ["https://stimapp.com/icon.png"],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [bscTestnet.id]: fallback([
      // Primary: Official BSC Testnet RPC
      http("https://data-seed-prebsc-1-s1.bnbchain.org:8545", {
        timeout: 12_000,
        retryCount: 3,
        retryDelay: ({ count }) => ~~(1 << count) * 400,
      }),
      
      // Secondary: Alternative BSC Testnet RPC
      http("https://data-seed-prebsc-2-s1.bnbchain.org:8545", {
        timeout: 12_000,
        retryCount: 2,
        retryDelay: ({ count }) => ~~(1 << count) * 400,
      }),
      
      // Tertiary: Another BSC Testnet endpoint
      http("https://bsc-testnet.publicnode.com", {
        timeout: 15_000,
        retryCount: 2,
        retryDelay: ({ count }) => ~~(1 << count) * 500,
      }),
      
      // Quaternary: Backup public RPC
      http("https://bsc-testnet-rpc.publicnode.com", {
        timeout: 15_000,
        retryCount: 2,
        retryDelay: ({ count }) => ~~(1 << count) * 500,
      }),
    ], {
      rank: {
        interval: 60_000, // Re-rank every minute
        sampleCount: 10,   // Use 10 samples for ranking
        timeout: 5_000,    // 5 second timeout for ranking
      },
      retryCount: 2,
      retryDelay: ({ count }) => ~~(1 << count) * 200,
    }),
  },
  // Optimized configuration for better performance
  ssr: false,
  syncConnectedChain: true,
  
  // Enhanced batching configuration for mainnet
  batch: {
    multicall: {
      batchSize: 32,        // Smaller batches for better reliability
      wait: 50,             // 50ms wait time for batching
    },
  },
  
  // Polling configuration for real-time updates
  pollingInterval: 15_000,    // Poll every 15 seconds instead of default 4 seconds
  
  // Cache configuration
  cacheTime: 30_000,          // 30 second cache time
});

export const SUPPORTED_CHAIN_ID = bscTestnet.id; // 97
export const SUPPORTED_CHAIN = bscTestnet;

// Network validation helper
export const isValidNetwork = (chainId) => {
  return chainId === bscTestnet.id;
};

// Get network name helper
export const getNetworkName = (chainId) => {
  return chainId === bscTestnet.id ? "BSC Testnet" : "Unsupported Network";
};

// Enhanced error handling helper
export const handleRpcError = (error) => {
  const errorMessage = error?.message?.toLowerCase() || "";
  
  if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
    return "Rate limited. Please wait a moment and try again.";
  }
  
  if (errorMessage.includes("timeout") || errorMessage.includes("network")) {
    return "Network timeout. Please check your connection.";
  }
  
  if (errorMessage.includes("invalid") || errorMessage.includes("revert")) {
    return "Invalid contract call. Please check the contract address.";
  }
  
  return "Network error. Please try again.";
};

// RPC health check utility
export const checkRpcHealth = async () => {
  const healthChecks = [
    "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    "https://data-seed-prebsc-2-s1.bnbchain.org:8545",
    "https://bsc-testnet.publicnode.com",
  ];

  const results = await Promise.allSettled(
    healthChecks.map(async (url) => {
      const start = Date.now();
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1
          }),
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        return {
          url,
          latency: Date.now() - start,
          status: 'healthy',
          blockNumber: data.result
        };
      } catch (error) {
        return {
          url,
          latency: Date.now() - start,
          status: 'unhealthy',
          error: error.message
        };
      }
    })
  );

  return results.map((result, index) => ({
    url: healthChecks[index],
    ...result.value
  }));
};
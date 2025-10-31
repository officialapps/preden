import { http, createConfig, fallback } from "wagmi";
import { base } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

// Get your WalletConnect Project ID from https://cloud.walletconnect.com/
const projectId = "b56e18d47c72ab683b10814fe9495694";

// Enhanced RPC configuration for Base mainnet reliability
export const config = createConfig({
  chains: [base],
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
    [base.id]: fallback([
      // Primary: Use your premium RPC if available (Alchemy/Infura)
      ...(import.meta.env.VITE_ALCHEMY_API_KEY 
        ? [http(`https://base-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`, {
            timeout: 8_000,
            retryCount: 2,
            retryDelay: ({ count }) => ~~(1 << count) * 200, // Exponential backoff: 200ms, 400ms, 800ms
          })]
        : []
      ),
      
      // Secondary: Infura if available
      ...(import.meta.env.VITE_INFURA_API_KEY 
        ? [http(`https://base-mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`, {
            timeout: 10_000,
            retryCount: 2,
            retryDelay: ({ count }) => ~~(1 << count) * 300,
          })]
        : []
      ),
      
      // Tertiary: Official Base.org (most reliable for Base-specific operations)
      http("https://mainnet.base.org", {
        timeout: 12_000,
        retryCount: 3,
        retryDelay: ({ count }) => ~~(1 << count) * 400,
      }),
      
      // Quaternary: Backup public RPCs
      http("https://base.llamarpc.com", {
        timeout: 15_000,
        retryCount: 2,
        retryDelay: ({ count }) => ~~(1 << count) * 500,
      }),
      
      // Last resort: Another public endpoint
      http("https://base.blockpi.network/v1/rpc/public", {
        timeout: 20_000,
        retryCount: 1,
        retryDelay: 1000,
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

export const SUPPORTED_CHAIN_ID = base.id; // 8453
export const SUPPORTED_CHAIN = base;

// Network validation helper
export const isValidNetwork = (chainId) => {
  return chainId === base.id;
};

// Get network name helper
export const getNetworkName = (chainId) => {
  return chainId === base.id ? "Base Mainnet" : "Unsupported Network";
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
    "https://mainnet.base.org",
    ...(import.meta.env.VITE_ALCHEMY_API_KEY 
      ? [`https://base-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`]
      : []
    ),
    ...(import.meta.env.VITE_INFURA_API_KEY 
      ? [`https://base-mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`]
      : []
    ),
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
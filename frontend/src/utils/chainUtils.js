/**
 * Chain utilities for BSC Testnet only
 * Simplified for single-chain support
 */

// BSC Testnet chain ID
export const BASE_MAINNET_CHAIN_ID = 97;

/**
 * Map chainId to chain name
 * @param {number} chainId - The blockchain network ID
 * @returns {string} - The human-readable chain name
 */
export const getChainName = (chainId) => {
  return chainId === BASE_MAINNET_CHAIN_ID ? "BSC Testnet" : "Unsupported Network";
};

/**
 * Check if a chainId is supported by the application
 * @param {number} chainId - The blockchain network ID
 * @returns {boolean} - Whether the chain is supported (only Base Testnet)
 */
export const isChainSupported = (chainId) => {
  return chainId === BASE_MAINNET_CHAIN_ID;
};

/**
 * Get chain explorer URL
 * @param {number} chainId - The blockchain network ID
 * @returns {string} - The block explorer URL
 */
export const getExplorerUrl = (chainId) => {
  return chainId === BASE_MAINNET_CHAIN_ID ? "https://testnet.bscscan.com" : "";
};

/**
 * Format transaction hash with explorer link
 * @param {string} txHash - Transaction hash
 * @param {number} chainId - The blockchain network ID (should be Base Testnet)
 * @returns {string} - Formatted transaction explorer URL
 */
export const getTransactionUrl = (txHash, chainId) => {
  const baseUrl = getExplorerUrl(chainId);
  return baseUrl ? `${baseUrl}/tx/${txHash}` : "";
};

/**
 * Format address with explorer link
 * @param {string} address - Wallet/contract address
 * @param {number} chainId - The blockchain network ID (should be Base Testnet)
 * @returns {string} - Formatted address explorer URL
 */
export const getAddressUrl = (address, chainId) => {
  const baseUrl = getExplorerUrl(chainId);
  return baseUrl ? `${baseUrl}/address/${address}` : "";
};

/**
 * Get native currency symbol (BNB for BSC Testnet)
 * @param {number} chainId - The blockchain network ID
 * @returns {string} - The native currency symbol
 */
export const getNativeCurrencySymbol = (chainId) => {
  return chainId === BASE_MAINNET_CHAIN_ID ? "tBNB" : "tBNB";
};

/**
 * Get RPC URL for BSC Testnet
 * @param {number} chainId - The blockchain network ID
 * @returns {string} - The RPC URL
 */
export const getRpcUrl = (chainId) => {
  if (chainId === BASE_MAINNET_CHAIN_ID) {
    // Use environment variable if available, otherwise fallback to public RPC
    return import.meta.env.VITE_ALCHEMY_API_KEY 
      ? `https://bnb-testnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`
      : "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
  }
  return "";
};

/**
 * Validate if the current network is BSC Testnet
 * @param {number} chainId - The blockchain network ID
 * @returns {boolean} - True if BSC Testnet, false otherwise
 */
export const isBaseMainnet = (chainId) => {
  return chainId === BASE_MAINNET_CHAIN_ID;
};

/**
 * Get network status message
 * @param {number} chainId - The blockchain network ID
 * @returns {string} - Status message for the network
 */
export const getNetworkStatus = (chainId) => {
  if (chainId === BASE_MAINNET_CHAIN_ID) {
    return "Connected to BSC Testnet ✅";
  }
  return `Unsupported network (Chain ID: ${chainId}). Please switch to BSC Testnet.`;
};

/**
 * Get network configuration object
 * @returns {object} - BSC Testnet configuration
 */
export const getNetworkConfig = () => {
  return {
    chainId: BASE_MAINNET_CHAIN_ID,
    name: "BSC Testnet",
    symbol: "tBNB",
    decimals: 18,
    explorer: "https://testnet.bscscan.com",
    rpc: getRpcUrl(BASE_MAINNET_CHAIN_ID),
    isSupported: true
  };
};

// Export constants for easy access
export const NETWORK_CONFIG = {
  CHAIN_ID: BASE_MAINNET_CHAIN_ID,
  NAME: "BSC Testnet",
  SYMBOL: "tBNB",
  DECIMALS: 18,
  EXPLORER: "https://testnet.bscscan.com",
  RPC_URL: getRpcUrl(BASE_MAINNET_CHAIN_ID)
};

// Default export with all utilities
export default {
  BASE_MAINNET_CHAIN_ID,
  getChainName,
  isChainSupported,
  getExplorerUrl,
  getTransactionUrl,
  getAddressUrl,
  getNativeCurrencySymbol,
  getRpcUrl,
  isBaseMainnet,
  getNetworkStatus,
  getNetworkConfig,
  NETWORK_CONFIG
};
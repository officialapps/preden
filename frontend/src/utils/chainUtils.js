/**
 * Chain utilities for Base Mainnet only
 * Simplified for single-chain support
 */

// Base Mainnet chain ID
export const BASE_MAINNET_CHAIN_ID = 8453;

/**
 * Map chainId to chain name
 * @param {number} chainId - The blockchain network ID
 * @returns {string} - The human-readable chain name
 */
export const getChainName = (chainId) => {
  return chainId === BASE_MAINNET_CHAIN_ID ? "Base Mainnet" : "Unsupported Network";
};

/**
 * Check if a chainId is supported by the application
 * @param {number} chainId - The blockchain network ID
 * @returns {boolean} - Whether the chain is supported (only Base Mainnet)
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
  return chainId === BASE_MAINNET_CHAIN_ID ? "https://basescan.org" : "";
};

/**
 * Format transaction hash with explorer link
 * @param {string} txHash - Transaction hash
 * @param {number} chainId - The blockchain network ID (should be Base Mainnet)
 * @returns {string} - Formatted transaction explorer URL
 */
export const getTransactionUrl = (txHash, chainId) => {
  const baseUrl = getExplorerUrl(chainId);
  return baseUrl ? `${baseUrl}/tx/${txHash}` : "";
};

/**
 * Format address with explorer link
 * @param {string} address - Wallet/contract address
 * @param {number} chainId - The blockchain network ID (should be Base Mainnet)
 * @returns {string} - Formatted address explorer URL
 */
export const getAddressUrl = (address, chainId) => {
  const baseUrl = getExplorerUrl(chainId);
  return baseUrl ? `${baseUrl}/address/${address}` : "";
};

/**
 * Get native currency symbol (ETH for Base Mainnet)
 * @param {number} chainId - The blockchain network ID
 * @returns {string} - The native currency symbol
 */
export const getNativeCurrencySymbol = (chainId) => {
  return chainId === BASE_MAINNET_CHAIN_ID ? "ETH" : "ETH";
};

/**
 * Get RPC URL for Base Mainnet
 * @param {number} chainId - The blockchain network ID
 * @returns {string} - The RPC URL
 */
export const getRpcUrl = (chainId) => {
  if (chainId === BASE_MAINNET_CHAIN_ID) {
    // Use environment variable if available, otherwise fallback to public RPC
    return import.meta.env.VITE_ALCHEMY_API_KEY 
      ? `https://base-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`
      : "https://mainnet.base.org";
  }
  return "";
};

/**
 * Validate if the current network is Base Mainnet
 * @param {number} chainId - The blockchain network ID
 * @returns {boolean} - True if Base Mainnet, false otherwise
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
    return "Connected to Base Mainnet ✅";
  }
  return `Unsupported network (Chain ID: ${chainId}). Please switch to Base Mainnet.`;
};

/**
 * Get network configuration object
 * @returns {object} - Base Mainnet configuration
 */
export const getNetworkConfig = () => {
  return {
    chainId: BASE_MAINNET_CHAIN_ID,
    name: "Base Mainnet",
    symbol: "ETH",
    decimals: 18,
    explorer: "https://basescan.org",
    rpc: getRpcUrl(BASE_MAINNET_CHAIN_ID),
    isSupported: true
  };
};

// Export constants for easy access
export const NETWORK_CONFIG = {
  CHAIN_ID: BASE_MAINNET_CHAIN_ID,
  NAME: "Base Mainnet",
  SYMBOL: "ETH",
  DECIMALS: 18,
  EXPLORER: "https://basescan.org",
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
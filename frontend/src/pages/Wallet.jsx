import React, { useState, useEffect, useRef } from "react";
import { formatUnits, isAddress } from 'viem';
import Box from "../assets/images/svgs/Box.svg";
import Flames from "../assets/images/svgs/flames.svg";
import STIMIcon from "../assets/images/svgs/stim-coin.svg";
import USDT from "../assets/images/svgs/USDT.svg";
import USDC from "../assets/images/svgs/USDC.svg";
import { useAccount, useDisconnect, useBalance, useChainId, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "react-toastify";
import { base } from "wagmi/chains";

// MAINNET ADDRESSES ONLY - Base mainnet
const STIM_TOKEN_ADDRESS = "0x035d2026d6ab320150F9B0456D426D5CDdF8423F";
const USDC_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Token configurations for Base mainnet only
const NETWORK_TOKENS = {
  [base.id]: [
    { symbol: "USDC", address: USDC_TOKEN_ADDRESS, decimals: 6 },
    { symbol: "STIM", address: STIM_TOKEN_ADDRESS, decimals: 18 }
  ]
};

const Wallet = ({ setWalletBalance }) => {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  
  // Track previous connection state to detect new connections
  const prevConnected = useRef(isConnected);
  const prevAddress = useRef(address);
  const hasShownConnectedToast = useRef(false);
  const lastRefreshTime = useRef(0);
  const hasTriedAutoSwitch = useRef(false);
  
  const [tokenBalances, setTokenBalances] = useState({
    USDC: '0.0000',
    STIM: '0.0000'
  });

  // Use multiple useBalance hooks for different tokens - MAINNET ADDRESSES ONLY
  const { 
    data: stimBalanceData, 
    isLoading: isLoadingStim, 
    error: stimError,
    refetch: refetchStim 
  } = useBalance({
    address: address,
    token: STIM_TOKEN_ADDRESS,
    enabled: isConnected && !!address,
    refetchInterval: 30000,
  });

  const { 
    data: usdcBalanceData, 
    isLoading: isLoadingUsdc, 
    error: usdcError,
    refetch: refetchUsdc 
  } = useBalance({
    address: address,
    token: USDC_TOKEN_ADDRESS,
    enabled: isConnected && !!address,
    refetchInterval: 30000,
  });

  // Check if any balance is loading
  const isLoadingBalance = isLoadingStim || isLoadingUsdc;
  const hasBalanceError = stimError || usdcError;

  // Auto-switch to Base mainnet when connected to any other network
  useEffect(() => {
    if (isConnected && chainId && !hasTriedAutoSwitch.current) {
      if (chainId !== base.id) {
        console.log("🔄 Auto-switching to Base mainnet from network:", chainId);
        hasTriedAutoSwitch.current = true;
        
        switchChain?.({ chainId: base.id })
          .then(() => {
            console.log("✅ Successfully switched to Base mainnet");
            toast.success("Switched to Base mainnet");
          })
          .catch((error) => {
            console.error("❌ Failed to switch to Base mainnet:", error);
            toast.error("Please manually switch to Base mainnet for full functionality");
          })
          .finally(() => {
            // Reset the flag after a delay to allow future auto-switches
            setTimeout(() => {
              hasTriedAutoSwitch.current = false;
            }, 10000);
          });
      }
    }
  }, [isConnected, chainId, switchChain]);

  // Reset auto-switch flag when disconnected
  useEffect(() => {
    if (!isConnected) {
      hasTriedAutoSwitch.current = false;
    }
  }, [isConnected]);

  // Force balance refresh utility
  const forceBalanceRefresh = () => {
    const now = Date.now();
    if (now - lastRefreshTime.current < 2000) {
      console.log("⏸️ Skipping refresh - too frequent");
      return;
    }
    
    lastRefreshTime.current = now;
    console.log("🔄 Wallet: Force balance refresh triggered");
    
    if (isConnected) {
      refetchStim?.();
      refetchUsdc?.();
    }
  };

  // Update STIM balance when data changes
  useEffect(() => {
    if (stimBalanceData && isConnected) {
      try {
        const formattedBalance = parseFloat(stimBalanceData.formatted).toFixed(4);
        
        setTokenBalances(prev => ({
          ...prev,
          STIM: formattedBalance
        }));
        
        // Update parent component with the STIM balance
        setWalletBalance?.(formattedBalance);
        
        console.log("💰 Wallet: STIM Balance updated:", formattedBalance);
      } catch (error) {
        console.error("❌ Wallet: Error formatting STIM balance:", error);
        setTokenBalances(prev => ({
          ...prev,
          STIM: "Error"
        }));
      }
    }
  }, [stimBalanceData, setWalletBalance, isConnected]);

  // Update USDC balance when data changes
  useEffect(() => {
    if (usdcBalanceData && isConnected) {
      try {
        const formattedBalance = parseFloat(usdcBalanceData.formatted).toFixed(4);
        
        setTokenBalances(prev => ({
          ...prev,
          USDC: formattedBalance
        }));
        
        console.log("💰 Wallet: USDC Balance updated:", formattedBalance);
      } catch (error) {
        console.error("❌ Wallet: Error formatting USDC balance:", error);
        setTokenBalances(prev => ({
          ...prev,
          USDC: "Error"
        }));
      }
    }
  }, [usdcBalanceData, isConnected]);

  // Reset balances when disconnected
  useEffect(() => {
    if (!isConnected) {
      const resetBalance = "0.0000";
      setTokenBalances({
        USDC: resetBalance,
        STIM: resetBalance
      });
      setWalletBalance?.(resetBalance);
    }
  }, [isConnected, setWalletBalance]);

  // Listen for balance refresh events from other components
  useEffect(() => {
    const handleForceRefresh = () => {
      console.log("🔄 Wallet: Received force refresh event");
      forceBalanceRefresh();
    };

    const handleStakeSuccess = () => {
      console.log("🎉 Wallet: Stake success event received");
      setTimeout(() => {
        forceBalanceRefresh();
        toast.info("Refreshing wallet balance...");
      }, 3000);
    };

    // Listen for multiple refresh events
    window.addEventListener('refreshWalletBalance', handleForceRefresh);
    window.addEventListener('refreshBalance', handleForceRefresh);
    window.addEventListener('forceBalanceRefetch', handleForceRefresh);
    window.addEventListener('stakeSuccess', handleStakeSuccess);
    
    // Check for pending refresh flag
    const checkRefreshFlag = () => {
      if (localStorage.getItem('balanceNeedsRefresh') === 'true') {
        console.log("🔄 Wallet: Found refresh flag, refreshing...");
        localStorage.removeItem('balanceNeedsRefresh');
        setTimeout(forceBalanceRefresh, 1000);
      }
    };
    
    checkRefreshFlag();
    
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        checkRefreshFlag();
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkRefreshFlag();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('refreshWalletBalance', handleForceRefresh);
      window.removeEventListener('refreshBalance', handleForceRefresh);
      window.removeEventListener('forceBalanceRefetch', handleForceRefresh);
      window.removeEventListener('stakeSuccess', handleStakeSuccess);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected]);

  // Only show toast for NEW connections
  useEffect(() => {
    const isNewConnection = !prevConnected.current && isConnected && address;
    const isWalletChanged = prevConnected.current && isConnected && 
                           prevAddress.current && address && 
                           prevAddress.current !== address;

    if ((isNewConnection || isWalletChanged) && !hasShownConnectedToast.current) {
      console.log("🔗 Wallet: New wallet connection detected:", { isNewConnection, isWalletChanged, address });
      toast.success("Wallet connected successfully!");
      hasShownConnectedToast.current = true;
      
      setTimeout(() => {
        console.log("🔄 Wallet: Refreshing balance after new connection");
        forceBalanceRefresh();
      }, 2000);
    }

    prevConnected.current = isConnected;
    prevAddress.current = address;

    if (!isConnected) {
      hasShownConnectedToast.current = false;
    }
  }, [isConnected, address]);

  // Handle errors
  useEffect(() => {
    if (hasBalanceError) {
      console.error("❌ Wallet: Balance fetch errors:", { stimError, usdcError });
      
      // Update specific token balances to show error
      if (stimError) {
        setTokenBalances(prev => ({ ...prev, STIM: "Error" }));
      }
      if (usdcError) {
        setTokenBalances(prev => ({ ...prev, USDC: "Error" }));
      }
    }
  }, [stimError, usdcError, hasBalanceError]);

  // Handle network changes
  useEffect(() => {
    if (isConnected && chainId) {
      console.log("🌐 Wallet: Network changed to:", getNetworkName(), "Chain ID:", chainId);
      
      setTimeout(() => {
        forceBalanceRefresh();
      }, 1000);
    }
  }, [chainId, isConnected]);

  const formatAddress = (addr) => {
    if (!addr || !isAddress(addr)) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setTokenBalances({
        USDC: '0.0000',
        STIM: '0.0000'
      });
      setWalletBalance?.('0.0000');
      
      hasShownConnectedToast.current = false;
      hasTriedAutoSwitch.current = false;
      
      toast.success("Wallet disconnected successfully");
    } catch (error) {
      console.error("❌ Wallet: Disconnect error:", error);
      toast.error("Failed to disconnect wallet");
    }
  };

  // Enhanced network name function
  const getNetworkName = () => {
    switch (chainId) {
      case base.id:
        return "Base Mainnet";
      default:
        return "Unsupported Network";
    }
  };

  // Check if current network is supported (Base mainnet only)
  const isSupportedNetwork = () => {
    return chainId === base.id;
  };

  // Check if we should show network warning
  const shouldShowNetworkWarning = () => {
    return isConnected && chainId && !isSupportedNetwork();
  };

  // Handle manual network switch
  const handleSwitchToMainnet = async () => {
    try {
      await switchChain({ chainId: base.id });
      toast.success("Switched to Base mainnet");
    } catch (error) {
      console.error("❌ Failed to switch network:", error);
      toast.error("Failed to switch network. Please try manually.");
    }
  };

  const isLoading = isConnecting || isReconnecting || isLoadingBalance;

  return (
    <div className="px-3">
      <div className="fixed bottom-0 left-0 w-[100%] h-[700px] md:w-[100%] md:h-[90%] z-0">
        <img
          src={Flames}
          alt="background"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex justify-center mb-4 mt-10">
          <div className="relative">
            <div className="absolute inset-0 bg-[#18DDF7]/30 rounded-full blur-lg"></div>
            <img src={Box} alt="box icon" className="relative w-12 h-12 lg:w-16 lg:h-16" />
          </div>
        </div>
        
        <h1 className="text-white text-xl lg:text-3xl text-center font-semibold mb-2 lg:mb-4">
          {isConnected ? 'Your Crypto Wallet' : 'Connect Your Crypto Wallet'}
        </h1>
        
        <p className="text-white text-sm lg:text-base mx-5 text-center mb-4 lg:mb-8 max-w-2xl mx-auto">
          Connect Your EVM Compatible Crypto Wallet to Deposit & Withdraw STIM and USDC on Base mainnet.
        </p>

        {/* Enhanced glowing wallet card with desktop optimization */}
        <div className="relative mx-auto max-w-md lg:max-w-4xl">
          {/* Glowing border effect */}
          <div 
            className="absolute inset-0 rounded-2xl lg:rounded-3xl p-[2px] bg-gradient-to-r from-[#18DDF7] via-[#195281] to-transparent opacity-70 blur-sm"
            style={{
              background: "linear-gradient(90deg, #18DDF7 0%, #195281 50%, rgba(25, 82, 129, 0.3) 70%, transparent 100%)",
            }}
          ></div>
          
          {/* Main border gradient */}
          <div 
            className="relative p-[2px] rounded-2xl lg:rounded-3xl"
            style={{
              background: "linear-gradient(90deg, #18DDF7 0%, #195281 40%, #09113B 70%, rgba(9, 17, 59, 0.5) 100%)",
            }}
          >
            <div className="bg-[#01052D] rounded-2xl lg:rounded-3xl px-6 py-4 lg:px-8 lg:py-6 relative">
              {/* Inner glow effect */}
              <div className="absolute inset-0 rounded-2xl lg:rounded-3xl bg-gradient-to-r from-[#18DDF7]/5 via-transparent to-transparent pointer-events-none"></div>
              
              <h3 className="text-white text-lg lg:text-xl font-medium mb-3 lg:mb-4 text-center relative z-10">
                {isConnected ? 'Connected Wallet' : 'Connect Wallet'}
              </h3>
              
              <div className="flex flex-col items-center gap-2 lg:gap-3 mb-3 lg:mb-4 relative z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#18DDF7]/20 rounded-full blur-md"></div>
                  <img src={Box} alt="wallet icon" className="relative w-10 h-10 lg:w-12 lg:h-12" />
                </div>
                
                {isLoading && (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 lg:h-5 lg:w-5 border-2 border-cyan-400 border-t-transparent"></div>
                    <p className="text-white text-sm lg:text-base">Loading wallet data...</p>
                  </div>
                )}
                
                {isConnected && address && (
                  <>
                    <p className="text-white font-medium text-sm lg:text-lg">
                      {formatAddress(address)}
                    </p>
                    
                    {/* Enhanced network indicator with glow */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#18DDF7]/20 rounded-full blur-md"></div>
                      <div className="relative flex items-center gap-2 px-3 py-1 lg:px-4 lg:py-1.5 bg-[#18DDF7]/10 border border-[#18DDF7]/50 rounded-full backdrop-blur-sm">
                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${
                          chainId === base.id 
                            ? 'bg-green-400 shadow-green-400/50' 
                            : 'bg-red-400 shadow-red-400/50'
                        }`}></div>
                        <span className={`text-xs lg:text-sm font-medium ${
                          chainId === base.id 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {getNetworkName()}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {isConnected && address && isSupportedNetwork() && (
                  <div className="w-full space-y-2 lg:space-y-3 mt-2 relative z-10 max-w-lg lg:max-w-xl">
                    {/* Enhanced STIM balance card with glowing effect */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#18DDF7]/20 via-[#18DDF7]/10 to-transparent rounded-full lg:rounded-lg blur-sm opacity-50 group-hover:opacity-70 transition-opacity"></div>
                      <div className="relative flex items-center justify-between px-4 py-2 lg:px-5 lg:py-3 rounded-full lg:rounded-lg bg-[#18DDF7]/10 border border-[#18DDF7]/30 backdrop-blur-sm hover:border-[#18DDF7]/50 transition-all duration-300">
                        <div className="flex items-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-[#18DDF7]/30 rounded-full blur-sm"></div>
                            <img src={STIMIcon} alt="STIM" className="relative w-5 h-5 lg:w-6 lg:h-6 mr-2" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#18DDF7] text-sm lg:text-base font-medium">
                              STIM
                            </span>
                            <span className="text-gray-400 text-xs">
                              STIM Token
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#18DDF7] text-sm lg:text-lg font-bold">
                            {isLoadingStim ? (
                              <div className="animate-spin rounded-full h-4 w-4 lg:h-5 lg:w-5 border-2 border-cyan-400 border-t-transparent"></div>
                            ) : (
                              tokenBalances.STIM
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced USDC card with real balance */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#18DDF7]/15 via-[#18DDF7]/5 to-transparent rounded-full lg:rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition-opacity"></div>
                      <div className="relative flex items-center justify-between px-4 py-2 lg:px-5 lg:py-3 rounded-full lg:rounded-lg bg-[#18DDF7]/5 border border-[#18DDF7]/20 backdrop-blur-sm hover:border-[#18DDF7]/30 transition-all duration-300">
                        <div className="flex items-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-sm"></div>
                            <img src={USDC} alt="USDC" className="relative w-5 h-5 lg:w-6 lg:h-6 mr-2" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#18DDF7] text-sm lg:text-base font-medium">
                              USDC
                            </span>
                            <span className="text-gray-400 text-xs">
                              USD Coin
                            </span>
                          </div>
                        </div>
                        <span className="text-[#18DDF7] text-sm lg:text-lg font-bold">
                          {isLoadingUsdc ? (
                            <div className="animate-spin rounded-full h-4 w-4 lg:h-5 lg:w-5 border-2 border-cyan-400 border-t-transparent"></div>
                          ) : (
                            tokenBalances.USDC
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced error states */}
              {hasBalanceError && isConnected && isSupportedNetwork() && (
                <div className="w-full p-3 lg:p-4 bg-red-900/20 border border-red-600/30 rounded-lg backdrop-blur-sm mt-4 relative z-10">
                  <p className="text-red-300 text-xs lg:text-sm text-center">
                    Failed to load some token balances. Network connection issue detected.
                  </p>
                  <button
                    onClick={() => {
                      console.log("🔄 Wallet: Retry button clicked");
                      forceBalanceRefresh();
                      toast.info("Retrying balance fetch...");
                    }}
                    className="text-red-200 underline text-xs lg:text-sm mt-1 block mx-auto hover:text-red-100 transition-colors"
                  >
                    Retry Now
                  </button>
                </div>
              )}

              {/* Enhanced loading indicator */}
              {isLoadingBalance && isConnected && isSupportedNetwork() && (
                <div className="w-full p-2 lg:p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg backdrop-blur-sm mt-4 relative z-10">
                  <p className="text-blue-300 text-xs lg:text-sm text-center flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 lg:h-5 lg:w-5 border-2 border-blue-400 border-t-transparent"></div>
                    Updating balances...
                  </p>
                </div>
              )}

              {/* Network warning for unsupported networks */}
              {shouldShowNetworkWarning() && (
                <div className="w-full p-3 lg:p-4 bg-red-900/20 border border-red-600/30 rounded-lg backdrop-blur-sm mt-4 relative z-10">
                  <p className="text-red-300 text-xs lg:text-sm text-center mb-2">
                    ⚠️ Unsupported network detected. This app only works on Base mainnet.
                  </p>
                  <button
                    onClick={handleSwitchToMainnet}
                    className="bg-[#18DDF7] hover:bg-[#18DDF7]/80 text-black font-medium py-2 px-6 rounded-lg text-xs lg:text-sm mx-auto block transition-colors"
                  >
                    Switch to Base Mainnet
                  </button>
                </div>
              )}

              <div className="flex justify-center mt-3 lg:mt-4 relative z-10">
                {isConnected ? (
                  <div className="flex justify-center w-full">
                    {/* Enhanced disconnect button */}
                    <button
                      onClick={handleDisconnect}
                      disabled={isLoading}
                      className="relative group bg-red-600/80 hover:bg-red-600 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-bold py-2 lg:py-2.5 px-8 lg:px-12 rounded-lg transition-all duration-300 backdrop-blur-sm border border-red-500/30 hover:border-red-400/50"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <span className="relative text-sm lg:text-base">
                        {isLoading ? 'Disconnecting...' : 'Disconnect Wallet'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex justify-center">
                    <div className="relative transform transition-transform hover:scale-105">
                      <div className="absolute inset-0 bg-[#18DDF7]/20 rounded-lg blur-md"></div>
                      <ConnectButton 
                        chainStatus="icon"
                        accountStatus="address"
                        label="Connect Wallet"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
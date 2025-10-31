"use client"

import { useState, Suspense, lazy, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { FormattedMessage } from 'react-intl'
import { useLocale } from '../App' // Import the locale context
import Logo from "../assets/images/pngs/logo.png"
import Coin from "../assets/images/pngs/stim-coin.png"
import USDT from "../assets/images/svgs/USDT.svg"
import USDC from "../assets/images/svgs/USDC.svg"

// Import wagmi hooks
import { useAccount, useBalance } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"

// Import the updated blockies utility
import { generateBlockiesAvatar, getCurrentAvatar } from "../utils/blockiesAvatar";

// Profile Avatar Component
const ProfileAvatar = ({ address, className = "" }) => {
  const [profileData, setProfileData] = useState(null);
  const [avatarSrc, setAvatarSrc] = useState(null);

  // Load profile data to get custom avatar
  useEffect(() => {
    if (!address) {
      setAvatarSrc(null);
      return;
    }

    const profileKey = `stim_profile_${address}`;
    const storedProfile = localStorage.getItem(profileKey);
    
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile);
        setProfileData(parsed);
        
        // Use custom avatar if available, otherwise use deterministic profile image
        if (parsed.avatar) {
          setAvatarSrc(parsed.avatar);
        } else {
          const profileImage = generateBlockiesAvatar(address.toLowerCase(), 32);
          setAvatarSrc(profileImage);
        }
      } catch (error) {
        console.error("Error loading profile avatar:", error);
        // Fallback to deterministic profile image
        const profileImage = generateBlockiesAvatar(address.toLowerCase(), 32);
        setAvatarSrc(profileImage);
      }
    } else {
      // No profile found, use deterministic profile image
      const profileImage = generateBlockiesAvatar(address.toLowerCase(), 32);
      setAvatarSrc(profileImage);
    }
  }, [address]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      if (event.detail && event.detail.address === address) {
        console.log('Header: Profile update received:', event.detail);
        if (event.detail.avatar) {
          setAvatarSrc(event.detail.avatar);
        } else {
          const profileImage = generateBlockiesAvatar(address.toLowerCase(), 32);
          setAvatarSrc(profileImage);
        }
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [address]);

  if (!avatarSrc) {
    return (
      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-600 border border-gray-600 ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-white text-xs">?</div>
      </div>
    );
  }

  return (
    <img
      src={avatarSrc}
      alt="Profile"
      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-gray-600 cursor-pointer hover:border-cyan-400 transition-colors object-cover ${className}`}
    />
  );
};

// Token addresses
const STIM_TOKEN_ADDRESS = "0x035d2026d6ab320150F9B0456D426D5CDdF8423F"
const USDC_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

const Header = ({ walletBalance, setWalletBalance }) => {
  const [telegramUser, setTelegramUser] = useState({ id: null, username: null })
  const [usdcBalance, setUsdcBalance] = useState("0.00")
  const lastRefreshTime = useRef(0)
  const navigate = useNavigate()
  
  // Get locale context for language switching
  const { locale, setLocale, supportedLanguages } = useLocale()

  // Use wagmi hooks
  const { address, isConnected } = useAccount()

  // Language options with flags
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }
  ].filter(lang => supportedLanguages.includes(lang.code))

  // Language change handler
  const handleLanguageChange = (languageCode) => {
    console.log(`🌐 Changing language to: ${languageCode}`)
    setLocale(languageCode) // This will trigger translation reload in App.jsx
  }

  useEffect(() => {
    // Get Telegram user data when component mounts
    const getTelegramUserData = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        const user = window.Telegram.WebApp.initDataUnsafe.user
        if (user && user.id) {
          setTelegramUser({
            id: user.id,
            username: user.username || `User${user.id.toString().slice(-4)}`,
          })
        } else {
          setTelegramUser({
            id: 7305600366,
            username: "default",
          })
        }
      }
    }

    getTelegramUserData()
  }, [])

  // Use wagmi's useBalance hook for STIM token
  const { 
    data: stimBalanceData, 
    isLoading: isStimLoading, 
    refetch: refetchStimBalance,
    error: stimBalanceError 
  } = useBalance({
    address: address,
    token: STIM_TOKEN_ADDRESS,
    enabled: !!address && isConnected,
    refetchInterval: 30000,
  })

  // Use wagmi's useBalance hook for USDC token
  const { 
    data: usdcBalanceData, 
    isLoading: isUsdcLoading, 
    refetch: refetchUsdcBalance,
    error: usdcBalanceError 
  } = useBalance({
    address: address,
    token: USDC_TOKEN_ADDRESS,
    enabled: !!address && isConnected,
    refetchInterval: 30000,
  })

  // Check if any balance is loading
  const isBalanceLoading = isStimLoading || isUsdcLoading

  // Force balance refresh utility
  const forceBalanceRefresh = () => {
    const now = Date.now()
    if (now - lastRefreshTime.current < 2000) {
      console.log("⏸️ Header: Skipping refresh - too frequent")
      return
    }
    
    lastRefreshTime.current = now
    console.log("🔄 Header: Force balance refresh triggered")
    
    if (isConnected) {
      refetchStimBalance?.()
      refetchUsdcBalance?.()
    }
  }

  // Navigation handlers
  const handleProfileClick = () => {
    console.log("📱 Header: Profile clicked - navigating to profile")
    navigate("/profile")
  }

  const handleWalletNavigation = () => {
    console.log("💰 Header: Token clicked - navigating to wallet")
    navigate("/wallet")
  }

  // Logo click handler - navigate to home/predict page
  const handleLogoClick = () => {
    console.log("🏠 Header: Logo clicked - navigating to home page")
    navigate("/predict")
  }

  // Manual refresh with better feedback
  const handleManualRefresh = (e) => {
    e.stopPropagation()
    
    console.log("🔄 Header: Manual refresh button clicked")
    if (isConnected) {
      forceBalanceRefresh()
      const button = e.target
      const originalText = button.textContent
      button.textContent = "⟳"
      button.style.animation = "spin 1s linear"
      
      setTimeout(() => {
        button.textContent = originalText
        button.style.animation = ""
      }, 1000)
    }
  }

  // Format balance with loading indicator
  const displayStimBalance = () => {
    if (isStimLoading) return "..."
    if (stimBalanceError) return "Error"
    return walletBalance || "0.00"
  }

  const displayUsdcBalance = () => {
    if (isUsdcLoading) return "..."
    if (usdcBalanceError) return "Error"
    return usdcBalance || "0.00"
  }

  // Update balances
  useEffect(() => {
    if (stimBalanceData && isConnected) {
      try {
        const formattedBalance = parseFloat(stimBalanceData.formatted).toFixed(2)
        setWalletBalance(formattedBalance)
      } catch (error) {
        console.error("❌ Header: Error formatting STIM balance:", error)
        setWalletBalance("0.00")
      }
    } else if (!isConnected) {
      setWalletBalance("0.00")
    }
  }, [stimBalanceData, setWalletBalance, isConnected])

  useEffect(() => {
    if (usdcBalanceData && isConnected) {
      try {
        const formattedBalance = parseFloat(usdcBalanceData.formatted).toFixed(2)
        setUsdcBalance(formattedBalance)
      } catch (error) {
        console.error("❌ Header: Error formatting USDC balance:", error)
        setUsdcBalance("Error")
      }
    } else if (!isConnected) {
      setUsdcBalance("0.00")
    }
  }, [usdcBalanceData, isConnected])

  return (
    <div className="flex items-center justify-between px-4 bg-[#0A0E2E] border-b border-gray-800">
      {/* Logo Section - Now clickable */}
      <div className="flex items-center gap-2">
        <img 
          src={Logo || "/placeholder.svg"} 
          alt="STIM Logo" 
          className="w-16 h-16 object-contain cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={handleLogoClick}
          title="Go to Home"
        />
      </div>

      {/* User Info Section */}
      <div className="flex items-center gap-4">
        {/* Profile Section - Only show when connected */}
        {isConnected ? (
          <div className="flex items-center gap-4 bg-gradient-to-r from-[#0a183d] to-[#0e2347] rounded-full px-3 py-1 sm:px-4 sm:py-2">
            {/* Profile Avatar */}
            <div onClick={handleProfileClick} className="cursor-pointer">
              <ProfileAvatar 
                address={address} 
                className="hover:border-cyan-400 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 sm:gap-1">
              <span className="text-xs sm:text-sm text-cyan-400">
                {`${address.slice(0, 4)}...${address.slice(-4)}`}
              </span>

              {/* STIM Token */}
              <div 
                className="flex items-center bg-blue-500/10 rounded-full px-1 py-0.5 sm:px-2 sm:py-1 gap-0.5 sm:gap-1 relative cursor-pointer hover:bg-blue-500/20 transition-colors group"
                onClick={(e) => {
                  e.stopPropagation()
                  handleWalletNavigation()
                }}
                title="Go to Wallet"
              >
                <img 
                  src={Coin || "/placeholder.svg"} 
                  alt="STIM" 
                  className="w-3 h-3 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" 
                />
                <span className="text-cyan-400 text-xs px-1 sm:text-sm font-semibold group-hover:text-white transition-colors">
                  {displayStimBalance()}
                </span>
                
                {isStimLoading && (
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 border border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* USDC Token */}
              <div 
                className="flex items-center bg-blue-500/10 rounded-full px-1 py-0.5 sm:px-2 sm:py-1 gap-0.5 sm:gap-1 relative cursor-pointer hover:bg-blue-500/20 transition-colors group"
                onClick={(e) => {
                  e.stopPropagation()
                  handleWalletNavigation()
                }}
                title="Go to Wallet"
              >
                <img 
                  src={USDC || "/placeholder.svg"} 
                  alt="USDC" 
                  className="w-3 h-3 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" 
                />
                <span className="text-cyan-400 text-xs px-1 sm:text-sm font-semibold group-hover:text-white transition-colors">
                  {displayUsdcBalance()}
                </span>
                
                {isUsdcLoading && (
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 border border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Manual refresh button */}
              <button
                onClick={handleManualRefresh}
                className={`ml-1 text-cyan-400 hover:text-cyan-300 text-xs opacity-70 hover:opacity-100 transition-all duration-200 ${
                  isBalanceLoading ? 'animate-spin' : 'hover:scale-110'
                }`}
                title="Refresh token balances"
                disabled={isBalanceLoading}
              >
                {isBalanceLoading ? "⟳" : "↻"}
              </button>
            </div>
          </div>
        ) : (
          /* Connect Wallet Section - Show when not connected */
          <div className="flex items-center gap-2">
            {/* Custom styled Connect Button */}
            <div className="relative group">
              {/* Glowing border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#18DDF7] via-[#195281] to-transparent opacity-50 blur-sm rounded-full group-hover:opacity-70 transition-opacity"></div>
              
              {/* Connect button wrapper with custom styling */}
              <div className="relative">
                <ConnectButton.Custom>
                  {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    authenticationStatus,
                    mounted,
                  }) => {
                    // Note: If your app doesn't use authentication, you
                    // can remove all 'authenticationStatus' checks
                    const ready = mounted && authenticationStatus !== 'loading';
                    const connected =
                      ready &&
                      account &&
                      chain &&
                      (!authenticationStatus ||
                        authenticationStatus === 'authenticated');

                    return (
                      <div
                        {...(!ready && {
                          'aria-hidden': true,
                          'style': {
                            opacity: 0,
                            pointerEvents: 'none',
                            userSelect: 'none',
                          },
                        })}
                      >
                        {(() => {
                          if (!connected) {
                            return (
                              <button
                                onClick={openConnectModal}
                                type="button"
                                className="relative bg-[#18DDF7] hover:from-[#18DDF7]/90 hover:to-[#195281]/90 text-black font-semibold py-2 px-4 sm:px-6 rounded-full transition-all duration-300 transform hover:scale-105 text-sm sm:text-base border border-[#18DDF7]/30 backdrop-blur-sm"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-[#18DDF7]/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="relative flex items-center gap-2">
                                  Connect Wallet
                                </span>
                              </button>
                            );
                          }

                          return (
                            <div style={{ display: 'flex', gap: 12 }}>
                              <button
                                onClick={openChainModal}
                                style={{ display: 'flex', alignItems: 'center' }}
                                type="button"
                              >
                                {chain.hasIcon && (
                                  <div
                                    style={{
                                      background: chain.iconBackground,
                                      width: 12,
                                      height: 12,
                                      borderRadius: 999,
                                      overflow: 'hidden',
                                      marginRight: 4,
                                    }}
                                  >
                                    {chain.iconUrl && (
                                      <img
                                        alt={chain.name ?? 'Chain icon'}
                                        src={chain.iconUrl}
                                        style={{ width: 12, height: 12 }}
                                      />
                                    )}
                                  </div>
                                )}
                                {chain.name}
                              </button>

                              <button onClick={openAccountModal} type="button">
                                {account.displayName}
                                {account.displayBalance
                                  ? ` (${account.displayBalance})`
                                  : ''}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Header
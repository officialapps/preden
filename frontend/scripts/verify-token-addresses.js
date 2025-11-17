/**
 * Script to verify token addresses on BSC Testnet
 * Run with: node scripts/verify-token-addresses.js
 */

import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

// Token addresses from .env
const USDT_ADDRESS = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';
const USDC_ADDRESS = '0x64544969ed7EBf5f083679233325356EbE738930';

// ERC20 ABI for basic token info
const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
];

// Create public client for BSC Testnet
const client = createPublicClient({
  chain: bscTestnet,
  transport: http('https://data-seed-prebsc-1-s1.bnbchain.org:8545'),
});

async function verifyToken(address, tokenName) {
  console.log(`\n🔍 Verifying ${tokenName} at ${address}...`);
  
  try {
    // Check if address has code (is a contract)
    const code = await client.getBytecode({ address });
    
    if (!code || code === '0x') {
      console.log(`❌ ${tokenName}: No contract found at this address`);
      return false;
    }
    
    console.log(`✅ ${tokenName}: Contract exists`);
    
    // Try to read token info
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        client.readContract({
          address,
          abi: ERC20_ABI,
          functionName: 'name',
        }),
        client.readContract({
          address,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
        client.readContract({
          address,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
        client.readContract({
          address,
          abi: ERC20_ABI,
          functionName: 'totalSupply',
        }),
      ]);
      
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
      console.log(`   Total Supply: ${totalSupply.toString()}`);
      console.log(`   ✅ Valid ERC20 token`);
      
      return true;
    } catch (error) {
      console.log(`   ⚠️  Contract exists but may not be a standard ERC20 token`);
      console.log(`   Error: ${error.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${tokenName}: Error - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 BSC Testnet Token Address Verification');
  console.log('==========================================');
  console.log(`Network: ${bscTestnet.name} (Chain ID: ${bscTestnet.id})`);
  console.log(`RPC: https://data-seed-prebsc-1-s1.bnbchain.org:8545`);
  
  const usdtValid = await verifyToken(USDT_ADDRESS, 'USDT');
  const usdcValid = await verifyToken(USDC_ADDRESS, 'USDC');
  
  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`USDT: ${usdtValid ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`USDC: ${usdcValid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (!usdtValid || !usdcValid) {
    console.log('\n⚠️  Some tokens are invalid!');
    console.log('\n💡 Recommended Actions:');
    console.log('1. Check https://testnet.bscscan.com for verified test tokens');
    console.log('2. Common BSC Testnet tokens:');
    console.log('   - BUSD: 0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee');
    console.log('   - Or deploy your own test ERC20 tokens');
    console.log('3. Update .env with correct addresses');
    console.log('4. Get test tokens from BSC Testnet faucet');
  } else {
    console.log('\n✅ All token addresses are valid!');
  }
}

main().catch(console.error);

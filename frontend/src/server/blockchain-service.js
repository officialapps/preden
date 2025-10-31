// server/blockchain-service.js (Updated for viem v2.31.7)
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const STAKING = "0x00a971e86D76C7a7374e42C952e31a1E6186A603"

const STIMPVP_ABI = [
  {
    type: "function",
    name: "getAllEvents",
    inputs: [],
    outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function", 
    name: "getAllCategories",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct STIMPVP.Category[]",
        components: [
          { name: "name", type: "string", internalType: "string" },
          { name: "description", type: "string", internalType: "string" },
          { name: "active", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
]

const EVENT_ABI = [
  {
    type: "function",
    name: "getEventDetails",
    inputs: [],
    outputs: [
      { name: "question", type: "string", internalType: "string" },
      { name: "description", type: "string", internalType: "string" },
      { name: "options", type: "string[]", internalType: "string[]" },
      { name: "eventType", type: "string", internalType: "string" },
      { name: "category", type: "string", internalType: "string" },
      { name: "eventImage", type: "string", internalType: "string" },
      { name: "status", type: "uint8", internalType: "enum EventContract.EventStatus" },
      { name: "endTime", type: "uint256", internalType: "uint256" },
      { name: "winningOption", type: "uint8", internalType: "uint8" },
      { name: "creator", type: "address", internalType: "address" },
      { name: "tokenAddress", type: "address", internalType: "address" },
      { name: "creatorStake", type: "uint256", internalType: "uint256" },
      { name: "totalStaked", type: "uint256", internalType: "uint256" },
      { name: "creatorFeePercentage", type: "uint256", internalType: "uint256" },
      { name: "creatorRewardClaimed", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOptionTotals", 
    inputs: [],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
]

class BlockchainService {
  constructor() {
    // Multiple RPC endpoints for better reliability
    this.rpcEndpoints = [
      "https://mainnet.base.org",
      "https://base-mainnet.public.blastapi.io",
      "https://base.blockpi.network/v1/rpc/public"
    ]
    
    this.currentEndpointIndex = 0
    this.client = this.createClient()
    
    // Connection monitoring
    this.connectionHealth = new Map()
    this.lastHealthCheck = 0
    this.healthCheckInterval = 60000 // 1 minute
  }

  createClient(endpointIndex = 0) {
    const endpoint = this.rpcEndpoints[endpointIndex] || this.rpcEndpoints[0]
    
    return createPublicClient({
      chain: base,
      transport: http(endpoint, {
        timeout: 12000,
        retryCount: 2,
        retryDelay: ({ count }) => Math.min(1000 * Math.pow(2, count), 5000),
      }),
      // Updated for viem v2 - batch configuration is simpler
      batch: {
        multicall: {
          batchSize: 25,
          wait: 50,
        },
      },
      cacheTime: 15_000,
    })
  }

  async switchEndpoint() {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length
    this.client = this.createClient(this.currentEndpointIndex)
    console.log(`Switched to RPC endpoint: ${this.rpcEndpoints[this.currentEndpointIndex]}`)
  }

  async healthCheck() {
    const now = Date.now()
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return true
    }

    try {
      await this.client.getBlockNumber()
      this.connectionHealth.set(this.currentEndpointIndex, { healthy: true, lastCheck: now })
      this.lastHealthCheck = now
      return true
    } catch (error) {
      console.warn(`Health check failed for endpoint ${this.currentEndpointIndex}:`, error.message)
      this.connectionHealth.set(this.currentEndpointIndex, { healthy: false, lastCheck: now })
      await this.switchEndpoint()
      return false
    }
  }

  async safeContractCall(contractAddress, functionName, abi = EVENT_ABI, maxRetries = 3) {
    let lastError = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.healthCheck()
        
        const result = await this.client.readContract({
          address: contractAddress,
          abi,
          functionName,
        })
        
        return { success: true, data: result }
      } catch (error) {
        lastError = error
        
        // Handle rate limiting with exponential backoff
        if (error.message?.includes('429') || 
            error.message?.includes('rate limit') ||
            error.message?.includes('too many requests')) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          console.warn(`Rate limited, waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        // Handle RPC errors by switching endpoint
        if (attempt < maxRetries - 1 && (
          error.message?.includes('fetch') || 
          error.message?.includes('network') ||
          error.message?.includes('timeout') ||
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('ETIMEDOUT')
        )) {
          console.warn(`RPC error on attempt ${attempt + 1}, switching endpoint...`)
          await this.switchEndpoint()
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        
        console.warn(`Contract call failed for ${contractAddress}.${functionName} (attempt ${attempt + 1}):`, error.message)
      }
    }
    
    return { success: false, error: lastError }
  }

  async getEventAddresses() {
    const result = await this.safeContractCall(STAKING, "getAllEvents", STIMPVP_ABI)
    return result.success ? (result.data || []) : []
  }

  async getCategories() {
    const result = await this.safeContractCall(STAKING, "getAllCategories", STIMPVP_ABI)
    
    if (!result.success || !Array.isArray(result.data)) {
      return []
    }
    
    return result.data
      .filter(cat => cat && cat.active === true)
      .map((cat, index) => ({
        id: index.toString(),
        label: cat.name || "Unknown Category",
        description: cat.description || "",
        active: Boolean(cat.active),
      }))
  }

  async getEventDetails(eventAddress) {
    try {
      // Use Promise.allSettled for better error handling
      const [eventDetailsResult, optionTotalsResult] = await Promise.allSettled([
        this.safeContractCall(eventAddress, "getEventDetails"),
        this.safeContractCall(eventAddress, "getOptionTotals")
      ])

      const eventDetails = eventDetailsResult.status === 'fulfilled' && eventDetailsResult.value.success 
        ? eventDetailsResult.value.data 
        : null

      const optionTotals = optionTotalsResult.status === 'fulfilled' && optionTotalsResult.value.success
        ? optionTotalsResult.value.data
        : [0n, 0n] // Use BigInt literals for viem v2

      if (!eventDetails) {
        return null
      }

      return {
        eventDetails,
        optionTotals: Array.isArray(optionTotals) ? optionTotals : [0n, 0n]
      }
    } catch (error) {
      console.error(`Error fetching details for event ${eventAddress}:`, error)
      return null
    }
  }

  async getAllEventsData() {
    const startTime = Date.now()
    console.log('Starting blockchain data fetch...')

    try {
      // Fetch basic data with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout fetching initial data')), 10000)
      )

      const [eventAddresses, categories] = await Promise.race([
        Promise.all([
          this.getEventAddresses(),
          this.getCategories()
        ]),
        timeoutPromise
      ])

      console.log(`Fetched ${eventAddresses.length} event addresses and ${categories.length} categories`)

      if (!eventAddresses.length) {
        return { 
          events: [], 
          categories: [{ id: "all", label: "All Categories" }, ...categories],
          fetchTime: Date.now() - startTime
        }
      }

      // Process events in optimized batches
      const batchSize = 8
      const allEvents = []
      const errors = []

      for (let i = 0; i < eventAddresses.length; i += batchSize) {
        const batch = eventAddresses.slice(i, i + batchSize)
        
        // Progressive delay between batches
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 150))
        }

        const batchPromises = batch.map(async (address) => {
          try {
            const result = await this.getEventDetails(address)
            
            if (result && result.eventDetails) {
              const details = result.eventDetails
              const optionTotals = result.optionTotals
              
              // Filter out expired events server-side
              const now = Math.floor(Date.now() / 1000)
              const endTime = Number(details[7])
              
              if (endTime > now) {
                return {
                  address,
                  question: details[0] || "Unknown Question",
                  description: details[1] || "No description available", 
                  options: {
                    A: (details[2] && details[2][0]) || "Yes",
                    B: (details[2] && details[2][1]) || "No",
                  },
                  category: {
                    id: "0",
                    label: details[4] || "Unknown",
                    description: "",
                    active: true,
                  },
                  end_time: new Date(endTime * 1000).toISOString(),
                  tokenAddress: details[10] || "0x0",
                  // Convert BigInt to Number for JSON serialization
                  yes_votes: Number(optionTotals[0] || 0n),
                  no_votes: Number(optionTotals[1] || 0n),
                  totalStaked: Number(details[12] || 0n),
                  status: Number(details[6] || 0),
                  creator: details[9] || "0x0",
                  eventType: details[3] || "binary",
                  creatorStake: Number(details[11] || 0n),
                  creatorFeePercentage: Number(details[13] || 0),
                  creatorRewardClaimed: Boolean(details[14]),
                }
              }
            }
            return null
          } catch (error) {
            errors.push({ address, error: error.message })
            return null
          }
        })

        const batchResults = await Promise.allSettled(batchPromises)
        const validEvents = batchResults
          .filter(result => result.status === 'fulfilled' && result.value !== null)
          .map(result => result.value)

        allEvents.push(...validEvents)
        
        // Log progress
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(eventAddresses.length / batchSize)}: ${validEvents.length} valid events`)
      }

      const fetchTime = Date.now() - startTime
      console.log(`Blockchain fetch completed in ${fetchTime}ms. Found ${allEvents.length} active events.`)
      
      if (errors.length > 0) {
        console.warn(`Encountered ${errors.length} errors during fetch:`, errors.slice(0, 5))
      }

      return {
        events: allEvents,
        categories: [{ id: "all", label: "All Categories" }, ...categories],
        fetchTime,
        totalAddresses: eventAddresses.length,
        successfulFetches: allEvents.length,
        errors: errors.length
      }
    } catch (error) {
      console.error('Error in getAllEventsData:', error)
      return { 
        events: [], 
        categories: [{ id: "all", label: "All Categories" }],
        fetchTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      currentEndpoint: this.rpcEndpoints[this.currentEndpointIndex],
      endpointHealth: Object.fromEntries(this.connectionHealth),
      lastHealthCheck: this.lastHealthCheck
    }
  }

  // Method to preload critical data
  async preloadData() {
    console.log('Preloading blockchain data...')
    try {
      const data = await this.getAllEventsData()
      console.log(`Preloaded ${data.events.length} events in ${data.fetchTime}ms`)
      return data
    } catch (error) {
      console.error('Failed to preload data:', error)
      return null
    }
  }
}

export default BlockchainService
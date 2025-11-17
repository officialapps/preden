// import { cookieStorage, createStorage, http } from '@wagmi/core'
// import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
// import { base, baseSepolia} from '@reown/appkit/networks'

// // Get projectId from https://cloud.reown.com
// export const projectId = "b56e18d47c72ab683b10814fe9495694"

// if (!projectId) {
//   throw new Error('Project ID is not defined')
// }

// export const networks = [base, baseSepolia]

// //Set up the Wagmi Adapter (Config)
// export const wagmiAdapter = new WagmiAdapter({
//   storage: createStorage({
//     storage: cookieStorage
//   }),
//   ssr: true,
//   networks,
//   projectId
// })

// export const config = wagmiAdapter.wagmiConfig
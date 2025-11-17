
// import { wagmiAdapter, projectId } from "../config/index";
// import { createAppKit } from "@reown/appkit/react";
// import { base } from "@reown/appkit/networks";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import React from "react";
// import { cookieToInitialState, WagmiProvider } from "wagmi";

// // Set up queryClient
// const queryClient = new QueryClient();

// if (!projectId) {
//   throw new Error("Project ID is not defined");
// }

// // Set up metadata (optional)
// const metadata = {
//   name: "appkit-example",
//   description: "AppKit Example - EVM",
//   url: "https://reown-appkit-evm.vercel.app",
//   icons: ["https://avatars.githubusercontent.com/u/179229932"],
// };

// // Create the modal
// const modal = createAppKit({
//   adapters: [wagmiAdapter],
//   chainImages: {
//     5000: "/mantle.png",
//     534352: "/scroll.png",
//     80084: "/berachain.png",
//   },
//   projectId,
//   networks: [base],
//   defaultNetwork: base,
//   metadata,
//   features: {
//     analytics: true,
//     email: true,
//     socials: ["google"],
//     emailShowWallets: true,
//   },
//   themeMode: "dark",
// });

// function ContextProvider({ children, cookies }) {
//   const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig, cookies);

//   return (
//     <WagmiProvider
//       config={wagmiAdapter.wagmiConfig}
//       initialState={initialState}
//     >
//       <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
//     </WagmiProvider>
//   );
// }

// export default ContextProvider;

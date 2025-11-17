# Preden

A decentralized player vs player gaming application built on BSC blockchain with a React frontend and Solidity smart contracts.

## Project Structure

This monorepo contains two main components:

- **`contract/`** - Solidity smart contracts built with Foundry
- **`frontend/`** - React web application built with Vite

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) - Ethereum development toolkit
- npm or pnpm package manager

## Getting Started

### Smart Contracts

Navigate to the contract directory:

```bash
cd contract
```

**Build contracts:**
```bash
forge build
```

**Run tests:**
```bash
forge test
```

**Deploy contracts:**
```bash
forge script script/Preden.s.sol --rpc-url <your_rpc_url> --private-key <your_private_key>
```

**Format code:**
```bash
forge fmt
```

### Frontend Application

Navigate to the frontend directory:

```bash
cd frontend
```

**Install dependencies:**
```bash
npm install
# or
pnpm install
```

**Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

**Run development server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

## Technology Stack

### Smart Contracts
- Solidity
- Foundry (Forge, Cast, Anvil)
- OpenZeppelin Contracts

### Frontend
- React 18
- Vite
- TailwindCSS
- Web3 Integration:
  - Wagmi
  - Viem
  - RainbowKit
  - ConnectKit
  - Thirdweb
- React Router
- i18next (Internationalization)
- React Query
- PWA Support

## Features

- Player vs Player gaming mechanics
- Blockchain-based transactions
- Multi-wallet support
- Progressive Web App (PWA)
- Internationalization support
- Responsive design

## Development

### Contract Development

The contract uses Foundry for development and testing. Key directories:
- `src/` - Smart contract source files
- `test/` - Contract tests
- `script/` - Deployment scripts
- `lib/` - External dependencies

### Frontend Development

The frontend is a modern React application with:
- Hot Module Replacement (HMR)
- ESLint for code quality
- Tailwind CSS for styling
- PWA capabilities for mobile experience

## License

MIT

````markdown
# Web3 Document Notary dApp

A decentralized document notarization application that creates a tamper-evident fingerprint of a document using **SHA-256** and records the proof on an Ethereum-compatible blockchain.

The application allows a user to:

1. Select a document.
2. Calculate its SHA-256 hash locally in the browser.
3. Optionally upload the document to IPFS.
4. Connect a Web3 wallet such as MetaMask.
5. Store the document fingerprint and metadata on-chain.
6. Verify a document later by calculating its hash again and checking the blockchain.
7. View the notarization owner, timestamp, description, transaction and optional IPFS copy.

The project supports both a **local Hardhat blockchain** and **Ethereum Sepolia testnet**.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Application Flow](#application-flow)
- [How Document Notarization Works](#how-document-notarization-works)
- [How Verification Works](#how-verification-works)
- [Smart Contract](#smart-contract)
- [Smart Contract Functions](#smart-contract-functions)
- [Frontend](#frontend)
- [IPFS Integration](#ipfs-integration)
- [APIs and External Services](#apis-and-external-services)
- [Environment Variables](#environment-variables)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Project Locally](#running-the-project-locally)
- [Using Sepolia Testnet](#using-sepolia-testnet)
- [Deploying the Smart Contract](#deploying-the-smart-contract)
- [Building the Frontend](#building-the-frontend)
- [Project Structure](#project-structure)
- [End-to-End Example](#end-to-end-example)
- [Problems Faced and Solutions](#problems-faced-and-solutions)
- [Important Requirements](#important-requirements)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)
- [Future Improvements](#future-improvements)
- [Conclusion](#conclusion)

---

# Project Overview

## What is a Document Notary dApp?

A document notary application provides proof that a particular document existed at a particular point in time.

Traditional notarization generally requires a trusted third party. This project demonstrates how blockchain technology can be used to create a verifiable digital proof without storing the entire document on the blockchain.

Instead of storing the document itself, the application calculates a unique **SHA-256 hash**.

For example:

```text
Document
   |
   v
SHA-256
   |
   v
0x7f3c...a91d
````

The resulting hash acts as the document's digital fingerprint.

The blockchain stores the fingerprint together with:

* Document owner
* Blockchain timestamp
* Description
* IPFS CID, if available

Therefore, the original document does not need to be stored directly on-chain.

---

# Problem Statement

Digital documents can be modified after they are created.

For example:

```text
Original document
       |
       | modification
       v
Modified document
```

It can be difficult to prove:

* Which version was the original?
* When did the document exist?
* Who registered it?
* Whether the document was changed after registration?

A centralized database can also introduce a dependency on the organization operating that database.

The objective of this project is to create a blockchain-based mechanism that allows a user to generate and verify a tamper-evident document fingerprint.

---

# Solution

The application uses the following approach:

```text
                DOCUMENT
                    |
                    v
             SHA-256 HASH
                    |
             +------+------+
             |             |
             v             v
        Blockchain       IPFS
        fingerprint     optional copy
             |
             v
       Verification
```

Only the document fingerprint and metadata are recorded on-chain.

The actual document can optionally be stored on IPFS.

---

# Key Features

## 1. SHA-256 Document Fingerprinting

The document is hashed locally in the browser.

The application displays:

```text
SHA-256 · calculated locally
```

The hash is a 64-character hexadecimal value represented with the `0x` prefix when used as a blockchain `bytes32` value.

---

## 2. Blockchain Notarization

The document hash can be registered through the `Notary` smart contract.

The transaction records:

```text
Document Hash
Owner
Timestamp
Description
IPFS CID
```

---

## 3. Duplicate Protection

The smart contract prevents the same document hash from being notarized more than once.

This prevents accidental duplicate notarization of the same fingerprint.

---

## 4. Document Verification

A user can:

* Upload the original document again, or
* Enter its SHA-256 hash manually.

The application calculates/checks the hash and queries the smart contract.

---

## 5. Owner Information

The notarization record contains the Ethereum address that registered the document.

---

## 6. Blockchain Timestamp

The smart contract records the timestamp associated with the notarization.

---

## 7. Optional IPFS Storage

The project can upload the document to IPFS and store the resulting CID with the blockchain record.

The application can then provide an IPFS link such as:

```text
https://gateway.pinata.cloud/ipfs/<CID>
```

IPFS storage is optional. The blockchain hash remains the core proof.

---

## 8. Local Hardhat Network

The project can be tested locally using Hardhat.

The local chain uses:

```text
Chain ID: 31337
```

---

## 9. Ethereum Sepolia

The application also supports:

```text
Chain ID: 11155111
```

which is the Ethereum Sepolia test network.

---

# Technology Stack

| Technology   | Purpose                                               |
| ------------ | ----------------------------------------------------- |
| React        | Frontend UI                                           |
| TypeScript   | Frontend programming language                         |
| Vite         | Frontend development/build tool                       |
| ethers.js    | Ethereum/Web3 interaction                             |
| Solidity     | Smart contract                                        |
| Hardhat      | Contract compilation and local blockchain development |
| Ethereum     | Blockchain                                            |
| Sepolia      | Public Ethereum testnet                               |
| MetaMask     | Web3 wallet                                           |
| SHA-256      | Document fingerprinting                               |
| IPFS         | Optional decentralized document storage               |
| Pinata       | IPFS pinning service                                  |
| Tailwind CSS | UI styling                                            |
| Lucide React | Icons                                                 |
| Wouter       | Frontend routing                                      |

---

# Architecture

The application consists of four major layers.

```text
+---------------------------------------------------+
|                  USER / BROWSER                   |
+---------------------------------------------------+
                       |
                       v
+---------------------------------------------------+
|                REACT FRONTEND                    |
|                                                   |
|  Document Upload                                  |
|  SHA-256 Hashing                                  |
|  Verification                                     |
|  Wallet Connection                                |
+---------------------------------------------------+
             |                         |
             |                         |
             v                         v
+-----------------------+     +--------------------+
|      IPFS / Pinata    |     | Ethereum / Hardhat |
|                       |     |                    |
| Optional document     |     | Notary Contract    |
| storage               |     |                    |
+-----------------------+     +--------------------+
                                      |
                                      v
                              Blockchain Record
```

---

# Application Flow

## Notarization Flow

```text
User
 |
 | Select document
 v
Frontend
 |
 | Calculate SHA-256
 v
Document Hash
 |
 +------------------------+
 |                        |
 | Optional               |
 v                        v
IPFS Upload          Connect MetaMask
 |                        |
 | CID                    |
 +-----------+------------+
             |
             v
      Notary Contract
             |
             |
             v
      Blockchain Record
             |
             v
       Transaction Hash
```

---

# How Document Notarization Works

Suppose the user has:

```text
certificate.pdf
```

The browser calculates:

```text
SHA-256(certificate.pdf)
```

Result:

```text
0xABC123........................................789
```

The hash is sent to the smart contract:

```solidity
notarize(
    docHash,
    description,
    ipfsCID
)
```

The contract records the document information.

Conceptually:

```text
Document Hash
      |
      v
+---------------------------+
| Notary Smart Contract     |
+---------------------------+
| owner                     |
| timestamp                 |
| description               |
| ipfsCID                   |
+---------------------------+
```

---

# How Verification Works

Verification does not require uploading the document to the blockchain.

Suppose the user has:

```text
certificate.pdf
```

again.

The browser calculates:

```text
SHA-256(certificate.pdf)
```

If the document has not changed:

```text
Original hash
      =
New hash
```

The application queries:

```solidity
verify(docHash)
```

and retrieves the notarization record using:

```solidity
getNotarization(docHash)
```

The record contains:

```text
Owner
Timestamp
Description
IPFS CID
```

---

## If the document was modified

Even a small modification changes the SHA-256 hash.

For example:

```text
Original:
0xABC123...

Modified:
0x9827FA...
```

Because the hashes differ, the modified document will not match the original blockchain fingerprint.

---

# Smart Contract

The main contract is:

```text
contracts/Notary.sol
```

The generated Hardhat artifact is:

```text
artifacts/contracts/Notary.sol/Notary.json
```

The artifact contains the ABI used by the frontend.

---

# Document Structure

The contract uses a document record containing:

```text
owner
timestamp
description
ipfsCID
```

Conceptually:

```solidity
struct Document {
    address owner;
    uint256 timestamp;
    string description;
    string ipfsCID;
}
```

The document hash is used as the lookup key.

Conceptually:

```text
docHash
   |
   v
Document Record
   |
   +-- owner
   +-- timestamp
   +-- description
   +-- ipfsCID
```

---

# Smart Contract Functions

## `notarize()`

Registers a document hash.

```solidity
notarize(
    bytes32 docHash,
    string description,
    string ipfsCID
)
```

Parameters:

| Parameter     | Type      | Description                  |
| ------------- | --------- | ---------------------------- |
| `docHash`     | `bytes32` | SHA-256 document fingerprint |
| `description` | `string`  | Description of the document  |
| `ipfsCID`     | `string`  | Optional IPFS CID            |

---

## `verify()`

Checks whether a hash has been notarized.

```solidity
verify(bytes32 docHash)
```

Returns:

```text
true
```

if the document exists in the contract.

Otherwise:

```text
false
```

---

## `getNotarization()`

Retrieves the complete notarization record.

```solidity
getNotarization(bytes32 docHash)
```

The Solidity function returns a `Document` struct containing:

```text
owner
timestamp
description
ipfsCID
```

### Important frontend ABI requirement

Because `getNotarization()` returns a Solidity struct, its ABI must represent the return value as a tuple.

The frontend uses the equivalent tuple representation:

```text
function getNotarization(bytes32 docHash)
view returns (
    (address owner,
     uint256 timestamp,
     string description,
     string ipfsCID)
)
```

This was important during development because an ABI mismatch caused the frontend to fail when reading the notarization record.

---

# Frontend

The primary frontend file is:

```text
src/App.tsx
```

The frontend handles:

* Document selection
* SHA-256 hashing
* Wallet connection
* Network checking
* Contract interaction
* Notarization
* Verification
* IPFS integration
* Transaction information
* Error handling

---

# Wallet Integration

The application uses the browser Ethereum provider:

```text
window.ethereum
```

A wallet such as MetaMask provides this provider.

The frontend uses ethers.js to create a provider:

```text
BrowserProvider
```

and interact with the smart contract.

---

# Supported Networks

The application currently recognizes:

```text
31337    Hardhat Local
11155111 Sepolia
```

## Hardhat Local

```text
Chain ID: 31337
```

Used during local development.

## Sepolia

```text
Chain ID: 11155111
```

Used for public testnet deployment.

---

# IPFS Integration

IPFS stands for:

```text
InterPlanetary File System
```

It provides content-addressed storage.

Instead of identifying a file using a conventional filename, IPFS identifies content using a CID.

Example:

```text
File
 |
 v
IPFS
 |
 v
CID
 |
 v
Qm...
```

The CID can then be stored in the smart contract.

---

## Pinata

This project can use Pinata as the IPFS pinning service.

The frontend can display:

```text
Open IPFS copy
```

which points to:

```text
https://gateway.pinata.cloud/ipfs/<CID>
```

### Where to get Pinata credentials

Create an account on Pinata:

```text
https://pinata.cloud/
```

Then create an API key/JWT from the Pinata dashboard.

Do not commit the Pinata secret to GitHub.

---

# APIs and External Services

## 1. MetaMask / Ethereum Provider API

### Purpose

Used for:

* Connecting the user's wallet
* Reading the connected account
* Detecting the blockchain network
* Asking the user to sign blockchain transactions

### Where to get it

Install MetaMask:

```text
https://metamask.io/
```

No API key is required.

The browser exposes:

```text
window.ethereum
```

---

# 2. Ethereum Sepolia

### Purpose

Public blockchain used for testing the deployed smart contract.

Network:

```text
Sepolia
```

Chain ID:

```text
11155111
```

### Requirement

The wallet needs Sepolia ETH for transaction gas.

Sepolia ETH can be obtained from a Sepolia faucet.

Do not use real ETH for testing this application.

---

# 3. Hardhat

### Purpose

Hardhat is used for:

* Solidity compilation
* Local blockchain
* Contract deployment
* Contract testing
* Development

Hardhat local network:

```text
Chain ID: 31337
```

No external API key is required for the local network.

---

# 4. ethers.js

### Purpose

ethers.js connects the React frontend to Ethereum.

The application uses it for:

```text
BrowserProvider
Contract
Transactions
Contract calls
```

No API key is required when communicating through MetaMask.

---

# 5. Pinata

### Purpose

Optional IPFS file upload and pinning.

Required only if the IPFS functionality is enabled.

Credentials should be stored in environment variables and never committed.

---

# 6. Etherscan

Etherscan can be used to inspect public Sepolia transactions and deployed contracts.

Sepolia explorer:

```text
https://sepolia.etherscan.io/
```

An Etherscan API key may be useful for automated verification or explorer-related tooling, but it is not required for normal wallet-based contract interaction.

---

# Environment Variables

Create a `.env` file based on:

```text
.env.example
```

A typical configuration contains values similar to:

```env
VITE_NOTARY_CONTRACT_ADDRESS_LOCAL=0xYourLocalContractAddress

VITE_NOTARY_CONTRACT_ADDRESS_SEPOLIA=0xYourSepoliaContractAddress

VITE_EXPECTED_CHAIN_ID=11155111
```

If IPFS credentials are required by the application/server integration, configure them through environment variables rather than hard-coding them.

Example:

```env
PINATA_JWT=your_pinata_jwt
```

Use the actual variable names expected by the implementation.

---

# Important `.env` Rule

Never commit:

```text
Private keys
Wallet seed phrases
Pinata secrets
API secrets
RPC secrets
```

to GitHub.

Use:

```text
.env
```

and add it to:

```text
.gitignore
```

Keep:

```text
.env.example
```

in the repository with placeholder values.

---

# Prerequisites

Before running the project, install:

## Node.js

Use a current supported Node.js version compatible with the project's dependencies.

Check:

```bash
node --version
```

---

## pnpm

Check:

```bash
pnpm --version
```

If pnpm is not installed, enable Corepack:

```bash
corepack enable
```

Then:

```bash
corepack prepare pnpm@latest --activate
```

---

## MetaMask

Install the MetaMask browser extension:

```text
https://metamask.io/
```

---

# Installation

Clone the project:

```bash
git clone <YOUR_REPOSITORY_URL>
```

Enter the project:

```bash
cd document-notary
```

Install dependencies:

```bash
pnpm install
```

---

# Running the Project Locally

## Step 1: Start Hardhat

Start the local blockchain:

```bash
npx hardhat node
```

The local network uses:

```text
Chain ID: 31337
```

Keep this terminal running.

---

# Step 2: Deploy the Contract

Deploy the `Notary` contract to the local Hardhat network.

Use the project's deployment script:

```bash
node scripts/deploy.cjs
```

If the deployment script requires Hardhat explicitly:

```bash
npx hardhat run scripts/deploy.cjs --network localhost
```

After deployment, copy the resulting contract address.

Example:

```text
Notary deployed to:
0x1234567890123456789012345678901234567890
```

---

# Step 3: Configure the Contract Address

Set the local contract address in `.env`:

```env
VITE_NOTARY_CONTRACT_ADDRESS_LOCAL=0x1234567890123456789012345678901234567890
```

---

# Step 4: Configure MetaMask

Add the local Hardhat network to MetaMask.

Typical configuration:

```text
Network Name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH
```

Import one of the development accounts generated by Hardhat if necessary.

### Warning

Hardhat development private keys are for local testing only.

Never use a Hardhat private key with real funds.

---

# Step 5: Start the Frontend

Run:

```bash
pnpm dev
```

The Vite development server should provide a local URL similar to:

```text
http://localhost:3000
```

Open the URL in the browser.

---

# Running the Application

The normal workflow is:

```text
Start Hardhat
     |
     v
Deploy Notary
     |
     v
Configure contract address
     |
     v
Start frontend
     |
     v
Open browser
     |
     v
Connect MetaMask
     |
     v
Notarize / Verify
```

---

# Using Sepolia Testnet

To use Sepolia instead of the local network:

1. Deploy the contract to Sepolia.
2. Copy the deployed contract address.
3. Put the address in the environment configuration.
4. Connect MetaMask to Sepolia.
5. Obtain Sepolia ETH.
6. Start the frontend.
7. Select/notarize a document.

The application recognizes:

```text
11155111
```

as the Sepolia chain ID.

---

# Deploying the Smart Contract to Sepolia

You need:

* A wallet/private key for deployment
* Sepolia ETH
* An RPC endpoint

Use an RPC provider such as:

* Alchemy
* Infura
* QuickNode
* Another Ethereum-compatible RPC provider

Create an account with the selected provider and create a Sepolia endpoint.

The exact deployment configuration should be kept in environment variables.

Example:

```env
SEPOLIA_RPC_URL=https://your-sepolia-rpc-url
DEPLOYER_PRIVATE_KEY=your_private_key
```

### Important

Never commit the real value of:

```text
DEPLOYER_PRIVATE_KEY
```

to GitHub.

---

# Building the Frontend

Create a production build:

```bash
pnpm build
```

The output is generated in the project's configured distribution directory.

To preview the production build:

```bash
pnpm preview
```

---

# Project Structure

The important project files are organized approximately as follows:

```text
document-notary/
│
├── contracts/
│   └── Notary.sol
│
├── artifacts/
│   └── contracts/
│       └── Notary.sol/
│           ├── Notary.json
│           └── Notary.dbg.json
│
├── cache/
│   └── solidity-files-cache.json
│
├── scripts/
│   └── deploy.cjs
│
├── src/
│   ├── App.tsx
│   ├── App.tsx.backup
│   ├── index.css
│   ├── main.tsx
│   │
│   ├── components/
│   │   ├── error-boundary.tsx
│   │   └── ui/
│   │       └── ...
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   └── pages/
│       └── not-found.tsx
│
├── public/
│   ├── favicon.svg
│   └── robots.txt
│
├── dist/
│   └── ...
│
├── .env
├── .env.example
├── hardhat.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# End-to-End Example

Suppose the user wants to notarize:

```text
degree-certificate.pdf
```

## Step 1 — Select the document

The user selects:

```text
degree-certificate.pdf
```

---

## Step 2 — Calculate hash

The browser calculates:

```text
SHA-256(degree-certificate.pdf)
```

Example:

```text
0x91ab23....................................7ef2
```

The hash is displayed to the user.

---

## Step 3 — Optional IPFS upload

The application uploads the document to IPFS.

Example:

```text
CID:
bafybeigdyr...
```

---

## Step 4 — Connect wallet

The user connects MetaMask.

Example:

```text
0x1234...5678
```

---

## Step 5 — Blockchain transaction

The frontend calls:

```solidity
notarize(
    documentHash,
    "Degree Certificate",
    ipfsCID
)
```

The wallet asks the user to confirm the transaction.

---

## Step 6 — Blockchain stores proof

The contract stores:

```text
Hash:
0x91ab23...

Owner:
0x1234...5678

Timestamp:
<blockchain timestamp>

Description:
Degree Certificate

IPFS CID:
bafybeigdyr...
```

---

# Verification Example

Later, the user selects the same document.

The application calculates:

```text
SHA-256(degree-certificate.pdf)
```

If the document has not changed:

```text
New hash
    =
Stored hash
```

The application retrieves:

```text
Owner
Timestamp
Description
IPFS CID
```

The document can therefore be checked against the blockchain record.

---

# If the Document Changes

Suppose the user edits:

```text
degree-certificate.pdf
```

Even if only one small part changes, the SHA-256 result will normally change.

For example:

```text
Original:

0x91ab23...7ef2


Modified:

0x4e72bd...112a
```

The new hash does not match the blockchain record.

Therefore:

```text
Modified document
        |
        v
Different SHA-256
        |
        v
Does not match notarized fingerprint
```

---

# Problems Faced and Solutions

During development, several implementation issues were encountered.

---

## Problem 1 — Contract ABI and frontend mismatch

### Problem

The Solidity contract's:

```solidity
getNotarization()
```

returns a `Document` struct.

The frontend initially described the return value as separate values:

```text
address owner,
uint256 timestamp,
string description,
string ipfsCID
```

This did not correctly match the generated contract ABI.

### Solution

The generated Hardhat artifact was inspected:

```text
artifacts/contracts/Notary.sol/Notary.json
```

The ABI showed that the return value is a tuple containing:

```text
owner
timestamp
description
ipfsCID
```

The frontend ABI was then corrected to represent the struct return value as a tuple.

This allowed:

```typescript
notarization = await contract.getNotarization(clean);
```

to work correctly.

---

# Problem 2 — Finding the Correct ABI

The generated ABI was verified using Node.js:

```bash
node -e "const x=require('./artifacts/contracts/Notary.sol/Notary.json'); console.log(JSON.stringify(x.abi.filter(x=>x.name==='getNotarization'),null,2))"
```

This is a useful debugging technique whenever frontend contract interaction behaves unexpectedly.

---

# Problem 3 — Local vs Public Network

The application needs to distinguish between:

```text
Hardhat Local
```

and:

```text
Sepolia
```

### Solution

The frontend recognizes:

```text
31337
```

and:

```text
11155111
```

as supported chains.

The appropriate contract address is selected according to the active network.

---

# Problem 4 — Document Storage vs Blockchain Storage

Storing complete documents directly on Ethereum would be inefficient and expensive.

### Solution

The application stores the document fingerprint rather than the complete document.

The document can optionally be stored using IPFS.

Architecture:

```text
Document
   |
   +---- SHA-256 ----> Blockchain
   |
   +---- IPFS --------> Optional decentralized storage
```

---

# Problem 5 — IPFS Dependency

A document-notarization system should not depend entirely on IPFS being available.

### Solution

IPFS is treated as an optional layer.

The important proof is the blockchain document hash.

The application can therefore continue with a hash-only notarization if IPFS storage is unavailable.

---

# Problem 6 — Verifying a Document

A file cannot simply be compared by its filename.

For example:

```text
document.pdf
```

does not prove that the contents are identical.

### Solution

The application compares the SHA-256 fingerprint.

```text
File contents
     |
     v
SHA-256
     |
     v
bytes32 document hash
```

This provides content-based verification.

---

# Problem 7 — Secret/API Key Exposure

Blockchain and IPFS integrations may require credentials.

Putting secrets directly into source code would expose them.

### Solution

Credentials are placed in environment variables.

Example:

```env
PINATA_JWT=...
SEPOLIA_RPC_URL=...
DEPLOYER_PRIVATE_KEY=...
```

and `.env` must not be committed.

---

# Important Requirements

## Requirement 1 — MetaMask

A Web3 wallet is required for user-signed blockchain transactions.

Install:

```text
https://metamask.io/
```

---

## Requirement 2 — Correct Network

For local development:

```text
Chain ID = 31337
```

For Sepolia:

```text
Chain ID = 11155111
```

The wallet and contract must be on the same network.

---

## Requirement 3 — Correct Contract Address

The frontend must use the address of the deployed `Notary` contract.

Do not use an address from a different network.

For example:

```text
Local contract address
```

must not be used while MetaMask is connected to:

```text
Sepolia
```

---

## Requirement 4 — Sepolia ETH

For Sepolia transactions, the wallet needs test ETH.

The application does not provide real ETH.

Use a Sepolia faucet for development/testing.

---

## Requirement 5 — IPFS Credentials

IPFS functionality requires the appropriate Pinata credentials if Pinata is being used.

Create them from the Pinata dashboard.

Do not put credentials directly inside:

```text
App.tsx
```

---

## Requirement 6 — ABI Must Match Contract

Whenever the Solidity contract changes, regenerate the Hardhat artifacts:

```bash
npx hardhat compile
```

Then verify that the frontend ABI matches the deployed contract.

---

# Security Considerations

## Do Not Store Private Keys in the Frontend

Never write:

```typescript
const privateKey = "0x...";
```

inside frontend code.

---

## Do Not Commit `.env`

Use:

```text
.env.example
```

for documentation.

Use:

```text
.env
```

for actual local secrets.

---

## Do Not Use Real Funds for Local Testing

Hardhat development accounts are intended for local development.

Never transfer real funds to development accounts.

---

## Do Not Put Sensitive Documents on Public IPFS

IPFS content can be publicly accessible depending on the gateway/pinning configuration.

Do not upload confidential documents unless you understand the privacy implications.

For sensitive documents, consider encrypting the document before decentralized storage.

---

# Important Security Concept

The application stores a fingerprint rather than the actual document on-chain.

Therefore:

```text
Blockchain:
    Hash
    Owner
    Timestamp
    Description
    CID
```

rather than:

```text
Blockchain:
    Complete PDF/DOCX/etc.
```

This reduces on-chain data storage and avoids directly putting the complete document into the blockchain state.

---

# Troubleshooting

## Frontend cannot connect to contract

Check:

```text
1. MetaMask is installed.
2. MetaMask is connected.
3. Correct network is selected.
4. Contract address is correct.
5. Contract is deployed.
6. ABI matches the deployed contract.
```

---

## `getNotarization()` fails

Check the ABI first.

Inspect the generated ABI:

```bash
node -e "const x=require('./artifacts/contracts/Notary.sol/Notary.json'); console.log(JSON.stringify(x.abi.filter(x=>x.name==='getNotarization'),null,2))"
```

Confirm that the frontend ABI correctly represents the Solidity struct as a tuple.

---

## Transaction is rejected

Check:

```text
Wallet balance
Network
Contract address
Contract state
User account
```

On Sepolia, make sure the wallet contains enough Sepolia ETH.

---

## MetaMask shows the wrong network

Check the chain ID.

Local:

```text
31337
```

Sepolia:

```text
11155111
```

---

## IPFS upload fails

Check:

```text
Pinata credentials
Network connection
API limits
CID returned by the service
```

Remember that IPFS is optional for the core blockchain fingerprinting functionality.

---

## Hash verification fails

Make sure the exact same document is being tested.

Changing any content can produce a different SHA-256 hash.

Check:

```text
Original document
        |
        v
Original SHA-256
```

against:

```text
Current document
        |
        v
Current SHA-256
```

---

# Development Debugging Commands

## Check Contract ABI

```bash
node -e "const x=require('./artifacts/contracts/Notary.sol/Notary.json'); console.log(JSON.stringify(x.abi,null,2))"
```

---

## Check only `getNotarization`

```bash
node -e "const x=require('./artifacts/contracts/Notary.sol/Notary.json'); console.log(JSON.stringify(x.abi.filter(x=>x.name==='getNotarization'),null,2))"
```

---

## Compile Solidity

```bash
npx hardhat compile
```

---

## Start Hardhat

```bash
npx hardhat node
```

---

## Start Frontend

```bash
pnpm dev
```

---

## Production Build

```bash
pnpm build
```

---

# Limitations

The current application has several limitations.

## 1. SHA-256 Proves Content Identity, Not Legal Validity

A blockchain timestamp does not automatically establish the legal validity of the document.

It provides a verifiable blockchain record associated with the document fingerprint.

---

## 2. IPFS Does Not Automatically Guarantee Privacy

A CID is content-addressed and may be accessible through public gateways.

Sensitive documents should not be uploaded without appropriate protection.

---

## 3. Blockchain Transactions Require Gas

Public blockchain notarization requires transaction fees.

Sepolia avoids real-value transactions during testing because it is a testnet.

---

## 4. Wallet Dependency

Users need a compatible Web3 wallet to sign transactions.

---

## 5. Local Blockchain Data Is Temporary

Hardhat local blockchain state is intended for development and testing.

It should not be treated as permanent production storage.

---

# Future Improvements

Possible future enhancements include:

## 1. Multi-chain Support

Support additional networks such as:

```text
Polygon
Base
Arbitrum
Optimism
```

---

## 2. Document Encryption

Encrypt documents before uploading them to IPFS.

---

## 3. QR Code Verification

Generate a QR code containing:

```text
Document Hash
Transaction Hash
Verification URL
```

---

## 4. Public Verification Page

Create a public URL such as:

```text
/verify/<document-hash>
```

---

## 5. NFT-Based Certificates

A notarized document could optionally be represented by an NFT.

---

## 6. Digital Signatures

Add cryptographic signatures from authorized organizations.

---

## 7. Multiple Document Versions

Maintain a history such as:

```text
Document v1
     |
     v
Document v2
     |
     v
Document v3
```

with each version having its own fingerprint.

---

# Example Architecture

The complete system can be summarized as:

```text
                         USER
                          |
                          v
                 +----------------+
                 |    React UI    |
                 +----------------+
                          |
              +-----------+-----------+
              |                       |
              v                       v
       SHA-256 Browser          MetaMask
          Hashing                   |
              |                     |
              |                     v
              |              Ethereum Network
              |                     |
              |                     v
              |              +-------------+
              +------------->|   Notary    |
                             |   Contract  |
                             +-------------+
                                   |
                     +-------------+-------------+
                     |                           |
                     v                           v
                Blockchain                    IPFS
                Record                         CID
                     |                           |
                     +-------------+-------------+
                                   |
                                   v
                              Verification
```

---

# Complete User Workflow

```text
             START
               |
               v
       Select document
               |
               v
        Calculate SHA-256
               |
               v
       Display fingerprint
               |
               v
       Optional IPFS upload
               |
               v
        Connect MetaMask
               |
               v
       Check blockchain
               |
               v
       Call notarize()
               |
               v
       Confirm transaction
               |
               v
      Blockchain stores proof
               |
               v
        Transaction complete
               |
               v
              END
```

Verification:

```text
          Select document
                 |
                 v
          Calculate SHA-256
                 |
                 v
        Query Notary contract
                 |
          +------+------+
          |             |
          v             v
       Found          Not Found
          |             |
          v             v
   Read notarization   No record
          |
          v
   Display owner,
   timestamp,
   description,
   IPFS CID
```

---

# Why Blockchain Is Used

The blockchain provides a shared, append-only record that can be independently queried.

The important idea is not to store the document itself.

Instead:

```text
Document
   |
   v
Cryptographic Fingerprint
   |
   v
Blockchain Record
```

If the document changes, its fingerprint changes.

This makes it possible to detect whether the current document matches the fingerprint that was previously registered.

---

# Why IPFS Is Used

Blockchain storage is not designed for storing large documents.

IPFS can be used as a separate storage layer.

The architecture becomes:

```text
                  Document
                     |
          +----------+----------+
          |                     |
          v                     v
       SHA-256                IPFS
          |                     |
          v                     v
     Blockchain               CID
          |                     |
          +----------+----------+
                     |
                     v
              Verification
```

The blockchain contains the proof while IPFS can contain the document copy.

---

# Recommended Setup for a New Developer

A new developer should follow this order:

```text
1. Install Node.js
        |
2. Install pnpm
        |
3. Clone repository
        |
4. Run pnpm install
        |
5. Configure .env
        |
6. Start Hardhat
        |
7. Deploy Notary.sol
        |
8. Configure contract address
        |
9. Configure MetaMask
        |
10. Run pnpm dev
        |
11. Connect wallet
        |
12. Test notarization
        |
13. Test verification
```

---

# Production Checklist

Before deploying the application publicly, verify:

```text
[ ] Smart contract compiled successfully
[ ] Smart contract deployed to intended network
[ ] Contract address is correct
[ ] Frontend ABI matches deployed contract
[ ] Correct chain ID configured
[ ] MetaMask connection works
[ ] SHA-256 hashing works
[ ] Notarization transaction works
[ ] Verification works
[ ] getNotarization() works
[ ] Duplicate documents are handled
[ ] IPFS upload works if enabled
[ ] No private keys are committed
[ ] No API secrets are committed
[ ] .env is in .gitignore
[ ] .env.example contains placeholders
[ ] Production build succeeds
```

---

# Git / Secret Management

Before pushing the project to GitHub, check:

```bash
git status
```

Make sure files containing secrets are not staged.

Check:

```bash
git diff --cached
```

Do not commit:

```text
.env
private keys
seed phrases
Pinata secrets
RPC secrets
```

A safe repository should contain:

```text
.env.example
```

but not:

```text
.env
```

---

# Conclusion

The Web3 Document Notary dApp demonstrates how blockchain, cryptographic hashing and decentralized storage can work together to create a verifiable digital document proof system.

The core process is:

```text
Document
   |
   v
SHA-256
   |
   v
Document Fingerprint
   |
   v
Ethereum Notary Contract
   |
   +---- Owner
   +---- Timestamp
   +---- Description
   +---- IPFS CID
   |
   v
Future Verification
```

The key design principle is:

> **Store the document fingerprint on-chain rather than the complete document.**

The blockchain provides the notarization record, SHA-256 provides the document fingerprint, MetaMask provides transaction signing, ethers.js connects the frontend to Ethereum, and IPFS/Pinata can optionally provide decentralized document storage.

This architecture allows a document to be checked later against the fingerprint recorded at the time of notarization.

---

## Quick Start

For experienced developers:

```bash
git clone <YOUR_REPOSITORY_URL>
cd document-notary

pnpm install

npx hardhat compile

npx hardhat node
```

In another terminal:

```bash
npx hardhat run scripts/deploy.cjs --network localhost
```

Configure the deployed address in `.env`, then:

```bash
pnpm dev
```

Open the application, connect MetaMask to:

```text
Hardhat Local
Chain ID: 31337
```

and test:

```text
Upload document
        ↓
Generate SHA-256
        ↓
Notarize
        ↓
Confirm MetaMask transaction
        ↓
Verify document
```

For public testnet testing, deploy the contract to:

```text
Ethereum Sepolia
Chain ID: 11155111
```

and configure the Sepolia contract address in the environment variables.

```
```

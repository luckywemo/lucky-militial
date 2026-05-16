<div align="center">
  <img width="1200" height="475" alt="Lucky Militia Tactical Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  
  # 🎖️ LUCKY MILITIA: TACTICAL OPERATIONS TERMINAL
  **The definitive Soroban-powered multiplayer combat experience on Stellar.**
  
  [![Stellar](https://img.shields.io/badge/Network-Stellar_Soroban-black?style=for-the-badge&logo=stellar)](https://stellar.org)
  [![React](https://img.shields.io/badge/v19.0-React-blue?style=for-the-badge&logo=react)](https://react.dev)
  [![Phaser](https://img.shields.io/badge/v3.8-Phaser-orange?style=for-the-badge&logo=phaser)](https://phaser.io)
</div>

---

## 📡 MISSION OVERVIEW
Lucky Militia is a high-fidelity, tactical multiplayer shooter that leverages the **Stellar Soroban** network for trustless combat records. Rebuilt from the ground up for the React 19 ecosystem, it features a dynamic Phaser Tilemap engine, spatial 3D audio, and reactive AI orchestration.

## ⚡ CORE TECHNOLOGY
- **Engine:** [React 19](https://react.dev) + [Phaser 3.8+](https://phaser.io) (Standardized Tilemap Rendering)
- **3D Visualization:** [@react-three/fiber](https://r3f.docs.pmnd.rs) + [Three.js](https://threejs.org) (Holographic Lobby Prototypes)
- **Blockchain:** [Stellar Soroban](https://soroban.stellar.org) (Verified Combat Stats & Identity)
- **Networking:** [PeerJS](https://peerjs.com) (P2P Multiplayer Mesh)
- **Database:** [Upstash Redis](https://upstash.com) (High-speed Leaderboard Caching)

## 🎯 TACTICAL FEATURES
### 🧱 Dynamic Battlefield 2.0
- **High-Performance Tilemaps:** Migrated from sprite-loops to a dedicated tilemap architecture for superior rendering and precise collision.
- **Destructible Cover:** Environment tiles (Tactical Crates) feature integrity tracking. Breach enemy cover to expose HVTs.
- **Volumetric Lighting:** Integrated `Light2D` pipeline for atmospheric urban combat.

### 🛡️ Trustless Economy
- **On-Chain Verification:** Compare combat scores directly against the Soroban ledger for absolute proof of ranking.
- **Verified Badge:** Operators with matching blockchain records receive the [🛡️ SOROBAN_VERIFIED] status.

### 🤖 AI Orchestration
- **Dynamic Backfill:** Squads are automatically balanced using a reactive AI engine that calculates unit needs based on room capacity.
- **Enhanced Pathfinding:** Bots utilize real-time LOS (Line of Sight) and cover-finding algorithms based on tilemap data.

### 🔊 Immersive Protocol
- **Spatial Audio:** Real-time distance attenuation and stereo panning for gunshots, impacts, and environmental cues.
- **Cyber-Premium UI:** Modernized "Visor" HUD with CRT flicker effects and tactical noise overlays.

---

## 🛠️ DEPLOYMENT INSTRUCTIONS

### Prerequisites
- [Node.js](https://nodejs.org/) (Project is optimized for v20+)
- [Freighter Wallet](https://www.freighter.app/) (For Soroban interactions)

### 1. Preparation
Clone the repository and install the modern dependency stack:
```bash
npm install
```

### 2. Configuration
Create a `.env` file in the root directory:
```env
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_CONTRACT_ID=YOUR_CONTRACT_ADDRESS
GEMINI_API_KEY=YOUR_AI_KEY
```

### 3. Ignition
Launch the tactical terminal:
```bash
npm run dev
```

---

## 🗺️ OPERATIONAL ROADMAP
- [x] React 19 Migration (Core Integrity)
- [x] Phaser Tilemap Architecture (Performance Standard)
- [x] Trustless Leaderboard Integration (Economy)
- [ ] Cross-Layer Weapon Customization
- [ ] Persistent Operator Progression (NFT Metadata)

---

<div align="center">
  <p><i>"CODE IS LAW. COMBAT IS REALITY."</i></p>
  <sub>v3.0.0-PROXIMA // OPERATOR_UPLINK_SUCCESSFUL</sub>
</div>

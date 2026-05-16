import { isMiniPay, activeChain, MILITIA_CONTRACT_ADDRESS } from './utils/web3Config';

// Mocking window.ethereum for testing
const mockMiniPay = () => {
    (global as any).window = {
        ethereum: {
            isMiniPay: true
        }
    };
};

const mockStandard = () => {
    (global as any).window = {
        ethereum: {}
    };
};

console.log('--- TEST 1: Standard Environment ---');
mockStandard();
console.log('isMiniPay():', isMiniPay());
console.log('activeChain.id:', activeChain.id); // Should be 8453 (Base)
console.log('Contract Address:', MILITIA_CONTRACT_ADDRESS);

console.log('\n--- TEST 2: MiniPay Environment ---');
mockMiniPay();
console.log('isMiniPay():', isMiniPay());
console.log('activeChain.id:', activeChain.id); // Should be 42220 (Celo)
console.log('Contract Address:', MILITIA_CONTRACT_ADDRESS);

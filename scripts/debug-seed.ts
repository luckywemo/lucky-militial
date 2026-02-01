
// Simple script to test Phaser's RandomDataGenerator behavior with string seeds
// Run with: npx ts-node scripts/debug-seed.ts

const Phaser = require('phaser');

// Mock RandomDataGenerator if Phaser is not fully loadable in node without canvas
// Actually Phaser might need a headless mode or we can just extract the logic if needed.
// Le'ts try loading phaser first. If it fails, we will implement a similar test using the same algorithm if known, or just a simple string hash test.

// Phaser's generator is based on Alea.
// Let's try to simulate what happens in the game.

const seed1 = '1234';
const seed2 = '1234';
const seed3 = '5678';

console.log(`Testing Seed Consistency...`);

try {
    // Note: Phaser in Node might require some setup, or we can use a mock object if we just want to verify the logic flow.
    // However, I want to verify the ACTUAL Phaser class behavior.

    // Polyfill distinct parts if needed, but 'phaser' package often expects DOM.
    // If this fails, I will use a different approach.
    const rnd1 = new Phaser.Math.RandomDataGenerator([seed1]);
    const rnd2 = new Phaser.Math.RandomDataGenerator([seed2]);
    const rnd3 = new Phaser.Math.RandomDataGenerator([seed3]);

    console.log(`\nSeed: "${seed1}"`);
    const val1_1 = rnd1.between(400, 1600);
    const val1_2 = rnd1.between(400, 1600);
    console.log(`Values: ${val1_1}, ${val1_2}`);

    console.log(`\nSeed: "${seed2}" (Should match above)`);
    const val2_1 = rnd2.between(400, 1600);
    const val2_2 = rnd2.between(400, 1600);
    console.log(`Values: ${val2_1}, ${val2_2}`);

    if (val1_1 === val2_1 && val1_2 === val2_2) {
        console.log('\n[SUCCESS] Seeds produce identical sequences.');
    } else {
        console.error('\n[FAILURE] Seeds produced DIFFERENT sequences!');
    }

    console.log(`\nSeed: "${seed3}" (Should be different)`);
    const val3_1 = rnd3.between(400, 1600);
    const val3_2 = rnd3.between(400, 1600);
    console.log(`Values: ${val3_1}, ${val3_2}`);

} catch (e) {
    console.error("Could not run Phaser in this environment:", e);
}

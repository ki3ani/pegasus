#!/usr/bin/env node

/**
 * Test Stellar DEX prices as fallback for Reflector
 */

const StellarSdk = require('@stellar/stellar-sdk');

async function testDexPrices() {
  console.log('🔍 Testing Stellar DEX prices as Reflector fallback...\n');
  
  // Use Horizon API for DEX data
  const horizonServer = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
  
  const testPairs = [
    { 
      base: 'XLM',
      counter: 'USDC',
      counterIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
    },
    {
      base: 'KALE',  
      baseIssuer: 'GCHPTWXMT3HYF4RLZHWBNRF4MPXLTJ76ISHMSYIWCCDXWUYOQG5MR2AB',
      counter: 'USDC',
      counterIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
    }
  ];
  
  for (const pair of testPairs) {
    console.log(`📊 Getting ${pair.base}/${pair.counter} price...`);
    
    try {
      // Create asset objects
      const baseAsset = pair.base === 'XLM' 
        ? StellarSdk.Asset.native()
        : new StellarSdk.Asset(pair.base, pair.baseIssuer);
      
      const counterAsset = new StellarSdk.Asset(pair.counter, pair.counterIssuer);
      
      // Get orderbook
      const orderbook = await horizonServer.orderbook(baseAsset, counterAsset)
        .limit(5)
        .call();
      
      if (orderbook.bids && orderbook.bids.length > 0) {
        const topBid = orderbook.bids[0];
        const price = parseFloat(topBid.price);
        
        console.log(`✅ ${pair.base} price: $${price} USDC`);
        console.log(`   Top bid: ${topBid.amount} ${pair.base} @ ${topBid.price} ${pair.counter}`);
        
        // Calculate USD price (assuming USDC ~= $1)
        console.log(`💰 Estimated USD price: $${price.toFixed(6)}`);
      } else {
        console.log(`⚠️  No bids found for ${pair.base}/${pair.counter}`);
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error getting ${pair.base}/${pair.counter} price:`, error.message);
      console.log('');
    }
  }
}

// Run the test
testDexPrices().catch(console.error);
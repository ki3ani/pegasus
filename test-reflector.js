#!/usr/bin/env node

/**
 * Manual Reflector Oracle Test Script
 * Tests direct calls to Reflector contracts
 */

const StellarSdk = require('@stellar/stellar-sdk');

async function testReflectorOracle() {
  console.log('🔍 Testing Reflector Oracle Integration...\n');
  
  // Try both testnet and mainnet
  const configs = [
    {
      name: 'Testnet/Futurenet',
      server: new StellarSdk.rpc.Server('https://rpc-futurenet.stellar.org'),
      networkPassphrase: StellarSdk.Networks.FUTURENET,
      stellarContractId: 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP',
      cexContractId: 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63'
    },
    {
      name: 'Mainnet',
      server: new StellarSdk.rpc.Server('https://soroban.stellar.org:443'),
      networkPassphrase: StellarSdk.Networks.PUBLIC,
      stellarContractId: 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
      cexContractId: 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN'
    }
  ];
  
  for (const config of configs) {
    console.log(`\n🌐 Testing ${config.name}...`);
    console.log('📡 Server:', config.server.serverURL);
    console.log('🏷️  Stellar Contract:', config.stellarContractId);
    console.log('🏷️  CEX Contract:', config.cexContractId);
    
    await testNetworkConfig(config);
  }
}

async function testNetworkConfig(config) {
  // Test assets
  const testAssets = [
    { name: 'XLM', type: 'Stellar', contract: config.stellarContractId, address: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC' },
    { name: 'USDC', type: 'Stellar', contract: config.stellarContractId, address: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' },
    { name: 'BTC', type: 'Other', contract: config.cexContractId, symbol: 'BTC' }
  ];
  
  for (const asset of testAssets) {
    console.log(`\n🔍 Testing ${asset.name}...`);
    await testAsset(config.server, config.networkPassphrase, asset);
  }
}

async function testAsset(server, networkPassphrase, asset) {
  try {
    // Create asset parameter
    let assetParam;
    if (asset.type === 'Stellar') {
      assetParam = StellarSdk.nativeToScVal({ Stellar: asset.address });
    } else {
      assetParam = StellarSdk.nativeToScVal({ Other: asset.symbol });
    }
    
    console.log(`  Asset param:`, JSON.stringify(StellarSdk.scValToNative(assetParam)));
    
    // Test different method names
    const methods = ['lastprice', 'price', 'last_price', 'get_price'];
    
    for (const method of methods) {
      console.log(`  Trying method: ${method}`);
      
      try {
        const result = await callContract(server, networkPassphrase, asset.contract, method, [assetParam]);
        
        if (result && !StellarSdk.rpc.Api.isSimulationError(result)) {
          console.log(`  ✅ ${method} succeeded!`);
          
          if (StellarSdk.rpc.Api.isSimulationSuccess(result)) {
            const data = StellarSdk.scValToNative(result.result.retval);
            console.log(`  📊 Result:`, data);
            
            // If this is price data, try to parse it
            if (data && typeof data === 'object' && data.price !== undefined) {
              const price = BigInt(data.price) / BigInt(Math.pow(10, 14)); // Assuming 14 decimals
              console.log(`  💰 Parsed price: $${price}`);
            }
          }
          
          return; // Success, move to next asset
        }
      } catch (error) {
        console.log(`  ❌ ${method} failed:`, error.message);
        
        // Show more details for storage errors
        if (error.message.includes('MissingValue')) {
          console.log(`      This suggests the asset data is not available in the oracle`);
        }
      }
    }
    
    console.log(`  ⚠️  All methods failed for ${asset.name}`);
    
  } catch (error) {
    console.error(`  💥 Error testing ${asset.name}:`, error.message);
  }
}

async function callContract(server, networkPassphrase, contractId, method, args) {
  // Create dummy account for simulation
  const dummyKeypair = StellarSdk.Keypair.random();
  const dummyAccount = new StellarSdk.Account(dummyKeypair.publicKey(), '0');
  
  // Create contract call
  const contract = new StellarSdk.Contract(contractId);
  const operation = contract.call(method, ...args);
  
  // Build transaction
  const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
  .addOperation(operation)
  .setTimeout(30)
  .build();
  
  // Simulate
  return await server.simulateTransaction(transaction);
}

// Run the test
testReflectorOracle().catch(console.error);
/**
 * Reflector Contract Initialization Script
 * Initializes and populates the Reflector oracle contract with price data
 */

import * as StellarSdk from '@stellar/stellar-sdk'

export class ReflectorContractInitializer {
  private server: StellarSdk.rpc.Server
  private networkPassphrase: string
  private contractId: string
  private adminKeypair: StellarSdk.Keypair

  constructor() {
    // Use testnet configuration
    const isTestnet = process.env.STELLAR_NETWORK !== 'mainnet'

    this.server = new StellarSdk.rpc.Server(
      isTestnet
        ? 'https://rpc-futurenet.stellar.org'
        : 'https://soroban.stellar.org:443'
    )

    this.networkPassphrase = isTestnet
      ? StellarSdk.Networks.FUTURENET
      : StellarSdk.Networks.PUBLIC

    // Use the existing deployed contract IDs from the test script
    this.contractId = isTestnet
      ? 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP' // Testnet contract
      : 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M' // Mainnet contract

    // Generate a random admin keypair for demo purposes
    // In production, this should be a secure admin keypair
    this.adminKeypair = StellarSdk.Keypair.random()

    console.log(`🔧 Reflector Contract Initializer`)
    console.log(`📡 Network: ${isTestnet ? 'testnet' : 'mainnet'}`)
    console.log(`🏷️  Contract: ${this.contractId}`)
    console.log(`👤 Admin Public Key: ${this.adminKeypair.publicKey()}`)
  }

  /**
   * Initialize the contract with configuration
   */
  async initializeContract(): Promise<void> {
    try {
      console.log('🚀 Initializing Reflector contract...')

      // Create contract instance
      const contract = new StellarSdk.Contract(this.contractId)

      // Create config data
      const configData = {
        admin: this.adminKeypair.publicKey(),
        base_asset: { Stellar: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC' }, // XLM
        decimals: 14,
        resolution: 300000, // 5 minutes in milliseconds
        period: 86400000, // 24 hours in milliseconds
        assets: [
          { Stellar: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC' }, // XLM
          { Stellar: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' }, // USDC
          { Stellar: 'GCHPTWXMT3HYF4RLZHWBNRF4MPXLTJ76ISHMSYIWCCDXWUYOQG5MR2AB' }  // KALE
        ]
      }

      // Convert to Soroban format
      const configScVal = StellarSdk.nativeToScVal(configData)

      // Create the config operation
      const configOperation = contract.call('config', configScVal)

      // Build transaction
      const account = await this.server.getAccount(this.adminKeypair.publicKey())
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(configOperation)
      .setTimeout(30)
      .build()

      // Sign and submit
      transaction.sign(this.adminKeypair)
      const result = await this.server.sendTransaction(transaction)

      if (result.status === 'PENDING') {
        console.log('✅ Contract initialized successfully!')
        console.log('📋 Transaction hash:', result.hash)
      } else {
        console.error('❌ Contract initialization failed:', result.errorResult)
      }

    } catch (error) {
      console.error('💥 Error initializing contract:', error)
    }
  }

  /**
   * Update prices for assets
   */
  async updatePrices(): Promise<void> {
    try {
      console.log('💰 Updating asset prices...')

      // Current prices (scaled to 14 decimals)
      const prices = [
        BigInt(Math.floor(0.12 * Math.pow(10, 14))), // XLM: $0.12
        BigInt(Math.floor(1.0 * Math.pow(10, 14))),  // USDC: $1.00
        BigInt(Math.floor(0.08 * Math.pow(10, 14)))  // KALE: $0.08
      ]

      const timestamp = Math.floor(Date.now() / 1000) // Current timestamp in seconds

      // Create contract instance
      const contract = new StellarSdk.Contract(this.contractId)

      // Convert prices to Soroban format
      const pricesScVal = StellarSdk.nativeToScVal(prices)
      const timestampScVal = StellarSdk.nativeToScVal(timestamp)

      // Create the set_price operation
      const setPriceOperation = contract.call('set_price', pricesScVal, timestampScVal)

      // Build transaction
      const account = await this.server.getAccount(this.adminKeypair.publicKey())
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(setPriceOperation)
      .setTimeout(30)
      .build()

      // Sign and submit
      transaction.sign(this.adminKeypair)
      const result = await this.server.sendTransaction(transaction)

      if (result.status === 'PENDING') {
        console.log('✅ Prices updated successfully!')
        console.log('📋 Transaction hash:', result.hash)
        console.log('💰 Updated prices:')
        console.log('   XLM: $0.12')
        console.log('   USDC: $1.00')
        console.log('   KALE: $0.08')
      } else {
        console.error('❌ Price update failed:', result.errorResult)
      }

    } catch (error) {
      console.error('💥 Error updating prices:', error)
    }
  }

  /**
   * Fund the admin account with some XLM for transaction fees
   */
  async fundAdminAccount(): Promise<void> {
    try {
      console.log('💳 Funding admin account...')

      // For testnet, we can use the friendbot
      if (this.networkPassphrase === StellarSdk.Networks.FUTURENET) {
        const response = await fetch(
          `https://friendbot-futurenet.stellar.org/?addr=${this.adminKeypair.publicKey()}`
        )

        if (response.ok) {
          console.log('✅ Admin account funded successfully!')
        } else {
          console.error('❌ Failed to fund admin account')
        }
      } else {
        console.log('⚠️  Please fund the admin account manually for mainnet:')
        console.log('👤 Public Key:', this.adminKeypair.publicKey())
        console.log('🔑 Secret Key:', this.adminKeypair.secret()) // Only for demo!
      }

    } catch (error) {
      console.error('💥 Error funding account:', error)
    }
  }

  /**
   * Run the complete initialization process
   */
  async initialize(): Promise<void> {
    console.log('🎯 Starting Reflector contract initialization...\n')

    // Step 1: Fund admin account
    await this.fundAdminAccount()

    // Wait a bit for funding to process
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 2: Initialize contract
    await this.initializeContract()

    // Wait a bit for initialization to process
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 3: Update prices
    await this.updatePrices()

    console.log('\n🎉 Initialization complete!')
    console.log('📝 The contract should now have price data available.')
  }
}

// Export for use in other files
export const reflectorInitializer = new ReflectorContractInitializer()

// If run directly
if (require.main === module) {
  reflectorInitializer.initialize().catch(console.error)
}

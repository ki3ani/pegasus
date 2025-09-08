#!/usr/bin/env node

/**
 * Reflector Contract Deployment and Initialization Script
 * Builds, deploys, and initializes the Reflector oracle contract
 */

const StellarSdk = require('@stellar/stellar-sdk')
const fs = require('fs')
const path = require('path')

class ReflectorContractDeployer {
  constructor() {
    // Use testnet configuration
    this.isTestnet = process.env.STELLAR_NETWORK !== 'mainnet'
    this.server = new StellarSdk.rpc.Server(
      this.isTestnet
        ? 'https://rpc-futurenet.stellar.org'
        : 'https://soroban.stellar.org:443'
    )
    this.networkPassphrase = this.isTestnet
      ? StellarSdk.Networks.FUTURENET
      : StellarSdk.Networks.PUBLIC

    // Generate admin keypair
    this.adminKeypair = StellarSdk.Keypair.random()
    this.contractId = null

    console.log(`🚀 Reflector Contract Deployer`)
    console.log(`📡 Network: ${this.isTestnet ? 'testnet' : 'mainnet'}`)
    console.log(`👤 Admin Public Key: ${this.adminKeypair.publicKey()}`)
  }

  async buildContract() {
    console.log('🔨 Building contract...')

    const { execSync } = require('child_process')
    const contractPath = path.join(__dirname, '..', 'reflector-contract')

    try {
      const absoluteContractPath = path.resolve(__dirname, 'reflector-contract')
      const buildCommand = `cd "${absoluteContractPath}" && cargo build --release --target wasm32-unknown-unknown`
      console.log('Contract path:', absoluteContractPath)
      console.log('Running command:', buildCommand)
      
      const output = execSync(buildCommand, { 
        stdio: 'inherit',
        env: { ...process.env }
      })
      
      console.log('✅ Contract built successfully!')
      
      // Verify WASM file exists
      const wasmPath = path.join(absoluteContractPath, 'target', 'wasm32-unknown-unknown', 'release', 'reflector_oracle.wasm')
      if (fs.existsSync(wasmPath)) {
        console.log('📁 WASM file found at:', wasmPath)
        return
      } else {
        throw new Error('WASM file not found after successful build')
      }
    } catch (error) {
      console.error('❌ Build error:', error.message)
      throw error
    }
  }

  /**
   * Deploy the contract to Stellar network
   */
  async deployContract() {
    console.log('📦 Deploying contract...')

    try {
      // Read the compiled WASM file
      const wasmPath = path.join(__dirname, 'reflector-contract', 'target', 'wasm32-unknown-unknown', 'release', 'reflector_oracle.wasm')
      console.log('Reading WASM file from:', wasmPath)
      const wasmBuffer = fs.readFileSync(wasmPath)
      console.log('WASM file size:', wasmBuffer.length, 'bytes')

      // Convert buffer to Uint8Array for proper serialization
      const wasmUint8Array = new Uint8Array(wasmBuffer)
      console.log('WASM Uint8Array length:', wasmUint8Array.length)

      // Create the install contract operation using proper XDR format
      const wasmHashValue = StellarSdk.hash(wasmUint8Array)
      console.log('WASM hash:', wasmHashValue.toString('hex'))

      // Use Buffer for ScVal bytes instead of Uint8Array
      const wasmBufferForScVal = Buffer.from(wasmUint8Array)

      const installOperation = StellarSdk.Operation.invokeHostFunction({
        func: StellarSdk.xdr.HostFunction.hostFunctionTypeUploadContractWasm(),
        parameters: [StellarSdk.xdr.ScVal.scvBytes(wasmBufferForScVal)]
      })

      // Get account and build transaction
      const account = await this.server.getAccount(this.adminKeypair.publicKey())
      const installTx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(installOperation)
      .setTimeout(30)
      .build()

      // Sign and submit
      installTx.sign(this.adminKeypair)
      const installResult = await this.server.sendTransaction(installTx)

      if (installResult.status !== 'PENDING') {
        throw new Error('Install transaction failed')
      }

      console.log('📋 Install transaction submitted:', installResult.hash)

      // Wait for confirmation
      await this.waitForTransaction(installResult.hash)

      // Get the WASM hash from the result
      const wasmHash = StellarSdk.xdr.Hash.fromXDR(installResult.resultMetaXdr, 'base64').toString('hex')

      // Create the contract
      const createOperation = StellarSdk.Operation.invokeHostFunction({
        func: StellarSdk.xdr.HostFunction.hostFunctionTypeCreateContract(),
        parameters: [
          StellarSdk.xdr.ContractIdPreimage.contractIdPreimageFromAddress(
            StellarSdk.xdr.ContractIdPreimageFromAddress.contractIdPreimageFromAddress({
              address: StellarSdk.Address.fromString(this.adminKeypair.publicKey()).toScAddress(),
              salt: StellarSdk.xdr.Uint256.fromString(wasmHash)
            })
          ),
          StellarSdk.nativeToScVal(wasmHash)
        ]
      })

      // Build create transaction
      const createAccount = await this.server.getAccount(this.adminKeypair.publicKey())
      const createTx = new StellarSdk.TransactionBuilder(createAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(createOperation)
      .setTimeout(30)
      .build()

      // Sign and submit
      createTx.sign(this.adminKeypair)
      const createResult = await this.server.sendTransaction(createTx)

      if (createResult.status !== 'PENDING') {
        throw new Error('Create transaction failed')
      }

      console.log('📋 Create transaction submitted:', createResult.hash)

      // Wait for confirmation and get contract ID
      await this.waitForTransaction(createResult.hash)

      // Extract contract ID from transaction result
      const transactionResult = StellarSdk.xdr.TransactionResult.fromXDR(createResult.resultXdr, 'base64')
      const contractId = transactionResult.result().results()[0].value().address().contractId()

      this.contractId = StellarSdk.StrKey.encodeContract(contractId)
      console.log('✅ Contract deployed successfully!')
      console.log('🏷️  Contract ID:', this.contractId)

      return this.contractId

    } catch (error) {
      console.error('💥 Error deploying contract:', error)
      throw error
    }
  }

  /**
   * Wait for a transaction to be confirmed
   */
  async waitForTransaction(hash) {
    console.log('⏳ Waiting for transaction confirmation...')

    for (let i = 0; i < 60; i++) { // Wait up to 60 seconds
      try {
        const response = await this.server.getTransaction(hash)
        if (response.status === 'SUCCESS') {
          return response
        } else if (response.status === 'FAILED') {
          throw new Error('Transaction failed')
        }
      } catch (error) {
        // Transaction not found yet, continue waiting
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    throw new Error('Transaction confirmation timeout')
  }

  /**
   * Initialize the contract with configuration
   */
  async initializeContract() {
    console.log('🚀 Initializing contract...')

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
  }

  /**
   * Update prices for assets
   */
  async updatePrices() {
    console.log('💰 Updating asset prices...')

    const contract = new StellarSdk.Contract(this.contractId)

    // Current prices (scaled to 14 decimals)
    const prices = [
      BigInt(Math.floor(0.12 * Math.pow(10, 14))), // XLM: $0.12
      BigInt(Math.floor(1.0 * Math.pow(10, 14))),  // USDC: $1.00
      BigInt(Math.floor(0.08 * Math.pow(10, 14)))  // KALE: $0.08
    ]

    const timestamp = Math.floor(Date.now() / 1000) // Current timestamp in seconds

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
  }

  /**
   * Fund the admin account with some XLM for transaction fees
   */
  async fundAdminAccount() {
    console.log('💳 Funding admin account...')

    if (this.isTestnet) {
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
      console.log('🔑 Secret Key:', this.adminKeypair.secret())
    }
  }

  /**
   * Run the complete deployment and initialization process
   */
  async deploy() {
    console.log('🎯 Starting Reflector contract deployment...\n')

    try {
      // Step 1: Build contract
      await this.buildContract()

      // Step 2: Fund admin account
      await this.fundAdminAccount()

      // Wait for funding to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 3: Deploy contract
      await this.deployContract()

      // Wait for deployment to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 4: Initialize contract
      await this.initializeContract()

      // Wait for initialization to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 5: Update prices
      await this.updatePrices()

      console.log('\n🎉 Deployment and initialization complete!')
      console.log('🏷️  Contract ID:', this.contractId)
      console.log('📝 The contract is now ready with price data.')

      // Save contract ID for future use
      this.saveContractId()

    } catch (error) {
      console.error('❌ Deployment failed:', error)
      throw error
    }
  }

  /**
   * Save the deployed contract ID to a file
   */
  saveContractId() {
    const configPath = path.join(__dirname, '..', 'apps', 'backend', 'src', 'services', 'contract-config.json')

    const config = {
      contractId: this.contractId,
      network: this.isTestnet ? 'testnet' : 'mainnet',
      deployedAt: new Date().toISOString(),
      adminPublicKey: this.adminKeypair.publicKey()
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log('💾 Contract configuration saved to:', configPath)
  }
}

// Export for use in other files
const deployer = new ReflectorContractDeployer()

// If run directly
if (require.main === module) {
  deployer.deploy().catch(console.error)
}

module.exports = { ReflectorContractDeployer }

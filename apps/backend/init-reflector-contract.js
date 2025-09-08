#!/usr/bin/env node

/**
 * Initialize Reflector Contract Script
 * Run this script to initialize the Reflector oracle contract with price data
 */

const { reflectorInitializer } = require('./dist/services/reflectorContractInitializer')

async function main() {
  try {
    await reflectorInitializer.initialize()
  } catch (error) {
    console.error('❌ Initialization failed:', error)
    process.exit(1)
  }
}

main()

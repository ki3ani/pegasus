/**
 * Freighter wallet integration utilities
 * Uses @stellar/freighter-api package for reliable detection
 */

import { isConnected, requestAccess, getNetwork } from '@stellar/freighter-api'

export interface FreighterWallet {
  publicKey: string
  isConnected: boolean
  network: string
}

export interface FreighterError {
  code: string
  message: string
}

/**
 * Check if Freighter extension is available using API
 */
export async function isFreighterAvailable(): Promise<boolean> {
  try {
    // This will work if Freighter is installed and throw if not
    await isConnected()
    console.log('Freighter detected via API')
    return true
  } catch (error) {
    console.log('Freighter not available:', error)
    return false
  }
}

/**
 * Connect to Freighter wallet using API
 */
export async function connectFreighter(): Promise<FreighterWallet> {
  console.log('connectFreighter called')
  
  try {
    console.log('Requesting access from Freighter...')
    
    // Request access - this returns an object with address property
    const accessResult = await requestAccess()
    console.log('Access result:', accessResult)
    
    if (!accessResult || !accessResult.address) {
      throw new Error('User denied connection request')
    }

    // Extract the public key from the response
    const publicKey = accessResult.address
    if (!publicKey) {
      throw new Error('Failed to get public key from Freighter response')
    }

    // Get network info
    let network = 'testnet' // default
    try {
      const networkInfo = await getNetwork()
      network = networkInfo?.network || 'testnet'
      console.log('Network info:', networkInfo)
    } catch (error: unknown) {
      console.warn('Could not get network from Freighter:', error)
    }

    console.log('Freighter connection successful:', { publicKey, network })
    return {
      publicKey,
      isConnected: true,
      network
    }
  } catch (error: unknown) {
    console.error('Freighter connection error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Handle specific Freighter errors
    if (errorMessage.includes('User denied') || errorMessage.includes('denied')) {
      throw new Error('Connection cancelled by user')
    }

    if (errorMessage.includes('not installed') || errorMessage.includes('not available')) {
      throw new Error('Freighter extension not found. Please install Freighter.')
    }

    throw new Error(`Freighter connection failed: ${errorMessage}`)
  }
}

/**
 * Disconnect from Freighter wallet
 */
export async function disconnectFreighter(): Promise<void> {
  console.log('Freighter disconnect requested - user must disconnect through extension')
}
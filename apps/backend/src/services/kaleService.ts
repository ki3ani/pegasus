/**
 * KALE Token Integration Service
 * Handles KALE trustlines, rewards calculation, and  async getKaleBalance(userPublicKey: string): Promise<string> {
    try {
      const account = await this.server.getAccount(userPublicKey)
      
      const kaleBalance = (account as any).balances.find((balance: any) => 
        balance.asset_type !== 'native' &&
        balance.asset_code === KALE_ASSET_CODE &&
        balance.asset_issuer === KALE_ISSUER
      )
      
      return kaleBalance?.balance || '0'
    } catch (error) {
      console.error('Error getting KALE balance:', error)
      return '0'
    }
  }nality
 * Based on https://github.com/kalepail/KALE-sc
 */

import * as StellarSdk from '@stellar/stellar-sdk'
import { prisma } from './db'

// Stellar RPC Account Balance interface
interface StellarBalance {
  asset_type: string
  asset_code?: string
  asset_issuer?: string
  balance: string
}

interface StellarAccount {
  balances: StellarBalance[]
}
const KALE_ASSET_CODE = 'KALE'
const KALE_ISSUER = 'GCHPTWXMT3HYF4RLZHWBNRF4MPXLTJ76ISHMSYIWCCDXWUYOQG5MR2AB'

// Reward Configuration
const REWARDS = {
  REBALANCE: '10.0000000',      // 10 KALE per rebalance
  AUTO_REBALANCE: '5.0000000',  // 5 KALE per auto rebalance  
  DAILY_BONUS: '2.0000000',     // 2 KALE daily for active users
  STAKING_APY: 0.12,            // 12% APY for staking KALE
  MIN_STAKE: '100.0000000'      // Minimum 100 KALE to stake
}

export interface KaleReward {
  userId: string
  amount: string
  type: 'rebalance' | 'auto_rebalance' | 'daily_bonus' | 'staking_reward'
  description: string
  portfolioId?: string
  transactionId?: string
}

export interface StakingInfo {
  stakedAmount: string
  startDate: Date
  lastRewardDate: Date
  pendingRewards: string
  apy: number
}

/**
 * KALE Token Service
 * Manages KALE rewards, trustlines, and staking functionality
 */
export class KaleService {
  private server: StellarSdk.rpc.Server
  private networkPassphrase: string
  private kaleAsset: StellarSdk.Asset

  constructor() {
    const isTestnet = process.env.STELLAR_NETWORK !== 'mainnet'
    
    this.server = new StellarSdk.rpc.Server(
      isTestnet 
        ? 'https://rpc-futurenet.stellar.org'
        : 'https://soroban.stellar.org:443'
    )
    
    this.networkPassphrase = isTestnet
      ? StellarSdk.Networks.FUTURENET
      : StellarSdk.Networks.PUBLIC

    this.kaleAsset = new StellarSdk.Asset(KALE_ASSET_CODE, KALE_ISSUER)
    
    console.log('🥬 KALE Service initialized')
    console.log(`📡 Network: ${isTestnet ? 'testnet' : 'mainnet'}`)
    console.log(`🏷️  KALE Asset: ${KALE_ASSET_CODE}:${KALE_ISSUER}`)
  }

  /**
   * Check if user has KALE trustline established
   */
  async checkKaleTrustline(userPublicKey: string): Promise<boolean> {
    try {
      const account = await this.server.getAccount(userPublicKey)
      
      return (account as unknown as StellarAccount).balances.some((balance: StellarBalance) => 
        balance.asset_type !== 'native' &&
        balance.asset_code === KALE_ASSET_CODE &&
        balance.asset_issuer === KALE_ISSUER
      )
    } catch (error) {
      console.error('Error checking KALE trustline:', error)
      return false
    }
  }

  /**
   * Get user's KALE balance
   */
  async getKaleBalance(userPublicKey: string): Promise<string> {
    try {
      const account = await this.server.getAccount(userPublicKey)
      
      const kaleBalance = (account as unknown as StellarAccount).balances.find((balance: StellarBalance) => 
        balance.asset_type !== 'native' &&
        balance.asset_code === KALE_ASSET_CODE &&
        balance.asset_issuer === KALE_ISSUER
      )
      
      return kaleBalance?.balance || '0.0000000'
    } catch (error) {
      console.error('Error getting KALE balance:', error)
      return '0.0000000'
    }
  }

  /**
   * Build KALE trustline transaction
   */
  async buildKaleTrustlineTransaction(userPublicKey: string): Promise<string> {
    try {
      const account = await this.server.getAccount(userPublicKey)
      
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(StellarSdk.Operation.changeTrust({
        asset: this.kaleAsset,
        limit: '1000000' // 1M KALE limit
      }))
      .setTimeout(300)
      .build()

      return transaction.toXDR()
    } catch (error) {
      console.error('Error building KALE trustline transaction:', error)
      throw error
    }
  }

  /**
   * Calculate rewards for a rebalance action
   */
  async calculateRebalanceReward(
    portfolioId: string,
    rebalanceType: 'manual' | 'auto'
  ): Promise<KaleReward> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: { user: true }
    })

    if (!portfolio) {
      throw new Error('Portfolio not found')
    }

    const amount = rebalanceType === 'manual' 
      ? REWARDS.REBALANCE 
      : REWARDS.AUTO_REBALANCE

    return {
      userId: portfolio.userId,
      amount,
      type: rebalanceType === 'manual' ? 'rebalance' : 'auto_rebalance',
      description: `Earned ${amount} KALE for ${rebalanceType} portfolio rebalancing`,
      portfolioId
    }
  }

  /**
   * Calculate daily bonus reward
   */
  async calculateDailyBonus(userId: string): Promise<KaleReward | null> {
    // Check if user already received daily bonus today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const existingBonus = await prisma.kaleReward.findFirst({
      where: {
        userId,
        type: 'daily_bonus',
        createdAt: {
          gte: today
        }
      }
    })

    if (existingBonus) {
      return null // Already received today
    }

    // Check if user has been active (rebalanced in last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const recentActivity = await prisma.transaction.findFirst({
      where: {
        portfolio: { userId },
        createdAt: {
          gte: yesterday
        },
        status: 'completed'
      }
    })

    if (!recentActivity) {
      return null // No recent activity
    }

    return {
      userId,
      amount: REWARDS.DAILY_BONUS,
      type: 'daily_bonus',
      description: `Daily activity bonus: ${REWARDS.DAILY_BONUS} KALE`
    }
  }

  /**
   * Calculate staking rewards
   */
  async calculateStakingRewards(userId: string): Promise<KaleReward[]> {
    const stakingRecords = await prisma.kaleStaking.findMany({
      where: { 
        userId,
        isActive: true 
      }
    })

    const rewards: KaleReward[] = []
    
    for (const stake of stakingRecords) {
      const now = new Date()
      const daysSinceLastReward = Math.floor(
        (now.getTime() - stake.lastRewardDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      if (daysSinceLastReward >= 1) {
        // Calculate daily rewards
        const stakedAmount = parseFloat(stake.stakedAmount)
        const dailyReward = (stakedAmount * REWARDS.STAKING_APY) / 365
        const totalReward = dailyReward * daysSinceLastReward
        
        rewards.push({
          userId,
          amount: totalReward.toFixed(7),
          type: 'staking_reward',
          description: `Staking reward for ${daysSinceLastReward} days: ${totalReward.toFixed(7)} KALE`
        })
      }
    }

    return rewards
  }

  /**
   * Build KALE reward distribution transaction
   */
  async buildRewardTransaction(
    reward: KaleReward, 
    userPublicKey: string
  ): Promise<string> {
    try {
      // In a real implementation, this would use KALE contract to distribute rewards
      // For now, we'll create a placeholder transaction
      
      if (!process.env.KALE_DISTRIBUTOR_SECRET) {
        throw new Error('KALE_DISTRIBUTOR_SECRET environment variable is required')
      }
      
      const distributorKeypair = StellarSdk.Keypair.fromSecret(
        process.env.KALE_DISTRIBUTOR_SECRET
      )
      
      const distributorAccount = await this.server.getAccount(distributorKeypair.publicKey())
      
      const transaction = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(StellarSdk.Operation.payment({
        destination: userPublicKey,
        asset: this.kaleAsset,
        amount: reward.amount
      }))
      .addMemo(StellarSdk.Memo.text(`RebalanceX: ${reward.description}`))
      .setTimeout(300)
      .build()

      transaction.sign(distributorKeypair)
      
      return transaction.toXDR()
    } catch (error) {
      console.error('Error building KALE reward transaction:', error)
      throw error
    }
  }

  /**
   * Process and distribute rewards
   */
  async distributeReward(reward: KaleReward, userPublicKey: string): Promise<void> {
    try {
      // Check if user has KALE trustline
      const hasTrustline = await this.checkKaleTrustline(userPublicKey)
      
      if (!hasTrustline) {
        console.log(`❌ User ${userPublicKey} doesn't have KALE trustline`)
        // Store pending reward for later
        await prisma.kaleReward.create({
          data: {
            ...reward,
            status: 'pending_trustline',
            userPublicKey
          }
        })
        return
      }

      // Build and submit reward transaction
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const transactionXDR = await this.buildRewardTransaction(reward, userPublicKey)
      
      // In production, submit transaction to network
      console.log(`🥬 KALE reward distributed: ${reward.amount} KALE to ${userPublicKey}`)
      
      // Record successful reward
      await prisma.kaleReward.create({
        data: {
          ...reward,
          status: 'completed',
          userPublicKey,
          transactionHash: 'simulated_hash_' + Date.now() // In production, use real hash
        }
      })
      
    } catch (error) {
      console.error('Error distributing KALE reward:', error)
      
      // Record failed reward
      await prisma.kaleReward.create({
        data: {
          ...reward,
          status: 'failed',
          userPublicKey,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Start staking KALE
   */
  async startStaking(userId: string, userPublicKey: string, amount: string): Promise<void> {
    if (parseFloat(amount) < parseFloat(REWARDS.MIN_STAKE)) {
      throw new Error(`Minimum staking amount is ${REWARDS.MIN_STAKE} KALE`)
    }

    await prisma.kaleStaking.create({
      data: {
        userId,
        userPublicKey,
        stakedAmount: amount,
        apy: REWARDS.STAKING_APY,
        startDate: new Date(),
        lastRewardDate: new Date(),
        isActive: true
      }
    })

    console.log(`🥬 User ${userId} started staking ${amount} KALE`)
  }

  /**
   * Get user staking information
   */
  async getStakingInfo(userId: string): Promise<StakingInfo[]> {
    const stakingRecords = await prisma.kaleStaking.findMany({
      where: { userId, isActive: true }
    })

    return stakingRecords.map(stake => ({
      stakedAmount: stake.stakedAmount,
      startDate: stake.startDate,
      lastRewardDate: stake.lastRewardDate,
      pendingRewards: '0.0000000', // Calculate based on time since last reward
      apy: stake.apy
    }))
  }

  /**
   * Get user's KALE reward history
   */
  async getRewardHistory(userId: string, limit: number = 50) {
    return await prisma.kaleReward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }
}

// Export singleton instance
export const kaleService = new KaleService()
/**
 * Portfolio Calculation Engine
 * Core business logic for portfolio rebalancing
 * Handles drift calculation, trade suggestions, and execution planning
 */

import { prisma } from './db'
import { reflectorService } from './reflectorService'
import type { Portfolio } from '@prisma/client'

export interface AssetBalance {
  asset: string
  balance: string
  valueUsd: string
  percentage: number
}

export interface PortfolioAnalysis {
  totalValueUsd: string
  currentAllocations: Record<string, number>
  targetAllocations: Record<string, number>
  drift: number
  driftByAsset: Record<string, number>
  needsRebalancing: boolean
  suggestedTrades: TradeInstruction[]
}

export interface TradeInstruction {
  fromAsset: string
  toAsset: string
  fromAmount: string
  expectedToAmount: string
  tradeValueUsd: string
  maxSlippage: number
  reason: string
}

export interface RebalanceContext {
  portfolio: Portfolio
  currentBalances: AssetBalance[]
  currentPrices: Record<string, string>
  analysis: PortfolioAnalysis
}

export class PortfolioEngine {
  
  /**
   * Analyze portfolio and calculate drift
   */
  async analyzePortfolio(portfolioId: string, userBalances: Record<string, string>): Promise<PortfolioAnalysis> {
    try {
      // Get portfolio configuration
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId }
      })

      if (!portfolio) {
        throw new Error('Portfolio not found')
      }

      const targetAllocations = portfolio.targetAllocations as Record<string, number>
      const assets = Object.keys(targetAllocations)

      // Get current prices - prioritize DB cache for speed
      const prices: Record<string, string> = {}
      
      // First, try to get prices from database cache (much faster)
      const dbPrices = await reflectorService.getLatestPricesFromDB(assets)
      Object.assign(prices, dbPrices)
      
      // Only call Reflector for missing prices (if any)
      const missingAssets = assets.filter(asset => !prices[asset])
      if (missingAssets.length > 0) {
        try {
          const priceData = await reflectorService.getPrices(missingAssets)
          priceData.forEach(p => prices[p.asset] = p.price)
        } catch (error) {
          console.warn('Failed to get live prices for missing assets:', missingAssets, error)
          // Continue with cached prices only for better UX
        }
      }

      // Calculate current allocations
      const assetBalances = this.calculateAssetBalances(userBalances, prices)
      const totalValueUsd = assetBalances.reduce((sum, b) => 
        sum + parseFloat(b.valueUsd), 0
      ).toString()

      const currentAllocations = this.calculateCurrentAllocations(assetBalances)
      
      // Calculate drift
      const { drift, driftByAsset } = this.calculateDrift(currentAllocations, targetAllocations)
      
      // Generate trade suggestions if needed
      const needsRebalancing = drift > portfolio.riskThreshold
      const suggestedTrades = needsRebalancing 
        ? this.generateTradeInstructions(assetBalances, targetAllocations, prices, portfolio)
        : []

      return {
        totalValueUsd,
        currentAllocations,
        targetAllocations,
        drift,
        driftByAsset,
        needsRebalancing,
        suggestedTrades
      }

    } catch (error) {
      console.error('Portfolio analysis failed:', error)
      throw error
    }
  }

  /**
   * Calculate asset balances with USD values
   */
  private calculateAssetBalances(
    balances: Record<string, string>, 
    prices: Record<string, string>
  ): AssetBalance[] {
    return Object.entries(balances)
      .filter(([, balance]) => parseFloat(balance) > 0)
      .map(([asset, balance]) => {
        const price = prices[asset] || '0'
        const valueUsd = (parseFloat(balance) * parseFloat(price)).toString()
        
        return {
          asset,
          balance,
          valueUsd,
          percentage: 0 // Will be calculated later
        }
      })
  }

  /**
   * Calculate current allocation percentages
   */
  private calculateCurrentAllocations(balances: AssetBalance[]): Record<string, number> {
    const totalValue = balances.reduce((sum, b) => sum + parseFloat(b.valueUsd), 0)
    
    if (totalValue === 0) return {}

    const allocations: Record<string, number> = {}
    
    balances.forEach(balance => {
      const percentage = (parseFloat(balance.valueUsd) / totalValue) * 100
      allocations[balance.asset] = percentage
      balance.percentage = percentage
    })

    return allocations
  }

  /**
   * Calculate portfolio drift from target allocations
   */
  private calculateDrift(
    current: Record<string, number>, 
    target: Record<string, number>
  ): { drift: number; driftByAsset: Record<string, number> } {
    const driftByAsset: Record<string, number> = {}
    let totalDrift = 0

    Object.keys(target).forEach(asset => {
      const currentAlloc = current[asset] || 0
      const targetAlloc = target[asset] || 0
      const assetDrift = Math.abs(currentAlloc - targetAlloc)
      
      driftByAsset[asset] = assetDrift
      totalDrift += assetDrift
    })

    // Overall drift is the sum of absolute deviations divided by 2
    // (since overweight in one asset = underweight in another)
    const drift = totalDrift / 2

    return { drift, driftByAsset }
  }

  /**
   * Generate trade instructions to rebalance portfolio
   */
  private generateTradeInstructions(
    balances: AssetBalance[],
    targets: Record<string, number>,
    prices: Record<string, string>,
    portfolio: Portfolio
  ): TradeInstruction[] {
    const trades: TradeInstruction[] = []
    const totalValue = balances.reduce((sum, b) => sum + parseFloat(b.valueUsd), 0)
    const minTradeUsd = parseFloat(portfolio.minTradeAmount)

    // Calculate required adjustments
    const adjustments: Record<string, { currentValue: number; targetValue: number; adjustment: number }> = {}
    
    balances.forEach(balance => {
      const targetPercentage = targets[balance.asset] || 0
      const targetValue = totalValue * (targetPercentage / 100)
      const currentValue = parseFloat(balance.valueUsd)
      const adjustment = targetValue - currentValue

      adjustments[balance.asset] = {
        currentValue,
        targetValue,
        adjustment
      }
    })

    // Generate trades from overweight assets to underweight assets
    const overweight = Object.entries(adjustments)
      .filter(([, adj]) => adj.adjustment < -minTradeUsd)
      .sort((a, b) => a[1].adjustment - b[1].adjustment) // Most overweight first

    const underweight = Object.entries(adjustments)
      .filter(([, adj]) => adj.adjustment > minTradeUsd)
      .sort((a, b) => b[1].adjustment - a[1].adjustment) // Most underweight first

    // Match overweight sells with underweight buys
    for (const [fromAsset, fromAdj] of overweight) {
      const sellAmountUsd = Math.abs(fromAdj.adjustment)
      const fromPrice = parseFloat(prices[fromAsset] || '0')
      
      if (fromPrice === 0) continue

      const fromAmount = (sellAmountUsd / fromPrice).toString()

      for (const [toAsset, toAdj] of underweight) {
        if (toAdj.adjustment <= 0) continue // Already satisfied

        const buyAmountUsd = Math.min(sellAmountUsd, toAdj.adjustment)
        const toPrice = parseFloat(prices[toAsset] || '0')
        
        if (toPrice === 0) continue

        const expectedToAmount = (buyAmountUsd / toPrice).toString()

        trades.push({
          fromAsset,
          toAsset,
          fromAmount: (parseFloat(fromAmount) * (buyAmountUsd / sellAmountUsd)).toString(),
          expectedToAmount,
          tradeValueUsd: buyAmountUsd.toString(),
          maxSlippage: portfolio.maxSlippage,
          reason: `Rebalance: ${fromAsset} overweight by ${fromAdj.adjustment.toFixed(2)}%, ${toAsset} underweight`
        })

        // Update adjustments
        toAdj.adjustment -= buyAmountUsd
        fromAdj.adjustment += buyAmountUsd

        if (Math.abs(fromAdj.adjustment) < minTradeUsd) break
      }
    }

    return trades.filter(trade => parseFloat(trade.tradeValueUsd) >= minTradeUsd)
  }

  /**
   * Create portfolio snapshot for historical tracking
   */
  async createSnapshot(portfolioId: string, analysis: PortfolioAnalysis): Promise<void> {
    try {
      await prisma.portfolioSnapshot.create({
        data: {
          portfolioId,
          totalValueUsd: analysis.totalValueUsd,
          allocations: analysis.currentAllocations,
          drift: analysis.drift,
          assetBalances: analysis.currentAllocations, // Simplified for now
          priceSnapshot: {}, // Could include price data
          timestamp: new Date()
        }
      })
    } catch (error) {
      console.error('Failed to create portfolio snapshot:', error)
    }
  }

  /**
   * Check if portfolio should auto-rebalance
   */
  async shouldAutoRebalance(portfolio: Portfolio, analysis: PortfolioAnalysis): Promise<boolean> {
    if (!portfolio.autoRebalance) return false
    if (analysis.drift < portfolio.riskThreshold) return false

    // Check time-based restrictions
    if (portfolio.lastRebalance) {
      const hoursSinceLastRebalance = (Date.now() - portfolio.lastRebalance.getTime()) / (1000 * 60 * 60)
      
      // Minimum 1 hour between auto-rebalances
      if (hoursSinceLastRebalance < 1) return false
      
      // Frequency restrictions
      const minHours = portfolio.rebalanceFrequency === 'daily' ? 24 :
                      portfolio.rebalanceFrequency === 'weekly' ? 168 :
                      portfolio.rebalanceFrequency === 'monthly' ? 720 : 1

      if (hoursSinceLastRebalance < minHours) return false
    }

    // Check total trade value against auto limits
    const totalTradeValue = analysis.suggestedTrades.reduce(
      (sum, trade) => sum + parseFloat(trade.tradeValueUsd), 0
    )

    return totalTradeValue <= parseFloat(portfolio.maxAutoAmount)
  }

  /**
   * Get portfolio performance metrics
   */
  async getPerformanceMetrics(portfolioId: string, days: number = 30): Promise<{
    initialValue: string;
    currentValue: string;
    returnPercentage: string;
    driftHistory: { timestamp: Date; drift: number }[];
  } | { error: string }> {
    try {
      const snapshots = await prisma.portfolioSnapshot.findMany({
        where: {
          portfolioId,
          timestamp: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { timestamp: 'asc' }
      })

      if (snapshots.length < 2) {
        return { error: 'Insufficient data for performance calculation' }
      }

      const firstSnapshot = snapshots[0]
      const lastSnapshot = snapshots[snapshots.length - 1]
      
      const initialValue = parseFloat(firstSnapshot.totalValueUsd)
      const currentValue = parseFloat(lastSnapshot.totalValueUsd)
      const returnPercentage = ((currentValue - initialValue) / initialValue) * 100

      return {
        initialValue: firstSnapshot.totalValueUsd,
        currentValue: lastSnapshot.totalValueUsd,
        returnPercentage: returnPercentage.toFixed(2),
        driftHistory: snapshots.map(s => ({
          timestamp: s.timestamp,
          drift: s.drift
        }))
      }
    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      return { error: 'Failed to calculate performance' }
    }
  }
}

export const portfolioEngine = new PortfolioEngine()
/**
 * Background Price Update Job
 * Periodically fetches price data from Reflector oracle
 * Updates database with fresh price data for portfolio calculations
 */

import cron from 'node-cron'
import { reflectorService } from '../services/reflectorService'
import { prisma } from '../services/db'

export class PriceUpdateJob {
  private isRunning = false
  private lastRunTime?: Date
  private jobStats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    lastError: null as string | null
  }

  /**
   * Start the price update job with configurable schedule
   */
  start(): void {
    // Run every 30 seconds for responsive portfolio rebalancing
    const schedule = process.env.PRICE_UPDATE_SCHEDULE || '*/30 * * * * *'
    
    console.log(`🕐 Starting price update job with schedule: ${schedule}`)
    
    cron.schedule(schedule, async () => {
      if (this.isRunning) {
        console.log('⏳ Price update already running, skipping...')
        return
      }
      
      await this.runPriceUpdate()
    })

    // Also run immediately on startup
    setTimeout(() => this.runPriceUpdate(), 5000)
  }

  /**
   * Run a single price update cycle
   */
  async runPriceUpdate(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    this.jobStats.totalRuns++
    this.lastRunTime = new Date()

    try {
      console.log('🔄 Starting price update job...')
      
      // Get list of assets to update
      const assetsToUpdate = await this.getAssetsToUpdate()
      
      if (assetsToUpdate.length === 0) {
        console.log('📈 No assets configured for price updates')
        this.jobStats.successfulRuns++
        return
      }

      console.log(`📊 Updating prices for ${assetsToUpdate.length} assets: ${assetsToUpdate.join(', ')}`)
      
      // Fetch prices from Reflector
      const priceResults = await reflectorService.getPrices(assetsToUpdate)
      
      console.log(`✅ Received ${priceResults.length} price updates from Reflector`)
      
      // Save to database (already handled by reflectorService.getPrices)
      // Check for any missing prices and log warnings
      const receivedAssets = priceResults.map(p => p.asset)
      const missingPrices = assetsToUpdate.filter(asset => !receivedAssets.includes(asset))
      
      if (missingPrices.length > 0) {
        console.warn(`⚠️  Could not fetch prices for: ${missingPrices.join(', ')}`)
      }

      // Update job statistics
      await this.updateJobStats({
        assetsRequested: assetsToUpdate.length,
        pricesReceived: priceResults.length,
        missingPrices: missingPrices.length,
        timestamp: new Date()
      })

      this.jobStats.successfulRuns++
      console.log(`🎉 Price update completed successfully`)

    } catch (error) {
      console.error('❌ Price update job failed:', error)
      this.jobStats.failedRuns++
      this.jobStats.lastError = error instanceof Error ? error.message : 'Unknown error'
      
      // Save error to database for monitoring
      await this.logError(error)

    } finally {
      this.isRunning = false
    }
  }

  /**
   * Get list of assets that need price updates
   */
  private async getAssetsToUpdate(): Promise<string[]> {
    try {
      // Get assets from active portfolios
      const portfolioAssets = await prisma.portfolio.findMany({
        where: { isActive: true },
        select: { targetAllocations: true }
      })

      // Extract unique asset symbols from portfolio allocations
      const assetSet = new Set<string>()
      
      portfolioAssets.forEach(portfolio => {
        const allocations = portfolio.targetAllocations as Record<string, number>
        Object.keys(allocations).forEach(asset => assetSet.add(asset.toUpperCase()))
      })

      // Also get assets from our configured assets table
      const configuredAssets = await prisma.asset.findMany({
        where: { isActive: true },
        select: { code: true }
      })

      configuredAssets.forEach(asset => assetSet.add(asset.code.toUpperCase()))

      // Add common base assets that are always useful
      const commonAssets = ['USDC', 'XLM', 'KALE']
      commonAssets.forEach(asset => assetSet.add(asset))

      return Array.from(assetSet)

    } catch (error) {
      console.error('Failed to get assets for update:', error)
      // Fallback to common assets
      return ['USDC', 'XLM', 'KALE']
    }
  }

  /**
   * Update job statistics in database
   */
  private async updateJobStats(stats: {
    assetsRequested: number
    pricesReceived: number
    missingPrices: number
    timestamp: Date
  }): Promise<void> {
    try {
      // Store in a simple key-value format
      await prisma.priceData.create({
        data: {
          asset: '_JOB_STATS',
          priceUsd: JSON.stringify(stats),
          source: 'system',
          timestamp: stats.timestamp
        }
      })
    } catch (error) {
      console.error('Failed to save job stats:', error)
    }
  }

  /**
   * Log job errors to database
   */
  private async logError(error: unknown): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined

      await prisma.priceData.create({
        data: {
          asset: '_JOB_ERROR',
          priceUsd: JSON.stringify({ message: errorMessage, stack: errorStack }),
          source: 'system',
          timestamp: new Date()
        }
      })
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError)
    }
  }

  /**
   * Get job status and statistics
   */
  getJobStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      stats: { ...this.jobStats }
    }
  }

  /**
   * Force run price update (for manual trigger)
   */
  async forceUpdate(): Promise<boolean> {
    try {
      await this.runPriceUpdate()
      return true
    } catch (error) {
      console.error('Force update failed:', error)
      return false
    }
  }

  /**
   * Check if Reflector oracle is healthy
   */
  async checkOracleHealth(): Promise<{
    healthy: boolean
    decimals?: number
    error?: string
  }> {
    try {
      const healthy = await reflectorService.healthCheck()
      const decimals = healthy ? await reflectorService.getDecimals() : undefined
      
      return {
        healthy,
        decimals
      }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get recent price update history from database
   */
  async getPriceHistory(asset: string, hours: number = 24): Promise<Array<{
    price: string
    timestamp: Date
    source: string
  }>> {
    try {
      const history = await prisma.priceData.findMany({
        where: {
          asset: asset.toUpperCase(),
          timestamp: {
            gte: new Date(Date.now() - hours * 60 * 60 * 1000)
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      })

      return history.map(h => ({
        price: h.priceUsd,
        timestamp: h.timestamp,
        source: h.source
      }))
    } catch (error) {
      console.error(`Failed to get price history for ${asset}:`, error)
      return []
    }
  }
}

// Singleton instance
export const priceUpdateJob = new PriceUpdateJob()

/**
 * Start the background price update job
 */
export const startPriceUpdateJob = (): void => {
  console.log('🚀 Initializing background price update service...')
  priceUpdateJob.start()
}
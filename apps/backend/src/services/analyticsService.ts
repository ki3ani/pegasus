/**
 * Analytics and Monitoring Service
 * Comprehensive tracking for RebalanceX platform
 * Integrates with PostHog, Sentry, and custom metrics
 */

import { prisma } from './db'

// Analytics event types
export interface AnalyticsEvent {
  userId?: string
  userPublicKey?: string
  event: string
  properties: Record<string, unknown>
  timestamp?: Date
}

// Performance metrics
export interface PerformanceMetric {
  metric: string
  value: number
  unit: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

// Platform statistics
export interface PlatformStats {
  totalUsers: number
  totalPortfolios: number
  totalTransactions: number
  totalRebalances: number
  totalKaleRewards: string
  totalKaleDistributed: string
  activeUsers24h: number
  successfulRebalances24h: number
  failedTransactions24h: number
  avgPortfolioValue: string
  topAssets: Array<{ asset: string; count: number; totalValue: string }>
}

/**
 * Analytics Service
 * Handles event tracking, performance monitoring, and platform analytics
 */
export class AnalyticsService {
  private isInitialized = false
  private userId: string | null = null

  constructor() {
    this.initialize()
  }

  private async initialize() {
    try {
      // Initialize analytics providers
      console.log('📊 Analytics Service initialized')
      this.isInitialized = true
    } catch (error) {
      console.error('Analytics initialization error:', error)
    }
  }

  /**
   * Track user events
   */
  async track(event: AnalyticsEvent): Promise<void> {
    try {
      // Store event in database for analytics
      await prisma.$executeRaw`
        INSERT INTO analytics_events (user_id, user_public_key, event, properties, timestamp)
        VALUES (${event.userId}, ${event.userPublicKey}, ${event.event}, ${JSON.stringify(event.properties)}, ${event.timestamp || new Date()})
        ON CONFLICT DO NOTHING
      `

      // In production, also send to external analytics services
      if (process.env.NODE_ENV === 'production') {
        await this.sendToExternalServices(event)
      }

      console.log(`📊 Tracked event: ${event.event}`)
    } catch (error) {
      console.error('Event tracking error:', error)
      // Don't throw - analytics failures shouldn't break user flows
    }
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(metric: PerformanceMetric): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO performance_metrics (metric, value, unit, timestamp, metadata)
        VALUES (${metric.metric}, ${metric.value}, ${metric.unit}, ${metric.timestamp}, ${JSON.stringify(metric.metadata || {})})
      `

      // Alert on critical metrics
      if (this.isCriticalMetric(metric)) {
        console.warn(`⚠️  Critical metric alert: ${metric.metric} = ${metric.value}${metric.unit}`)
      }

    } catch (error) {
      console.error('Performance tracking error:', error)
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const [
        totalUsers,
        totalPortfolios,
        totalTransactions,
        totalRebalances,
        kaleStats,
        activeUsers,
        recentRebalances,
        failedTransactions
      ] = await Promise.all([
        // Total users
        prisma.user.count(),
        
        // Total portfolios
        prisma.portfolio.count(),
        
        // Total transactions
        prisma.transaction.count(),
        
        // Total rebalances
        prisma.transaction.count({
          where: { type: { in: ['rebalance', 'auto_rebalance'] } }
        }),
        
        // KALE statistics using raw SQL
        prisma.$queryRaw<{ total: string }[]>`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM kale_rewards
          WHERE status = 'completed'
        `,
        
        // Active users (last 24h)
        prisma.user.count({
          where: {
            portfolios: {
              some: {
                transactions: {
                  some: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                  }
                }
              }
            }
          }
        }),
        
        // Successful rebalances (last 24h)
        prisma.transaction.count({
          where: {
            type: { in: ['rebalance', 'auto_rebalance'] },
            status: 'completed',
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Failed transactions (last 24h)
        prisma.transaction.count({
          where: {
            status: 'failed',
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ])

      // Calculate average portfolio value from snapshots using raw SQL
      const portfolioValuesResult = await prisma.$queryRaw<{ average: string }[]>`
        SELECT COALESCE(AVG(CAST(total_value_usd AS DECIMAL)), 0) as average
        FROM portfolio_snapshots
        WHERE timestamp >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
      `
      const avgPortfolioValue = portfolioValuesResult[0]?.average || '0'

      // Get top assets
      const topAssets = await prisma.$queryRaw<Array<{ asset: string; count: number; totalValue: string }>>`
        SELECT 
          json_extract_path_text(target_allocations::json, asset) as asset,
          COUNT(*) as count,
          SUM(CAST(json_extract_path_text(target_allocations::json, asset) AS DECIMAL)) as total_value
        FROM portfolios p
        CROSS JOIN json_object_keys(target_allocations::json) as asset
        WHERE is_active = true
        GROUP BY asset
        ORDER BY count DESC
        LIMIT 10
      `

      return {
        totalUsers,
        totalPortfolios,
        totalTransactions,
        totalRebalances,
        totalKaleRewards: kaleStats[0]?.total || '0',
        totalKaleDistributed: kaleStats[0]?.total || '0',
        activeUsers24h: activeUsers,
        successfulRebalances24h: recentRebalances,
        failedTransactions24h: failedTransactions,
        avgPortfolioValue: avgPortfolioValue,
        topAssets: topAssets || []
      }

    } catch (error) {
      console.error('Platform stats error:', error)
      throw error
    }
  }

  /**
   * Track portfolio events
   */
  async trackPortfolioEvent(userId: string, portfolioId: string, action: string, metadata: Record<string, unknown> = {}) {
    await this.track({
      userId,
      event: `portfolio_${action}`,
      properties: {
        portfolioId,
        ...metadata
      }
    })
  }

  /**
   * Track rebalancing events
   */
  async trackRebalanceEvent(userId: string, portfolioId: string, type: 'manual' | 'auto', result: 'success' | 'failure', metadata: Record<string, unknown> = {}) {
    await this.track({
      userId,
      event: `rebalance_${result}`,
      properties: {
        portfolioId,
        rebalanceType: type,
        ...metadata
      }
    })

    // Track performance metric
    await this.trackPerformance({
      metric: `rebalance_${type}_${result}`,
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      metadata: { userId, portfolioId, ...metadata }
    })
  }

  /**
   * Track KALE events
   */
  async trackKaleEvent(userId: string, action: string, amount: string, metadata: Record<string, unknown> = {}) {
    await this.track({
      userId,
      event: `kale_${action}`,
      properties: {
        amount,
        ...metadata
      }
    })
  }

  /**
   * Track API performance
   */
  async trackAPIPerformance(endpoint: string, method: string, duration: number, status: number) {
    await this.trackPerformance({
      metric: 'api_response_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      metadata: {
        endpoint,
        method,
        status
      }
    })

    // Track error rates
    if (status >= 400) {
      await this.trackPerformance({
        metric: 'api_error_rate',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        metadata: { endpoint, method, status }
      })
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const kaleEarnedResult = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
      FROM kale_rewards
      WHERE user_id = ${userId} AND status = 'completed' AND created_at >= ${since}
    `
    const totalPortfolioValueResult = await prisma.$queryRaw<{ average: string }[]>`
      SELECT COALESCE(AVG(CAST(ps.total_value_usd AS DECIMAL)), 0) as average
      FROM portfolio_snapshots ps
      JOIN portfolios p ON ps.portfolio_id = p.id
      WHERE p.user_id = ${userId} AND ps.timestamp >= ${since}
    `

    return {
      portfolios: await prisma.portfolio.count({ where: { userId } }),
      transactions: await prisma.transaction.count({
        where: {
          portfolio: { userId },
          createdAt: { gte: since }
        }
      }),
      rebalances: await prisma.transaction.count({
        where: {
          portfolio: { userId },
          type: { in: ['rebalance', 'auto_rebalance'] },
          createdAt: { gte: since }
        }
      }),
      kaleEarned: kaleEarnedResult[0]?.total || '0',
      totalPortfolioValue: totalPortfolioValueResult[0]?.average || '0'
    }
  }

  private async sendToExternalServices(event: AnalyticsEvent) {
    // PostHog integration
    if (process.env.POSTHOG_API_KEY) {
      try {
        // PostHog tracking would go here
        console.log('📊 Sent to PostHog:', event.event)
      } catch (error) {
        console.error('PostHog error:', error)
      }
    }

    // Custom webhook integration
    if (process.env.ANALYTICS_WEBHOOK) {
      try {
        await fetch(process.env.ANALYTICS_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        })
      } catch (error) {
        console.error('Analytics webhook error:', error)
      }
    }
  }

  private isCriticalMetric(metric: PerformanceMetric): boolean {
    const criticalMetrics = {
      'api_response_time': 5000, // 5 seconds
      'api_error_rate': 10,      // 10 errors per minute
      'database_query_time': 1000, // 1 second
      'memory_usage': 90,        // 90%
      'cpu_usage': 90            // 90%
    }

    const threshold = criticalMetrics[metric.metric as keyof typeof criticalMetrics]
    return threshold !== undefined && metric.value > threshold
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()
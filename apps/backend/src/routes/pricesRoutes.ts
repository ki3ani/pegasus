/**
 * Price Data API Routes
 * Handles Reflector oracle integration and price data endpoints
 */

import { Router, Request } from 'express'
import type { Response, NextFunction } from 'express'
import { query, param, validationResult } from 'express-validator'
import { reflectorService } from '../services/reflectorService'
import { prisma } from '../services/db'

const router = Router()

// Public routes - no authentication required for price data

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() })
  }
  next()
}

/**
 * GET /prices
 * Get current prices for multiple assets
 */
router.get('/', [
  query('assets').notEmpty().custom((assets) => {
    const assetArray = assets.split(',')
    if (assetArray.length === 0 || assetArray.length > 20) {
      throw new Error('Must specify 1-20 assets')
    }
    return true
  })
], validateRequest, async (req: Request, res: Response) => {
  try {
    const assets = (req.query.assets as string).split(',').map(a => a.trim().toUpperCase())
    
    const prices = await reflectorService.getPrices(assets)
    
    // If some prices are missing, try database fallback
    const receivedAssets = prices.map(p => p.asset)
    const missingAssets = assets.filter(asset => !receivedAssets.includes(asset))
    
    if (missingAssets.length > 0) {
      const dbPrices = await reflectorService.getLatestPricesFromDB(missingAssets)
      
      // Add DB prices to response
      Object.entries(dbPrices).forEach(([asset, price]) => {
        prices.push({
          asset,
          price,
          timestamp: Date.now(),
          source: 'database'
        })
      })
    }

    res.json({ 
      prices,
      timestamp: Date.now(),
      source: 'reflector_with_fallback'
    })
  } catch (error) {
    console.error('Failed to fetch prices:', error)
    res.status(500).json({ error: 'Failed to fetch price data' })
  }
})

/**
 * GET /prices/:asset
 * Get current price for specific asset
 */
router.get('/:asset', [
  param('asset').notEmpty().isAlpha().isLength({ min: 2, max: 10 })
], validateRequest, async (req: Request, res: Response) => {
  try {
    const asset = req.params.asset.toUpperCase()
    
    const price = await reflectorService.getLastPrice(asset)
    
    if (!price) {
      // Try database fallback
      const dbPrices = await reflectorService.getLatestPricesFromDB([asset])
      const dbPrice = dbPrices[asset]
      
      if (dbPrice) {
        return res.json({
          asset,
          price: dbPrice,
          timestamp: Date.now(),
          source: 'database'
        })
      }
      
      return res.status(404).json({ error: 'Price not found for asset' })
    }

    res.json(price)
  } catch (error) {
    console.error(`Failed to fetch price for ${req.params.asset}:`, error)
    res.status(500).json({ error: 'Failed to fetch price data' })
  }
})

/**
 * GET /prices/:asset/twap
 * Get Time-Weighted Average Price for asset
 */
router.get('/:asset/twap', [
  param('asset').notEmpty().isAlpha().isLength({ min: 2, max: 10 }),
  query('records').optional().isInt({ min: 1, max: 50 })
], validateRequest, async (req: Request, res: Response) => {
  try {
    const asset = req.params.asset.toUpperCase()
    const records = parseInt(req.query.records as string) || 5
    
    const twap = await reflectorService.getTWAP(asset, records)
    
    if (!twap) {
      return res.status(404).json({ error: 'TWAP not available for asset' })
    }

    res.json({
      asset,
      twap,
      records,
      timestamp: Date.now(),
      source: 'reflector'
    })
  } catch (error) {
    console.error(`Failed to fetch TWAP for ${req.params.asset}:`, error)
    res.status(500).json({ error: 'Failed to fetch TWAP data' })
  }
})

/**
 * GET /prices/:baseAsset/:quoteAsset
 * Get cross-price between two assets
 */
router.get('/:baseAsset/:quoteAsset', [
  param('baseAsset').notEmpty().isAlpha().isLength({ min: 2, max: 10 }),
  param('quoteAsset').notEmpty().isAlpha().isLength({ min: 2, max: 10 })
], validateRequest, async (req: Request, res: Response) => {
  try {
    const baseAsset = req.params.baseAsset.toUpperCase()
    const quoteAsset = req.params.quoteAsset.toUpperCase()
    
    if (baseAsset === quoteAsset) {
      return res.json({
        asset: `${baseAsset}/${quoteAsset}`,
        price: '1.0',
        timestamp: Date.now(),
        source: 'calculated'
      })
    }
    
    const crossPrice = await reflectorService.getCrossPrice(baseAsset, quoteAsset)
    
    if (!crossPrice) {
      return res.status(404).json({ error: 'Cross price not available for asset pair' })
    }

    res.json(crossPrice)
  } catch (error) {
    console.error(`Failed to fetch cross price for ${req.params.baseAsset}/${req.params.quoteAsset}:`, error)
    res.status(500).json({ error: 'Failed to fetch cross price data' })
  }
})

/**
 * GET /prices/history/:asset
 * Get price history for asset from database
 */
router.get('/history/:asset', [
  param('asset').notEmpty().isAlpha().isLength({ min: 2, max: 10 }),
  query('days').optional().isInt({ min: 1, max: 365 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], validateRequest, async (req: Request, res: Response) => {
  try {
    const asset = req.params.asset.toUpperCase()
    const days = parseInt(req.query.days as string) || 7
    const limit = parseInt(req.query.limit as string) || 100
    
    const history = await prisma.priceData.findMany({
      where: {
        asset,
        timestamp: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    })

    res.json({
      asset,
      history: history.map(h => ({
        price: h.priceUsd,
        timestamp: h.timestamp,
        source: h.source,
        confidence: h.confidence
      })),
      count: history.length
    })
  } catch (error) {
    console.error(`Failed to fetch price history for ${req.params.asset}:`, error)
    res.status(500).json({ error: 'Failed to fetch price history' })
  }
})

/**
 * GET /assets
 * Get list of supported assets from Reflector
 */
router.get('/assets', async (req: Request, res: Response) => {
  try {
    const assets = await reflectorService.getSupportedAssets()
    
    // Also get assets from our database
    const dbAssets = await prisma.asset.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    })

    res.json({
      reflector: assets,
      database: dbAssets,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Failed to fetch supported assets:', error)
    res.status(500).json({ error: 'Failed to fetch supported assets' })
  }
})

/**
 * GET /oracle/health
 * Check Reflector oracle health
 */
router.get('/oracle/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await reflectorService.healthCheck()
    const decimals = await reflectorService.getDecimals()
    
    res.json({
      healthy: isHealthy,
      decimals,
      timestamp: Date.now(),
      network: process.env.STELLAR_NETWORK || 'testnet'
    })
  } catch (error) {
    console.error('Oracle health check failed:', error)
    res.status(500).json({ 
      healthy: false,
      error: 'Health check failed',
      timestamp: Date.now()
    })
  }
})

/**
 * GET /oracle/decimals
 * Get oracle decimals for price precision
 */
router.get('/oracle/decimals', async (req: Request, res: Response) => {
  try {
    const decimals = await reflectorService.getDecimals()
    
    res.json({
      decimals,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Failed to fetch oracle decimals:', error)
    res.status(500).json({ error: 'Failed to fetch oracle decimals' })
  }
})

export default router
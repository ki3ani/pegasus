/**
 * Portfolio Management Service
 * Handles API calls for portfolio operations
 */

export interface Portfolio {
  id: string
  userId: string
  name: string
  targetAllocations: Record<string, number> // { "XLM": 50, "USDC": 30, "KALE": 20 }
  riskThreshold: number
  autoRebalance: boolean
  maxAutoAmount: string
  minTradeAmount: string
  maxSlippage: number
  rebalanceFrequency: string
  isActive: boolean
  kaleStakingEnabled: boolean
  lastRebalance?: string
  createdAt: string
  updatedAt: string
}

export interface AssetBalance {
  asset: string
  balance: string
  valueUsd: string
  percentage: number
}

export interface TradeInstruction {
  fromAsset: string
  toAsset: string
  fromAmount: string
  expectedToAmount: string
  maxSlippage: number
  priority: number
}

export interface PortfolioAnalysis {
  totalValueUsd: string
  currentAllocations: Record<string, number>
  targetAllocations: Record<string, number>
  drift: number
  driftByAsset: Record<string, number>
  needsRebalancing: boolean
  suggestedTrades: TradeInstruction[]
  assetBalances: AssetBalance[]
}

export interface PriceData {
  asset: string
  price: string
  timestamp: number
  source: string
}

class PortfolioService {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Get Supabase session token
    const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession()
    const token = session?.access_token
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  }

  // Portfolio Management
  async getPortfolios(): Promise<Portfolio[]> {
    const response = await this.makeRequest<{ portfolios: Portfolio[] }>('/portfolios')
    return response.portfolios
  }

  async createPortfolio(data: {
    name: string
    targetAllocations: Record<string, number>
    riskThreshold?: number
    autoRebalance?: boolean
    maxAutoAmount?: string
    minTradeAmount?: string
    maxSlippage?: number
    rebalanceFrequency?: string
  }): Promise<Portfolio> {
    const response = await this.makeRequest<{ portfolio: Portfolio }>('/portfolios', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.portfolio
  }

  async updatePortfolio(id: string, data: Partial<Portfolio>): Promise<Portfolio> {
    const response = await this.makeRequest<{ portfolio: Portfolio }>(`/portfolios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.portfolio
  }

  async deletePortfolio(id: string): Promise<void> {
    await this.makeRequest(`/portfolios/${id}`, {
      method: 'DELETE',
    })
  }

  async getPortfolio(id: string): Promise<Portfolio> {
    const response = await this.makeRequest<{ portfolio: Portfolio }>(`/portfolios/${id}`)
    return response.portfolio
  }

  // Portfolio Analysis
  async analyzePortfolio(id: string, balances: Record<string, string>): Promise<PortfolioAnalysis> {
    const response = await this.makeRequest<{ analysis: PortfolioAnalysis }>(`/portfolios/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ balances }),
    })
    return response.analysis
  }

  async getPerformanceMetrics(id: string, days: number = 30): Promise<{
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  }> {
    const response = await this.makeRequest<{
      metrics: {
        totalReturn: number;
        annualizedReturn: number;
        volatility: number;
        sharpeRatio: number;
        maxDrawdown: number;
      }
    }>(`/portfolios/${id}/performance?days=${days}`)
    return response.metrics
  }

  async getPortfolioSnapshots(id: string, limit: number = 50): Promise<{
    id: string;
    timestamp: string;
    totalValue: number;
    assets: Record<string, number>;
  }[]> {
    const response = await this.makeRequest<{
      snapshots: {
        id: string;
        timestamp: string;
        totalValue: number;
        assets: Record<string, number>;
      }[]
    }>(`/portfolios/${id}/snapshots?limit=${limit}`)
    return response.snapshots
  }

  // Rebalancing
  async executeRebalance(id: string, trades: TradeInstruction[]): Promise<{
    success: boolean;
    executedTrades: TradeInstruction[];
    message: string;
  }> {
    const response = await this.makeRequest<{
      success: boolean;
      executedTrades: TradeInstruction[];
      message: string;
    }>(`/portfolios/${id}/rebalance`, {
      method: 'POST',
      body: JSON.stringify({
        trades,
        userConfirmed: true,
      }),
    })
    return response
  }

  async updateTransactionStatus(portfolioId: string, txId: string, data: {
    status: 'completed' | 'failed' | 'cancelled'
    stellarTxId?: string
    actualSlippage?: number
    gasFee?: string
    errorMessage?: string
  }): Promise<void> {
    await this.makeRequest(`/portfolios/${portfolioId}/transactions/${txId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Price Data
  async getPrices(assets: string[]): Promise<PriceData[]> {
    const response = await this.makeRequest<{ prices: PriceData[] }>(`/prices?assets=${assets.join(',')}`)
    return response.prices
  }

  async getPrice(asset: string): Promise<PriceData> {
    return this.makeRequest<PriceData>(`/prices/${asset}`)
  }

  async getTWAP(asset: string, records: number = 5): Promise<{ twap: string }> {
    return this.makeRequest<{ twap: string }>(`/prices/${asset}/twap?records=${records}`)
  }

  async getCrossPrice(baseAsset: string, quoteAsset: string): Promise<PriceData> {
    return this.makeRequest<PriceData>(`/prices/${baseAsset}/${quoteAsset}`)
  }

  async getPriceHistory(asset: string, days: number = 7): Promise<{
    date: string;
    price: number;
    volume: number;
  }[]> {
    const response = await this.makeRequest<{
      history: {
        date: string;
        price: number;
        volume: number;
      }[]
    }>(`/prices/history/${asset}?days=${days}`)
    return response.history
  }

  // Background Jobs
  async getJobStatus(): Promise<{
    status: string;
    lastRun: string;
    nextRun: string;
  }> {
    return this.makeRequest<{
      status: string;
      lastRun: string;
      nextRun: string;
    }>('/jobs/status')
  }

  async triggerPriceUpdate(): Promise<void> {
    await this.makeRequest('/jobs/price-update/run', {
      method: 'POST',
    })
  }

  // Utility Methods
  calculateTotalValue(balances: Record<string, string>, prices: Record<string, string>): string {
    let total = 0
    
    Object.entries(balances).forEach(([asset, balance]) => {
      const price = parseFloat(prices[asset] || '0')
      const bal = parseFloat(balance || '0')
      total += price * bal
    })

    return total.toFixed(2)
  }

  calculateCurrentAllocations(balances: Record<string, string>, prices: Record<string, string>): Record<string, number> {
    const totalValue = parseFloat(this.calculateTotalValue(balances, prices))
    const allocations: Record<string, number> = {}

    if (totalValue === 0) return allocations

    Object.entries(balances).forEach(([asset, balance]) => {
      const price = parseFloat(prices[asset] || '0')
      const bal = parseFloat(balance || '0')
      const assetValue = price * bal
      allocations[asset] = (assetValue / totalValue) * 100
    })

    return allocations
  }

  validateTargetAllocations(allocations: Record<string, number>): { valid: boolean; error?: string } {
    const total = Object.values(allocations).reduce((sum, val) => sum + val, 0)
    
    if (Math.abs(total - 100) > 0.01) {
      return { valid: false, error: 'Allocations must sum to 100%' }
    }

    const hasNegative = Object.values(allocations).some(val => val < 0)
    if (hasNegative) {
      return { valid: false, error: 'Allocations cannot be negative' }
    }

    return { valid: true }
  }
}

export const portfolioService = new PortfolioService()
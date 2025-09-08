# RebalanceX

Non-custodial portfolio rebalancing on Stellar Network with KALE rewards integration.

## 🚀 Features

- **Non-custodial**: Your keys, your funds - we never see your private keys
- **Automated Rebalancing**: Set target allocations and let the system rebalance automatically  
- **Real-time Monitoring**: Live price feeds from Reflector oracles
- **KALE Rewards**: Earn rewards for participating in rebalancing activities
- **Freighter Integration**: Seamless wallet connection with Freighter extension

## 🏗️ Architecture

This is a monorepo with the following structure:

```
rebalancex/
├── apps/
│   ├── frontend/          # React + TypeScript + Vite
│   └── backend/           # Node.js + Express + TypeScript
├── packages/
│   └── shared/            # Shared utilities
└── .github/workflows/     # CI/CD pipelines
```

## 🛠️ Tech Stack

### Frontend
- React 19 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Zustand for state management
- React Query for data fetching
- Stellar SDK + Freighter API
- Vitest for testing

### Backend
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- JWT authentication
- Socket.io for real-time updates
- Stellar SDK for blockchain operations
- Vitest for testing

### DevOps
- GitHub Actions for CI/CD
- Vercel for frontend deployment
- Railway for backend + database
- ESLint + Prettier for code quality

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd rebalancex
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp apps/backend/.env.example apps/backend/.env
   # Edit apps/backend/.env with your database and other settings
   
   # Frontend  
   cp apps/frontend/.env.example apps/frontend/.env
   # Edit apps/frontend/.env if needed
   ```

4. **Set up the database**
   ```bash
   cd apps/backend
   npx prisma generate
   npx prisma db push
   ```

5. **Run in development**
   ```bash
   # From root directory - runs both frontend and backend
   npm run dev
   
   # Or run individually:
   npm run dev:frontend  # http://localhost:3000
   npm run dev:backend   # http://localhost:3001
   ```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run frontend tests only
cd apps/frontend && npm test

# Run backend tests only  
cd apps/backend && npm test
```

## 📖 Development Phases

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Project scaffolding and monorepo setup
- [x] User authentication system
- [x] Stellar wallet generation/import
- [x] Freighter wallet integration
- [x] Basic CI/CD pipeline
- [x] Staging deployment setup

### 🔄 Phase 2: Portfolio Management (NEXT)
- [ ] Portfolio CRUD operations
- [ ] Asset selection (XLM, USDC, BTC)
- [ ] Target allocation setting
- [ ] Risk tolerance configuration

### 🔄 Phase 3: Real-time Monitoring
- [ ] Reflector oracle integration
- [ ] Price feed monitoring
- [ ] Drift detection
- [ ] WebSocket real-time updates
- [ ] Production deployment

### 🔄 Phase 4: Automated Rebalancing
- [ ] Stellar DEX integration
- [ ] Transaction preparation
- [ ] Automated rebalancing logic
- [ ] Transaction history

### 🔄 Phase 5: KALE Integration
- [ ] KALE token support
- [ ] Rewards calculation
- [ ] Staking functionality

### 🔄 Phase 6: Dashboard & Polish
- [ ] Advanced analytics
- [ ] Notification system
- [ ] Performance optimization
- [ ] Full monitoring setup

## 🔒 Security

### Environment Variables
All sensitive data is managed through environment variables. Never commit secrets to the repository.

**Required Environment Variables:**
- `JWT_SECRET` - JWT signing secret
- `DATABASE_URL` - PostgreSQL connection string
- `KALE_DISTRIBUTOR_SECRET` - Secret key for KALE token distribution (production only)
- `WALLET_ENCRYPTION_KEY` - 32-character encryption key

**Setup:**
1. Copy `.env.example` to `.env`
2. Generate secure secrets for each variable
3. Use a secure key management system in production

### Best Practices
- All API endpoints use JWT authentication
- Input validation on all requests
- SQL injection protection via Prisma ORM  
- Encrypted sensitive data storage
- Rate limiting implemented
- HTTPS-only in production

## 🌐 Deployment

### Staging
- Frontend: Vercel (staging-rebalancex.vercel.app)
- Backend: Railway staging environment
- Database: Railway PostgreSQL

### Production  
- Frontend: Vercel (rebalancex.com)
- Backend: Railway production environment
- Database: Railway PostgreSQL

## 🧑‍💻 Contributing

1. Create a feature branch from `foundation`
2. Make your changes
3. Ensure tests pass: `npm test`
4. Create a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and feature requests, please create an issue in this repository.

---

**Phase 1 Status**: ✅ **COMPLETED**
- All foundation components working
- Authentication system live  
- Wallet management functional
- CI/CD pipeline operational
- Ready for Phase 2 development

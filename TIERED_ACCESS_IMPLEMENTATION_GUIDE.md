# Tiered Access Control System - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing and deploying the comprehensive tiered access control system for AIMAS PRO. The system dynamically assigns database connections and administrator panel links based on user investment amounts with secure wallet verification.

## 🏗️ System Architecture

### Core Components

1. **Authentication Service** - Wallet verification and session management
2. **Contract Service** - Blockchain interaction and investment verification
3. **Tier Service** - Investment-based tier calculation and management
4. **Database Service** - Multi-database connection management
5. **Frontend Components** - Tier-specific UI and admin panels

### Investment Tiers

| Tier | Investment Range | Database | Admin Panel | Key Features |
|------|------------------|----------|-------------|--------------|
| **Unregistered** | $0 | `public_db` | `/public` | Basic info only |
| **Bronze** | $25 - $49.99 | `bronze_db` | `/admin/bronze` | Basic tracking, referrals |
| **Silver** | $50 - $999.99 | `silver_db` | `/admin/silver` | Binary network, analytics |
| **Gold** | $1,000 - $9,999.99 | `gold_db` | `/admin/gold` | Team management, insights |
| **Platinum** | $10,000+ | `platinum_db` | `/admin/platinum` | Full system access |

## 🚀 Installation & Setup

### Prerequisites

- Node.js 16+ 
- MongoDB 5.0+
- MetaMask or compatible Web3 wallet
- BSC network access

### Backend Setup

1. **Install Dependencies**
```bash
cd api
npm install
```

2. **Environment Configuration**
Create `.env` file:
```env
# Database Configuration
APP_URIMONGODB=mongodb://localhost:27017/
PUBLIC_DB_URI=mongodb://localhost:27017/aimas_public
BRONZE_DB_URI=mongodb://localhost:27017/aimas_bronze
SILVER_DB_URI=mongodb://localhost:27017/aimas_silver
GOLD_DB_URI=mongodb://localhost:27017/aimas_gold
PLATINUM_DB_URI=mongodb://localhost:27017/aimas_platinum

# Blockchain Configuration
APP_RED=https://bsc-dataseed.binance.org/
SC_PROXY=0x86bce12014a6c721156C536Be22DA7F30b6F33C1
REACT_APP_PRIVATE_KY=your_private_key_here

# Security Configuration
JWT_SECRET=your_super_secure_jwt_secret_here
REACT_APP_ENCR_STO=your_encryption_key_here
REACT_APP_API_KEY=your_api_key_here

# Server Configuration
PORT=8000
NODE_ENV=production
FRONTEND_URL=https://beta.aimas.pro
```

3. **Database Initialization**
```bash
npm run setup
```

4. **Start Server**
```bash
# Development
npm run dev

# Production
npm start
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install ethers@^5.7.2
```

2. **Update App.js**
Replace the existing [`App.js`](frontend/src/App.js:1) with the new tiered system:

```javascript
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import TierDashboard from './components/TierDashboards/TierDashboard';
import AdminRouter from './components/AdminPanel/AdminRouter';

const App = () => {
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  return (
    <AuthProvider>
      <div className="app">
        {isAdminRoute ? <AdminRouter /> : <TierDashboard />}
      </div>
    </AuthProvider>
  );
};

export default App;
```

3. **Add Required Components**
Create the missing components:
- [`LoadingSpinner`](frontend/src/components/Common/LoadingSpinner.js)
- [`ErrorMessage`](frontend/src/components/Common/ErrorMessage.js)
- [`AccessDenied`](frontend/src/components/Common/AccessDenied.js)
- Tier-specific dashboards and admin panels

## 🔧 Configuration

### Tier Configuration

Tiers are configured in [`TierService`](api/services/tierService.js:29). To modify:

```javascript
// Update tier thresholds
BRONZE: {
  minInvestment: 25,    // Minimum investment
  maxInvestment: 49.99, // Maximum investment
  permissions: ['view_basic', 'basic_operations'],
  features: ['basic_dashboard', 'investment_tracking']
}
```

### Database Configuration

Each tier has its own database configuration in [`DatabaseService`](api/services/databaseService.js:15):

```javascript
'bronze_db': {
  uri: process.env.BRONZE_DB_URI,
  collections: ['user_data', 'investments', 'referrals']
}
```

### Permission System

Permissions are hierarchical and defined per tier:

```javascript
const PERMISSIONS = {
  'view_basic': 'Basic dashboard access',
  'basic_operations': 'Basic CRUD operations',
  'advanced_view': 'Advanced features access',
  'all_permissions': 'Full system access'
};
```

## 🔐 Security Features

### Wallet Authentication

1. **Nonce Generation** - Unique nonce per authentication attempt
2. **Message Signing** - Cryptographic proof of wallet ownership
3. **Signature Verification** - Server-side signature validation
4. **Session Management** - JWT tokens with tier information

### Access Control

1. **Role-Based Permissions** - Granular permission system
2. **Tier-Based Access** - Investment amount verification
3. **Database Isolation** - Separate databases per tier
4. **Rate Limiting** - Tier-specific request limits
5. **Input Validation** - Comprehensive request validation

### Real-Time Verification

1. **Investment Monitoring** - Periodic blockchain verification
2. **Automatic Tier Updates** - Dynamic tier adjustments
3. **Session Validation** - Continuous token verification

## 📊 API Endpoints

### Authentication Endpoints

```
POST /api/v1/auth/request-nonce
POST /api/v1/auth/verify-wallet
POST /api/v1/auth/refresh-token
GET  /api/v1/auth/session
POST /api/v1/auth/logout
GET  /api/v1/auth/verify-investment/:wallet
```

### Tier Management Endpoints

```
GET  /api/v1/tiers/configs
GET  /api/v1/tiers/statistics
GET  /api/v1/auth/tier-info/:wallet
GET  /api/v1/auth/permissions/:wallet/:permission
```

### Database Access Endpoints

```
POST /api/v1/database/query
GET  /api/v1/database/collections
GET  /api/v1/database/stats
```

## 🧪 Testing

### Run Integration Tests

```bash
# Basic test suite
npm test

# Verbose testing
npm run test:verbose

# Test specific tier
TEST_TIER=GOLD npm test
```

### Manual Testing

1. **Connect Wallet** - Test MetaMask connection
2. **Verify Tiers** - Test different investment amounts
3. **Check Permissions** - Verify tier-specific access
4. **Database Access** - Test tier-specific queries
5. **Admin Panels** - Test tier-specific admin interfaces

## 🚢 Deployment

### Docker Deployment

1. **Update docker-compose.yml**
```yaml
services:
  aimas-api:
    build:
      context: ./api
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./api:/app
    command: node tieredIndex.js
```

2. **Deploy**
```bash
docker-compose up -d
```

### Production Considerations

1. **Environment Variables** - Secure all secrets
2. **Database Security** - Enable authentication and SSL
3. **Rate Limiting** - Configure appropriate limits
4. **Monitoring** - Set up health checks and logging
5. **Backup Strategy** - Regular database backups

## 🔄 Migration from Legacy System

### Migration Script

```bash
node scripts/migrate-to-tiered.js
```

This script will:
1. Analyze existing user data
2. Calculate appropriate tiers
3. Migrate data to tier-specific databases
4. Update user permissions

### Rollback Plan

1. **Database Backup** - Full backup before migration
2. **Legacy Compatibility** - Keep old endpoints active
3. **Gradual Migration** - Migrate users in batches
4. **Monitoring** - Track migration success rates

## 📈 Monitoring & Analytics

### Health Checks

```bash
curl http://localhost:8000/health
```

### Tier Statistics

Access tier distribution and analytics through:
- Admin dashboard
- API endpoints
- Database queries

### Performance Monitoring

1. **Response Times** - Track API performance
2. **Database Performance** - Monitor query times
3. **Authentication Success** - Track login rates
4. **Tier Distribution** - Monitor user distribution

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check wallet connection
   - Verify nonce expiration
   - Validate signature format

2. **Tier Assignment Issues**
   - Verify investment amounts
   - Check blockchain connectivity
   - Review tier configuration

3. **Database Access Errors**
   - Verify database connections
   - Check permission mappings
   - Review collection access

4. **Performance Issues**
   - Monitor rate limits
   - Check database performance
   - Review caching strategies

### Debug Mode

Enable debug logging:
```env
NODE_ENV=development
DEBUG=tiered-access:*
```

## 📚 Additional Resources

- [Architecture Documentation](docs/TIERED_ACCESS_ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Security Guidelines](docs/SECURITY.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 🤝 Support

For technical support:
- Create GitHub issues
- Contact development team
- Review documentation
- Check troubleshooting guide

---

**Version**: 2.0.0  
**Last Updated**: 2025-01-18  
**Compatibility**: Node.js 16+, MongoDB 5.0+, Web3 Compatible Wallets
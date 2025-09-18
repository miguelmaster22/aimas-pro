# Tiered Access Control System Architecture

## Overview
A comprehensive tiered access control system that dynamically assigns database connections and administrator panel links based on user investment amounts, with secure wallet verification and real-time balance checking.

## Investment Tiers Configuration

### Tier Structure
```javascript
const INVESTMENT_TIERS = {
  BRONZE: {
    minInvestment: 25,      // $25 USDT
    maxInvestment: 49.99,
    dbEndpoint: 'bronze_db',
    adminPanelUrl: '/admin/bronze',
    permissions: ['view_basic', 'basic_operations']
  },
  SILVER: {
    minInvestment: 50,      // $50 USDT
    maxInvestment: 999.99,
    dbEndpoint: 'silver_db',
    adminPanelUrl: '/admin/silver',
    permissions: ['view_basic', 'basic_operations', 'advanced_view']
  },
  GOLD: {
    minInvestment: 1000,    // $1,000 USDT
    maxInvestment: 9999.99,
    dbEndpoint: 'gold_db',
    adminPanelUrl: '/admin/gold',
    permissions: ['view_basic', 'basic_operations', 'advanced_view', 'gold_features']
  },
  PLATINUM: {
    minInvestment: 10000,   // $10,000 USDT
    maxInvestment: Infinity,
    dbEndpoint: 'platinum_db',
    adminPanelUrl: '/admin/platinum',
    permissions: ['all_permissions', 'platinum_exclusive']
  }
};
```

## System Components

### 1. Authentication Service (`/api/auth/`)
- **Wallet Verification**: Verify wallet ownership through signature verification
- **Investment Validation**: Cross-reference blockchain data for investment amounts
- **Session Management**: JWT tokens with tier information and expiration
- **Real-time Balance Check**: Periodic verification of investment status

### 2. Tier Management Service (`/api/tiers/`)
- **Tier Calculation**: Determine user tier based on total investment
- **Permission Mapping**: Map tiers to specific permissions and resources
- **Dynamic Updates**: Real-time tier updates when investments change
- **Tier History**: Track tier changes over time

### 3. Database Connection Manager (`/api/db/`)
- **Multi-Database Support**: Separate databases for each tier
- **Connection Pooling**: Efficient connection management per tier
- **Data Isolation**: Ensure tier-specific data separation
- **Failover Handling**: Backup connections for high availability

### 4. Admin Panel Router (`/admin/`)
- **Dynamic Routing**: Route users to tier-specific admin interfaces
- **Component Loading**: Load tier-appropriate UI components
- **Permission Guards**: Restrict access to unauthorized features
- **Real-time Updates**: Live tier status updates in UI

### 5. Security Layer
- **Input Validation**: Sanitize all user inputs
- **Rate Limiting**: Prevent abuse of tier verification endpoints
- **Audit Logging**: Log all tier changes and access attempts
- **Encryption**: Encrypt sensitive tier and investment data

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  wallet: String,           // Wallet address (primary key)
  currentTier: String,      // Current tier level
  totalInvestment: Number,  // Total USDT invested
  tierHistory: [{
    tier: String,
    timestamp: Date,
    investment: Number
  }],
  lastVerified: Date,       // Last balance verification
  sessionToken: String,     // Current JWT token
  permissions: [String],    // Current permissions array
  adminPanelAccess: String, // Admin panel URL
  dbEndpoint: String        // Database endpoint
}
```

### Tier Configurations Collection
```javascript
{
  _id: ObjectId,
  tierName: String,
  minInvestment: Number,
  maxInvestment: Number,
  dbEndpoint: String,
  adminPanelUrl: String,
  permissions: [String],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/connect-wallet` - Initial wallet connection
- `POST /api/auth/verify-signature` - Verify wallet ownership
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - Invalidate session

### Tier Management Endpoints
- `GET /api/tiers/current` - Get current user tier
- `POST /api/tiers/verify-investment` - Verify investment amount
- `GET /api/tiers/permissions` - Get current permissions
- `GET /api/tiers/admin-panel-url` - Get admin panel URL

### Database Access Endpoints
- `GET /api/db/connection-info` - Get tier-specific DB info
- `POST /api/db/query` - Execute tier-restricted queries
- `GET /api/db/health` - Check database connectivity

## Security Measures

### 1. Wallet Verification
```javascript
// Signature verification process
const verifyWalletOwnership = async (wallet, signature, message) => {
  const recoveredAddress = ethers.utils.verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === wallet.toLowerCase();
};
```

### 2. Investment Verification
```javascript
// Blockchain investment verification
const verifyInvestment = async (wallet) => {
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const investor = await contract.investors(wallet);
  return ethers.utils.formatEther(investor.invested);
};
```

### 3. Session Management
```javascript
// JWT token with tier information
const generateToken = (wallet, tier, permissions) => {
  return jwt.sign({
    wallet,
    tier,
    permissions,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  }, process.env.JWT_SECRET);
};
```

## Frontend Integration

### 1. Tier-Specific Components
- `<BronzeDashboard />` - Basic features for Bronze tier
- `<SilverDashboard />` - Enhanced features for Silver tier
- `<GoldDashboard />` - Advanced features for Gold tier
- `<PlatinumDashboard />` - Premium features for Platinum tier

### 2. Permission Guards
```javascript
const PermissionGuard = ({ requiredPermission, children }) => {
  const { permissions } = useAuth();
  
  if (!permissions.includes(requiredPermission)) {
    return <AccessDenied />;
  }
  
  return children;
};
```

### 3. Real-time Updates
```javascript
// WebSocket connection for real-time tier updates
const useRealTimeTier = () => {
  const [tier, setTier] = useState(null);
  
  useEffect(() => {
    const ws = new WebSocket(process.env.REACT_APP_WS_URL);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'TIER_UPDATE') {
        setTier(data.tier);
      }
    };
  }, []);
  
  return tier;
};
```

## Implementation Flow

1. **User Connects Wallet** → Verify wallet ownership
2. **Fetch Investment Data** → Query blockchain for total investment
3. **Calculate Tier** → Determine tier based on investment amount
4. **Generate Session** → Create JWT with tier and permissions
5. **Route to Admin Panel** → Redirect to tier-specific interface
6. **Load Components** → Display tier-appropriate features
7. **Real-time Monitoring** → Continuously verify investment status
8. **Update Tier** → Automatically upgrade/downgrade as needed

## Scalability Considerations

- **Horizontal Scaling**: Multiple database instances per tier
- **Caching Layer**: Redis for frequently accessed tier data
- **Load Balancing**: Distribute requests across tier-specific servers
- **Microservices**: Separate services for each tier management function
- **Event-Driven Updates**: Use message queues for tier change notifications

## Monitoring and Analytics

- **Tier Distribution**: Track user distribution across tiers
- **Investment Trends**: Monitor investment patterns and tier migrations
- **Performance Metrics**: Database query performance per tier
- **Security Alerts**: Monitor for suspicious tier manipulation attempts
- **User Behavior**: Analyze feature usage by tier level
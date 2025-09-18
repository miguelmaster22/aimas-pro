# Mongoose Model Overwrite Error Fix

## Problem
The error `OverwriteModelError: Cannot overwrite 'TierConfig' model once compiled` occurs when Mongoose models are registered multiple times in the same Node.js process.

## Root Cause
The issue happens because:
1. Services are instantiated multiple times across different modules
2. Each instantiation tries to register the same Mongoose models
3. Mongoose prevents model overwriting for data integrity

## Solution Applied

### 1. Fixed TierService Model Registration
**File**: [`api/services/tierService.js`](api/services/tierService.js:146)

```javascript
setupTierSchema() {
  // Check if models already exist to prevent OverwriteModelError
  try {
    this.TierConfig = mongoose.model('TierConfig');
    this.UserTier = mongoose.model('UserTier');
  } catch (error) {
    // Models don't exist, create them
    const tierConfigSchema = new mongoose.Schema({...});
    const userTierSchema = new mongoose.Schema({...});
    
    this.TierConfig = mongoose.model('TierConfig', tierConfigSchema);
    this.UserTier = mongoose.model('UserTier', userTierSchema);
  }
}
```

### 2. Implemented Singleton Pattern for AuthMiddleware
**File**: [`api/middleware/authMiddleware.js`](api/middleware/authMiddleware.js:8)

```javascript
class AuthMiddleware {
  constructor() {
    // Use singleton pattern to prevent multiple service instantiations
    if (!AuthMiddleware.instance) {
      this.contractService = new ContractService();
      this.tierService = new TierService();
      this.authService = new AuthService(this.contractService, this.tierService);
      AuthMiddleware.instance = this;
    }
    return AuthMiddleware.instance;
  }
}
```

## How It Works

1. **Model Check**: Before creating models, we try to retrieve existing ones using `mongoose.model('ModelName')`
2. **Error Handling**: If models don't exist, the try block throws an error, caught by the catch block
3. **Safe Creation**: Only in the catch block do we create new models with schemas
4. **Singleton Pattern**: Prevents multiple service instantiations that could cause the issue

## Testing the Fix

After applying these changes:

1. **Restart the server**:
   ```bash
   cd api
   npm start
   ```

2. **Verify no errors**:
   - Check console for successful startup
   - No OverwriteModelError should appear
   - All services should initialize properly

3. **Test API endpoints**:
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/api/v1/
   ```

## Alternative Solutions (if needed)

### Option 1: Model Factory Pattern
```javascript
const getModel = (name, schema) => {
  try {
    return mongoose.model(name);
  } catch {
    return mongoose.model(name, schema);
  }
};
```

### Option 2: Global Model Registry
```javascript
// models/index.js
const models = {};

const registerModel = (name, schema) => {
  if (!models[name]) {
    models[name] = mongoose.model(name, schema);
  }
  return models[name];
};
```

### Option 3: Mongoose Connection Separation
```javascript
const connection = mongoose.createConnection(uri);
const Model = connection.model('ModelName', schema);
```

## Prevention Tips

1. **Centralize Model Definitions**: Create models in a dedicated models directory
2. **Use Dependency Injection**: Pass model instances instead of creating them in services
3. **Implement Service Singletons**: Ensure services are instantiated only once
4. **Module Caching**: Leverage Node.js module caching for service instances

## Status
✅ **FIXED** - The Mongoose model overwrite error has been resolved with proper model registration checks and singleton pattern implementation.
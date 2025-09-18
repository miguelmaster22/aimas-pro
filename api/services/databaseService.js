/**
 * Database Service for Tiered Access Control
 * Manages multiple database connections based on user tiers
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

class DatabaseService {
  constructor() {
    this.connections = new Map();
    this.connectionPools = new Map();
    this.tierDatabases = {
      'public_db': {
        uri: process.env.PUBLIC_DB_URI || process.env.APP_URIMONGODB + "aimas_public?ssl=true&authSource=admin&retryWrites=true&w=majority",
        maxPoolSize: 5,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        collections: ['public_info', 'announcements']
      },
      'bronze_db': {
        uri: process.env.BRONZE_DB_URI || process.env.APP_URIMONGODB + "aimas_bronze?ssl=true&authSource=admin&retryWrites=true&w=majority",
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        collections: ['user_data', 'investments', 'referrals', 'basic_reports']
      },
      'silver_db': {
        uri: process.env.SILVER_DB_URI || process.env.APP_URIMONGODB + "aimas_silver?ssl=true&authSource=admin&retryWrites=true&w=majority",
        maxPoolSize: 15,
        minPoolSize: 3,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        collections: ['user_data', 'investments', 'referrals', 'binary_network', 'withdrawals', 'advanced_reports']
      },
      'gold_db': {
        uri: process.env.GOLD_DB_URI || process.env.APP_URIMONGODB + "aimas_gold?ssl=true&authSource=admin&retryWrites=true&w=majority",
        maxPoolSize: 20,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        collections: ['user_data', 'investments', 'referrals', 'binary_network', 'withdrawals', 'team_management', 'analytics', 'market_data']
      },
      'platinum_db': {
        uri: process.env.PLATINUM_DB_URI || process.env.APP_URIMONGODB + "aimas_platinum?ssl=true&authSource=admin&retryWrites=true&w=majority",
        maxPoolSize: 30,
        minPoolSize: 10,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        collections: ['user_data', 'investments', 'referrals', 'binary_network', 'withdrawals', 'team_management', 'analytics', 'market_data', 'system_config', 'audit_logs']
      }
    };
    
    this.initialized = false;
    this.healthCheckInterval = null;
  }

  /**
   * Initialize all database connections
   */
  async initialize() {
    try {
      console.log('Initializing database connections...');
      
      for (const [dbName, config] of Object.entries(this.tierDatabases)) {
        await this.createConnection(dbName, config);
      }
      
      this.initialized = true;
      this.startHealthCheck();
      console.log('All database connections initialized successfully');
    } catch (error) {
      console.error('Error initializing database connections:', error);
      throw error;
    }
  }

  /**
   * Create a database connection for a specific tier
   * @param {string} dbName - Database name
   * @param {Object} config - Database configuration
   */
  async createConnection(dbName, config) {
    try {
      // Create Mongoose connection with modern MongoDB driver options
      const mongooseConnection = await mongoose.createConnection(config.uri, {
        maxPoolSize: config.maxPoolSize,
        minPoolSize: config.minPoolSize,
        maxIdleTimeMS: config.maxIdleTimeMS,
        serverSelectionTimeoutMS: config.serverSelectionTimeoutMS,
        bufferCommands: false
        // Removed deprecated bufferMaxEntries option
      });

      // Create MongoDB native client for advanced operations
      const mongoClient = new MongoClient(config.uri, {
        maxPoolSize: config.maxPoolSize,
        minPoolSize: config.minPoolSize,
        maxIdleTimeMS: config.maxIdleTimeMS,
        serverSelectionTimeoutMS: config.serverSelectionTimeoutMS
      });

      await mongoClient.connect();

      this.connections.set(dbName, {
        mongoose: mongooseConnection,
        client: mongoClient,
        config: config,
        status: 'connected',
        lastHealthCheck: new Date(),
        connectionCount: 0
      });

      console.log(`Database connection established for ${dbName}`);
    } catch (error) {
      console.error(`Error creating connection for ${dbName}:`, error);
      throw error;
    }
  }

  /**
   * Get database connection for a specific tier
   * @param {string} dbEndpoint - Database endpoint identifier
   * @returns {Object} - Database connection object
   */
  getConnection(dbEndpoint) {
    if (!this.initialized) {
      throw new Error('Database service not initialized');
    }

    const connection = this.connections.get(dbEndpoint);
    if (!connection) {
      throw new Error(`Database connection not found for endpoint: ${dbEndpoint}`);
    }

    if (connection.status !== 'connected') {
      throw new Error(`Database connection not available for endpoint: ${dbEndpoint}`);
    }

    // Increment connection usage counter
    connection.connectionCount++;
    
    return connection;
  }

  /**
   * Execute query with tier-specific database
   * @param {string} dbEndpoint - Database endpoint
   * @param {string} collection - Collection name
   * @param {string} operation - Operation type (find, insert, update, delete)
   * @param {Object} query - Query parameters
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - Query result
   */
  async executeQuery(dbEndpoint, collection, operation, query = {}, options = {}) {
    try {
      const connection = this.getConnection(dbEndpoint);
      
      // Verify collection access
      if (!this.hasCollectionAccess(dbEndpoint, collection)) {
        throw new Error(`Access denied to collection '${collection}' for tier '${dbEndpoint}'`);
      }

      const db = connection.client.db();
      const coll = db.collection(collection);

      let result;
      switch (operation.toLowerCase()) {
        case 'find':
          result = await coll.find(query, options).toArray();
          break;
        case 'findone':
          result = await coll.findOne(query, options);
          break;
        case 'insert':
          result = await coll.insertOne(query, options);
          break;
        case 'insertmany':
          result = await coll.insertMany(query, options);
          break;
        case 'update':
          result = await coll.updateOne(query.filter, query.update, options);
          break;
        case 'updatemany':
          result = await coll.updateMany(query.filter, query.update, options);
          break;
        case 'delete':
          result = await coll.deleteOne(query, options);
          break;
        case 'deletemany':
          result = await coll.deleteMany(query, options);
          break;
        case 'aggregate':
          result = await coll.aggregate(query, options).toArray();
          break;
        case 'count':
          result = await coll.countDocuments(query, options);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      return result;
    } catch (error) {
      console.error(`Database query error for ${dbEndpoint}:`, error);
      throw error;
    }
  }

  /**
   * Check if tier has access to specific collection
   * @param {string} dbEndpoint - Database endpoint
   * @param {string} collection - Collection name
   * @returns {boolean} - Access permission
   */
  hasCollectionAccess(dbEndpoint, collection) {
    const dbConfig = this.tierDatabases[dbEndpoint];
    if (!dbConfig) {
      return false;
    }

    return dbConfig.collections.includes(collection);
  }

  /**
   * Get available collections for a tier
   * @param {string} dbEndpoint - Database endpoint
   * @returns {Array} - Array of available collections
   */
  getAvailableCollections(dbEndpoint) {
    const dbConfig = this.tierDatabases[dbEndpoint];
    return dbConfig ? dbConfig.collections : [];
  }

  /**
   * Create Mongoose model for specific tier database
   * @param {string} dbEndpoint - Database endpoint
   * @param {string} modelName - Model name
   * @param {Object} schema - Mongoose schema
   * @returns {Model} - Mongoose model
   */
  createModel(dbEndpoint, modelName, schema) {
    const connection = this.getConnection(dbEndpoint);
    return connection.mongoose.model(modelName, schema);
  }

  /**
   * Migrate data between tier databases
   * @param {string} wallet - User wallet address
   * @param {string} fromTier - Source tier database
   * @param {string} toTier - Destination tier database
   * @returns {Promise<boolean>} - Migration success status
   */
  async migrateUserData(wallet, fromTier, toTier) {
    try {
      const fromConnection = this.getConnection(fromTier);
      const toConnection = this.getConnection(toTier);

      const fromDb = fromConnection.client.db();
      const toDb = toConnection.client.db();

      // Get common collections between tiers
      const fromCollections = this.getAvailableCollections(fromTier);
      const toCollections = this.getAvailableCollections(toTier);
      const commonCollections = fromCollections.filter(col => toCollections.includes(col));

      // Migrate data for each common collection
      for (const collectionName of commonCollections) {
        const fromColl = fromDb.collection(collectionName);
        const toColl = toDb.collection(collectionName);

        // Find user data in source collection
        const userData = await fromColl.find({ wallet: wallet.toLowerCase() }).toArray();

        if (userData.length > 0) {
          // Insert data into destination collection
          await toColl.insertMany(userData);
          
          // Remove data from source collection
          await fromColl.deleteMany({ wallet: wallet.toLowerCase() });
        }
      }

      console.log(`Data migration completed for wallet ${wallet} from ${fromTier} to ${toTier}`);
      return true;
    } catch (error) {
      console.error(`Data migration failed for wallet ${wallet}:`, error);
      return false;
    }
  }

  /**
   * Get database statistics
   * @param {string} dbEndpoint - Database endpoint
   * @returns {Promise<Object>} - Database statistics
   */
  async getDatabaseStats(dbEndpoint) {
    try {
      const connection = this.getConnection(dbEndpoint);
      const db = connection.client.db();
      
      const stats = await db.stats();
      const collections = await db.listCollections().toArray();
      
      const collectionStats = {};
      for (const collection of collections) {
        const collStats = await db.collection(collection.name).stats();
        collectionStats[collection.name] = {
          count: collStats.count,
          size: collStats.size,
          avgObjSize: collStats.avgObjSize
        };
      }

      return {
        database: stats.db,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        collectionDetails: collectionStats,
        connectionCount: connection.connectionCount,
        lastHealthCheck: connection.lastHealthCheck
      };
    } catch (error) {
      console.error(`Error getting database stats for ${dbEndpoint}:`, error);
      return null;
    }
  }

  /**
   * Perform health check on all database connections
   */
  async performHealthCheck() {
    const healthStatus = {};

    for (const [dbName, connection] of this.connections.entries()) {
      try {
        // Test Mongoose connection
        const mongooseStatus = connection.mongoose.readyState;
        
        // Test MongoDB client connection
        await connection.client.db().admin().ping();
        
        connection.status = 'connected';
        connection.lastHealthCheck = new Date();
        
        healthStatus[dbName] = {
          status: 'healthy',
          mongooseState: mongooseStatus,
          lastCheck: connection.lastHealthCheck,
          connectionCount: connection.connectionCount
        };
      } catch (error) {
        connection.status = 'disconnected';
        healthStatus[dbName] = {
          status: 'unhealthy',
          error: error.message,
          lastCheck: new Date()
        };
        
        console.error(`Health check failed for ${dbName}:`, error);
        
        // Attempt to reconnect
        try {
          await this.reconnectDatabase(dbName);
        } catch (reconnectError) {
          console.error(`Reconnection failed for ${dbName}:`, reconnectError);
        }
      }
    }

    return healthStatus;
  }

  /**
   * Reconnect to a specific database
   * @param {string} dbName - Database name
   */
  async reconnectDatabase(dbName) {
    const connection = this.connections.get(dbName);
    if (!connection) {
      throw new Error(`Connection not found for ${dbName}`);
    }

    try {
      // Close existing connections
      await connection.mongoose.close();
      await connection.client.close();

      // Create new connections
      await this.createConnection(dbName, connection.config);
      
      console.log(`Successfully reconnected to ${dbName}`);
    } catch (error) {
      console.error(`Failed to reconnect to ${dbName}:`, error);
      throw error;
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop health checks
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Close all database connections
   */
  async closeAllConnections() {
    try {
      this.stopHealthCheck();

      for (const [dbName, connection] of this.connections.entries()) {
        await connection.mongoose.close();
        await connection.client.close();
        console.log(`Closed connection for ${dbName}`);
      }

      this.connections.clear();
      this.initialized = false;
      
      console.log('All database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
      throw error;
    }
  }

  /**
   * Get connection status for all databases
   * @returns {Object} - Connection status for all databases
   */
  getConnectionStatus() {
    const status = {};
    
    for (const [dbName, connection] of this.connections.entries()) {
      status[dbName] = {
        status: connection.status,
        lastHealthCheck: connection.lastHealthCheck,
        connectionCount: connection.connectionCount,
        mongooseState: connection.mongoose.readyState
      };
    }

    return status;
  }

  /**
   * Execute transaction across multiple collections
   * @param {string} dbEndpoint - Database endpoint
   * @param {Array} operations - Array of operations to execute
   * @returns {Promise<any>} - Transaction result
   */
  async executeTransaction(dbEndpoint, operations) {
    const connection = this.getConnection(dbEndpoint);
    const session = connection.client.startSession();

    try {
      const result = await session.withTransaction(async () => {
        const db = connection.client.db();
        const results = [];

        for (const operation of operations) {
          const collection = db.collection(operation.collection);
          let opResult;

          switch (operation.type) {
            case 'insert':
              opResult = await collection.insertOne(operation.data, { session });
              break;
            case 'update':
              opResult = await collection.updateOne(operation.filter, operation.update, { session });
              break;
            case 'delete':
              opResult = await collection.deleteOne(operation.filter, { session });
              break;
            default:
              throw new Error(`Unsupported transaction operation: ${operation.type}`);
          }

          results.push(opResult);
        }

        return results;
      });

      return result;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

module.exports = DatabaseService;
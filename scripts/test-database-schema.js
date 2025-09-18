#!/usr/bin/env node

// Test script to verify database schema and connection

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'dc_management',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  logging: console.log,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection and schema...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Check if servers table exists
    const [results] = await sequelize.query("SHOW TABLES LIKE 'servers'");
    if (results.length === 0) {
      console.log('❌ Servers table does not exist');
      return;
    }
    console.log('✅ Servers table exists');
    
    // Check servers table structure
    const [columns] = await sequelize.query("DESCRIBE servers");
    console.log('📊 Servers table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Check for new baremetal fields
    const newFields = ['pool_type', 'pool_id', 'monitoring_enabled', 'packages_installed'];
    const existingFields = columns.map(col => col.Field);
    
    console.log('\n🔧 Checking for baremetal fields:');
    newFields.forEach(field => {
      if (existingFields.includes(field)) {
        console.log(`✅ ${field} exists`);
      } else {
        console.log(`❌ ${field} missing - need to run migration`);
      }
    });
    
    // Test a simple query
    const [servers] = await sequelize.query("SELECT COUNT(*) as count FROM servers");
    console.log(`\n📈 Current servers count: ${servers[0].count}`);
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

testDatabase();
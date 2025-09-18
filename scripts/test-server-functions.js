#!/usr/bin/env node

// Test script for server functions (Assign Pool, Setup Monitoring, Health Check)

const axios = require('axios');
require('dotenv').config();

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your_jwt_token_here';

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testServerFunctions() {
  console.log('🧪 Testing Server Functions...');
  console.log('================================');
  
  try {
    // Test 1: Get available pools
    console.log('\n1️⃣ Testing Get Available Pools...');
    try {
      const poolsResponse = await api.get('/api/servers/pools/available');
      console.log('✅ Available pools:', poolsResponse.data);
    } catch (error) {
      console.log('❌ Get pools failed:', error.response?.data || error.message);
    }

    // Test 2: Get servers
    console.log('\n2️⃣ Testing Get Servers...');
    let servers = [];
    try {
      const serversResponse = await api.get('/api/servers');
      servers = serversResponse.data.data || [];
      console.log(`✅ Found ${servers.length} servers`);
      if (servers.length > 0) {
        console.log('📋 Server list:');
        servers.forEach(server => {
          console.log(`  - ${server.hostname} (${server.ipAddress}) - Pool: ${server.poolType || 'none'}`);
        });
      }
    } catch (error) {
      console.log('❌ Get servers failed:', error.response?.data || error.message);
      return;
    }

    if (servers.length === 0) {
      console.log('⚠️ No servers found. Please add a server first.');
      return;
    }

    const testServer = servers[0];
    console.log(`\n🎯 Using test server: ${testServer.hostname} (ID: ${testServer.id})`);

    // Test 3: Health Check
    console.log('\n3️⃣ Testing Health Check...');
    try {
      const healthResponse = await api.post(`/api/servers/${testServer.id}/health-check`);
      console.log('✅ Health check successful:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.response?.data || error.message);
    }

    // Test 4: Assign Pool (if pools available)
    console.log('\n4️⃣ Testing Assign Pool...');
    try {
      const poolsResponse = await api.get('/api/servers/pools/available');
      const pools = poolsResponse.data.data;
      
      if (pools.vmPools && pools.vmPools.length > 0) {
        const testPool = pools.vmPools[0];
        console.log(`📦 Assigning to VM pool: ${testPool.name} (ID: ${testPool.id})`);
        
        const assignResponse = await api.post(`/api/servers/${testServer.id}/assign-pool`, {
          poolType: 'vm',
          poolId: testPool.id
        });
        console.log('✅ Pool assignment successful:', assignResponse.data);
      } else if (pools.k8sPools && pools.k8sPools.length > 0) {
        const testPool = pools.k8sPools[0];
        console.log(`📦 Assigning to K8s pool: ${testPool.name} (ID: ${testPool.id})`);
        
        const assignResponse = await api.post(`/api/servers/${testServer.id}/assign-pool`, {
          poolType: 'k8s',
          poolId: testPool.id
        });
        console.log('✅ Pool assignment successful:', assignResponse.data);
      } else {
        console.log('⚠️ No pools available for assignment');
      }
    } catch (error) {
      console.log('❌ Pool assignment failed:', error.response?.data || error.message);
    }

    // Test 5: Setup Monitoring
    console.log('\n5️⃣ Testing Setup Monitoring...');
    try {
      const monitoringResponse = await api.post(`/api/servers/${testServer.id}/setup-monitoring`, {
        packages: ['prometheus', 'node-exporter']
      });
      console.log('✅ Monitoring setup successful:', monitoringResponse.data);
    } catch (error) {
      console.log('❌ Monitoring setup failed:', error.response?.data || error.message);
    }

    // Test 6: Verify server updates
    console.log('\n6️⃣ Verifying Server Updates...');
    try {
      const updatedServerResponse = await api.get(`/api/servers/${testServer.id}`);
      const updatedServer = updatedServerResponse.data.data;
      console.log('✅ Server updated successfully:');
      console.log(`  - Pool Type: ${updatedServer.poolType}`);
      console.log(`  - Pool ID: ${updatedServer.poolId}`);
      console.log(`  - Monitoring Enabled: ${updatedServer.monitoringEnabled}`);
      console.log(`  - Packages Installed: ${JSON.stringify(updatedServer.packagesInstalled)}`);
      console.log(`  - Health Status: ${updatedServer.healthStatus}`);
    } catch (error) {
      console.log('❌ Server verification failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Helper function to get auth token (you'll need to implement this)
async function getAuthToken() {
  try {
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin' // Change this to your actual admin password
    });
    return loginResponse.data.token;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🔐 Getting authentication token...');
  
  if (AUTH_TOKEN === 'your_jwt_token_here') {
    const token = await getAuthToken();
    if (token) {
      api.defaults.headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Authentication successful');
    } else {
      console.log('❌ Authentication failed. Please set AUTH_TOKEN environment variable.');
      return;
    }
  } else {
    console.log('✅ Using provided auth token');
  }

  await testServerFunctions();
}

main().catch(console.error);
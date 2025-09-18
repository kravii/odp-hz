const express = require('express');
const { K8sPool, K8sNode, Server, Namespace, User } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/kubernetes/pools
// @desc    Get all K8s pools
// @access  Private
router.get('/pools', auth, async (req, res) => {
  try {
    const pools = await K8sPool.findAll({
      include: [
        { model: Server, as: 'servers', through: { attributes: [] } },
        { model: K8sNode, as: 'nodes' },
        { model: Namespace, as: 'namespaces' }
      ],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      count: pools.length,
      data: pools
    });
  } catch (error) {
    logger.error('Get K8s pools error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/kubernetes/pools/:id
// @desc    Get K8s pool by ID
// @access  Private
router.get('/pools/:id', auth, async (req, res) => {
  try {
    const pool = await K8sPool.findByPk(req.params.id, {
      include: [
        { model: Server, as: 'servers', through: { attributes: [] } },
        { model: K8sNode, as: 'nodes' },
        { model: Namespace, as: 'namespaces' }
      ]
    });

    if (!pool) {
      return res.status(404).json({ error: 'K8s pool not found' });
    }

    res.json({
      success: true,
      data: pool
    });
  } catch (error) {
    logger.error('Get K8s pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/kubernetes/pools
// @desc    Create new K8s pool
// @access  Admin
router.post('/pools', adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      clusterName,
      kubernetesVersion = '1.28.0',
      masterNodes = 3,
      serverIds = []
    } = req.body;

    // Validate required fields
    if (!name || !clusterName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if pool name already exists
    const existingPool = await K8sPool.findOne({
      where: { $or: [{ name }, { clusterName }] }
    });

    if (existingPool) {
      return res.status(400).json({ error: 'Pool name or cluster name already exists' });
    }

    // Get servers
    const servers = await Server.findAll({
      where: { id: serverIds }
    });

    if (servers.length === 0) {
      return res.status(400).json({ error: 'No servers provided' });
    }

    // Calculate total resources
    const totalCpu = servers.reduce((sum, server) => sum + server.totalCpu, 0);
    const totalMemory = servers.reduce((sum, server) => sum + server.totalMemory, 0);
    const totalStorage = servers.reduce((sum, server) => sum + server.totalStorage, 0);

    // Create K8s pool
    const pool = await K8sPool.create({
      name,
      description,
      clusterName,
      kubernetesVersion,
      totalCpu,
      totalMemory,
      totalStorage,
      masterNodes,
      workerNodes: servers.length - masterNodes,
      status: 'provisioning'
    });

    // Associate servers with pool
    await pool.setServers(servers);

    // Update server allocated resources
    for (const server of servers) {
      await server.update({
        allocatedCpu: server.totalCpu,
        allocatedMemory: server.totalMemory,
        allocatedStorage: server.totalStorage
      });
    }

    logger.info(`K8s pool created: ${name} with ${servers.length} servers`);

    // TODO: Trigger K8s cluster provisioning
    // This would involve calling the K8s provisioning service

    res.status(201).json({
      success: true,
      data: pool
    });
  } catch (error) {
    logger.error('Create K8s pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/kubernetes/pools/:id
// @desc    Update K8s pool
// @access  Admin
router.put('/pools/:id', adminAuth, async (req, res) => {
  try {
    const pool = await K8sPool.findByPk(req.params.id);

    if (!pool) {
      return res.status(404).json({ error: 'K8s pool not found' });
    }

    const {
      name,
      description,
      kubernetesVersion,
      status,
      metadata
    } = req.body;

    await pool.update({
      name: name || pool.name,
      description: description || pool.description,
      kubernetesVersion: kubernetesVersion || pool.kubernetesVersion,
      status: status || pool.status,
      metadata: metadata || pool.metadata
    });

    logger.info(`K8s pool updated: ${pool.name}`);

    res.json({
      success: true,
      data: pool
    });
  } catch (error) {
    logger.error('Update K8s pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/kubernetes/pools/:id
// @desc    Delete K8s pool
// @access  Admin
router.delete('/pools/:id', adminAuth, async (req, res) => {
  try {
    const pool = await K8sPool.findByPk(req.params.id);

    if (!pool) {
      return res.status(404).json({ error: 'K8s pool not found' });
    }

    // Check if pool has namespaces
    const namespaceCount = await pool.countNamespaces();
    if (namespaceCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete pool with active namespaces' 
      });
    }

    // Get associated servers
    const servers = await pool.getServers();

    // Deallocate resources from servers
    for (const server of servers) {
      await server.update({
        allocatedCpu: 0,
        allocatedMemory: 0,
        allocatedStorage: 0
      });
    }

    await pool.destroy();

    logger.info(`K8s pool deleted: ${pool.name}`);

    res.json({
      success: true,
      message: 'K8s pool deleted successfully'
    });
  } catch (error) {
    logger.error('Delete K8s pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/kubernetes/pools/:id/add-server
// @desc    Add server to K8s pool
// @access  Admin
router.post('/pools/:id/add-server', adminAuth, async (req, res) => {
  try {
    const { serverId } = req.body;
    const pool = await K8sPool.findByPk(req.params.id);
    const server = await Server.findByPk(serverId);

    if (!pool) {
      return res.status(404).json({ error: 'K8s pool not found' });
    }

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Add server to pool
    await pool.addServer(server);

    // Update pool resources
    await pool.update({
      totalCpu: pool.totalCpu + server.totalCpu,
      totalMemory: pool.totalMemory + server.totalMemory,
      totalStorage: pool.totalStorage + server.totalStorage,
      workerNodes: pool.workerNodes + 1
    });

    // Allocate server resources
    await server.update({
      allocatedCpu: server.totalCpu,
      allocatedMemory: server.totalMemory,
      allocatedStorage: server.totalStorage
    });

    logger.info(`Server ${server.hostname} added to K8s pool ${pool.name}`);

    res.json({
      success: true,
      message: 'Server added to pool successfully'
    });
  } catch (error) {
    logger.error('Add server to K8s pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/kubernetes/pools/:id/remove-server
// @desc    Remove server from K8s pool
// @access  Admin
router.post('/pools/:id/remove-server', adminAuth, async (req, res) => {
  try {
    const { serverId } = req.body;
    const pool = await K8sPool.findByPk(req.params.id);
    const server = await Server.findByPk(serverId);

    if (!pool) {
      return res.status(404).json({ error: 'K8s pool not found' });
    }

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if server has K8s nodes
    const nodeCount = await server.countK8sNodes();
    if (nodeCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot remove server with active K8s nodes' 
      });
    }

    // Remove server from pool
    await pool.removeServer(server);

    // Update pool resources
    await pool.update({
      totalCpu: pool.totalCpu - server.totalCpu,
      totalMemory: pool.totalMemory - server.totalMemory,
      totalStorage: pool.totalStorage - server.totalStorage,
      workerNodes: pool.workerNodes - 1
    });

    // Deallocate server resources
    await server.update({
      allocatedCpu: 0,
      allocatedMemory: 0,
      allocatedStorage: 0
    });

    logger.info(`Server ${server.hostname} removed from K8s pool ${pool.name}`);

    res.json({
      success: true,
      message: 'Server removed from pool successfully'
    });
  } catch (error) {
    logger.error('Remove server from K8s pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/kubernetes/nodes
// @desc    Get all K8s nodes
// @access  Private
router.get('/nodes', auth, async (req, res) => {
  try {
    const { poolId, role, status } = req.query;
    const whereClause = {};

    if (poolId) whereClause.poolId = poolId;
    if (role) whereClause.role = role;
    if (status) whereClause.status = status;

    const nodes = await K8sNode.findAll({
      where: whereClause,
      include: [
        { model: Server, as: 'server', attributes: ['hostname', 'ipAddress'] },
        { model: K8sPool, as: 'pool', attributes: ['name', 'clusterName'] }
      ],
      order: [['nodeName', 'ASC']]
    });

    res.json({
      success: true,
      count: nodes.length,
      data: nodes
    });
  } catch (error) {
    logger.error('Get K8s nodes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/kubernetes/nodes/:id
// @desc    Get K8s node by ID
// @access  Private
router.get('/nodes/:id', auth, async (req, res) => {
  try {
    const node = await K8sNode.findByPk(req.params.id, {
      include: [
        { model: Server, as: 'server' },
        { model: K8sPool, as: 'pool' }
      ]
    });

    if (!node) {
      return res.status(404).json({ error: 'K8s node not found' });
    }

    res.json({
      success: true,
      data: node
    });
  } catch (error) {
    logger.error('Get K8s node error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
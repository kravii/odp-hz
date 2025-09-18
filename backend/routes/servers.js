const express = require('express');
const { Server, VMPool, K8sPool } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/servers
// @desc    Get all servers
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const servers = await Server.findAll({
      include: [
        { model: VMPool, as: 'vmPools', through: { attributes: [] } },
        { model: K8sPool, as: 'k8sPools', through: { attributes: [] } }
      ],
      order: [['hostname', 'ASC']]
    });

    res.json({
      success: true,
      count: servers.length,
      data: servers
    });
  } catch (error) {
    logger.error('Get servers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/servers/:id
// @desc    Get server by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id, {
      include: [
        { model: VMPool, as: 'vmPools', through: { attributes: [] } },
        { model: K8sPool, as: 'k8sPools', through: { attributes: [] } }
      ]
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json({
      success: true,
      data: server
    });
  } catch (error) {
    logger.error('Get server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/servers
// @desc    Add new server
// @access  Admin
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      hostname,
      ipAddress,
      totalCpu,
      totalMemory,
      totalStorage,
      osVersion = 'Rocky Linux 9',
      sshPort = 22,
      sshUser = 'root'
    } = req.body;

    // Validate required fields
    if (!hostname || !ipAddress || !totalCpu || !totalMemory || !totalStorage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if server already exists
    const existingServer = await Server.findOne({
      where: {
        $or: [{ hostname }, { ipAddress }]
      }
    });

    if (existingServer) {
      return res.status(400).json({ error: 'Server already exists' });
    }

    const server = await Server.create({
      hostname,
      ipAddress,
      totalCpu,
      totalMemory,
      totalStorage,
      osVersion,
      sshPort,
      sshUser,
      status: 'active',
      healthStatus: 'healthy'
    });

    logger.info(`Server added: ${hostname} (${ipAddress})`);

    res.status(201).json({
      success: true,
      data: server
    });
  } catch (error) {
    logger.error('Add server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/servers/:id
// @desc    Update server
// @access  Admin
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const {
      hostname,
      ipAddress,
      totalCpu,
      totalMemory,
      totalStorage,
      status,
      healthStatus,
      metadata
    } = req.body;

    await server.update({
      hostname: hostname || server.hostname,
      ipAddress: ipAddress || server.ipAddress,
      totalCpu: totalCpu || server.totalCpu,
      totalMemory: totalMemory || server.totalMemory,
      totalStorage: totalStorage || server.totalStorage,
      status: status || server.status,
      healthStatus: healthStatus || server.healthStatus,
      metadata: metadata || server.metadata
    });

    logger.info(`Server updated: ${server.hostname}`);

    res.json({
      success: true,
      data: server
    });
  } catch (error) {
    logger.error('Update server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/servers/:id
// @desc    Delete server
// @access  Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if server has VMs or K8s nodes
    const vmCount = await server.countVms();
    const k8sNodeCount = await server.countK8sNodes();

    if (vmCount > 0 || k8sNodeCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete server with active VMs or K8s nodes' 
      });
    }

    await server.destroy();

    logger.info(`Server deleted: ${server.hostname}`);

    res.json({
      success: true,
      message: 'Server deleted successfully'
    });
  } catch (error) {
    logger.error('Delete server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/servers/:id/health-check
// @desc    Perform health check on server
// @access  Private
router.post('/:id/health-check', auth, async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // TODO: Implement actual health check logic
    // This would involve SSH connection and system checks
    const healthData = {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      storageUsage: Math.random() * 100,
      uptime: Math.floor(Math.random() * 86400 * 30), // Random uptime
      temperature: Math.random() * 20 + 40 // Random temperature
    };

    const healthStatus = healthData.cpuUsage > 90 || healthData.memoryUsage > 90 
      ? 'critical' 
      : healthData.cpuUsage > 70 || healthData.memoryUsage > 70 
        ? 'warning' 
        : 'healthy';

    await server.update({
      healthStatus,
      lastHealthCheck: new Date(),
      metadata: { ...server.metadata, healthData }
    });

    logger.info(`Health check performed on: ${server.hostname}`);

    res.json({
      success: true,
      data: {
        server: server.hostname,
        healthStatus,
        healthData
      }
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
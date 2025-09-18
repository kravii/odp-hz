const express = require('express');
const { VM, Server, VMPool, User } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/vms
// @desc    Get all VMs
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, poolId, userId } = req.query;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (poolId) whereClause.poolId = poolId;
    if (userId && req.user.role !== 'admin') whereClause.createdBy = req.user.id;

    const vms = await VM.findAll({
      where: whereClause,
      include: [
        { model: Server, as: 'server', attributes: ['hostname', 'ipAddress'] },
        { model: User, as: 'creator', attributes: ['username', 'firstName', 'lastName'] }
      ],
      order: [['hostname', 'ASC']]
    });

    res.json({
      success: true,
      count: vms.length,
      data: vms
    });
  } catch (error) {
    logger.error('Get VMs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/vms/:id
// @desc    Get VM by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const vm = await VM.findByPk(req.params.id, {
      include: [
        { model: Server, as: 'server' },
        { model: User, as: 'creator', attributes: ['username', 'firstName', 'lastName'] }
      ]
    });

    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    // Check if user has access to this VM
    if (req.user.role !== 'admin' && vm.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: vm
    });
  } catch (error) {
    logger.error('Get VM error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/vms
// @desc    Create new VM
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      hostname,
      cpuCores,
      memoryGb,
      storageGb,
      osImage,
      mountPoints = [],
      poolId
    } = req.body;

    // Validate required fields
    if (!hostname || !cpuCores || !memoryGb || !storageGb || !osImage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if VM hostname already exists
    const existingVM = await VM.findOne({ where: { hostname } });
    if (existingVM) {
      return res.status(400).json({ error: 'VM hostname already exists' });
    }

    // Find available server in the pool
    const pool = await VMPool.findByPk(poolId, {
      include: [{ model: Server, as: 'servers' }]
    });

    if (!pool) {
      return res.status(404).json({ error: 'VM pool not found' });
    }

    // Find server with available resources
    const availableServer = pool.servers.find(server => {
      const availableCpu = server.totalCpu - server.allocatedCpu;
      const availableMemory = server.totalMemory - server.allocatedMemory;
      const availableStorage = server.totalStorage - server.allocatedStorage;
      
      return availableCpu >= cpuCores && 
             availableMemory >= memoryGb && 
             availableStorage >= storageGb;
    });

    if (!availableServer) {
      return res.status(400).json({ error: 'No available resources in the pool' });
    }

    // Generate IP address from pool range
    const ipRange = pool.ipRangeStart.split('.').slice(0, 3).join('.');
    const currentVMs = await VM.count({ where: { poolId } });
    const ipAddress = `${ipRange}.${currentVMs + 1}`;

    // Create VM
    const vm = await VM.create({
      hostname,
      ipAddress,
      cpuCores,
      memoryGb,
      storageGb,
      osImage,
      mountPoints,
      serverId: availableServer.id,
      poolId,
      createdBy: req.user.id,
      status: 'provisioning',
      sshKey: req.user.sshPublicKey || process.env.VM_DEFAULT_SSH_KEY_PATH,
      defaultUser: process.env.VM_DEFAULT_USER || 'acceldata'
    });

    // Update server allocated resources
    await availableServer.update({
      allocatedCpu: availableServer.allocatedCpu + cpuCores,
      allocatedMemory: availableServer.allocatedMemory + memoryGb,
      allocatedStorage: availableServer.allocatedStorage + storageGb
    });

    // Update pool allocated resources
    await pool.update({
      allocatedCpu: pool.allocatedCpu + cpuCores,
      allocatedMemory: pool.allocatedMemory + memoryGb,
      allocatedStorage: pool.allocatedStorage + storageGb,
      currentVMs: pool.currentVMs + 1
    });

    logger.info(`VM created: ${hostname} on server ${availableServer.hostname}`);

    // TODO: Trigger VM provisioning process
    // This would involve calling the VM provisioning service

    res.status(201).json({
      success: true,
      data: vm
    });
  } catch (error) {
    logger.error('Create VM error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/vms/:id
// @desc    Update VM
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const vm = await VM.findByPk(req.params.id);

    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    // Check if user has access to this VM
    if (req.user.role !== 'admin' && vm.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      hostname,
      cpuCores,
      memoryGb,
      storageGb,
      mountPoints,
      status
    } = req.body;

    await vm.update({
      hostname: hostname || vm.hostname,
      cpuCores: cpuCores || vm.cpuCores,
      memoryGb: memoryGb || vm.memoryGb,
      storageGb: storageGb || vm.storageGb,
      mountPoints: mountPoints || vm.mountPoints,
      status: status || vm.status
    });

    logger.info(`VM updated: ${vm.hostname}`);

    res.json({
      success: true,
      data: vm
    });
  } catch (error) {
    logger.error('Update VM error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/vms/:id
// @desc    Delete VM
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const vm = await VM.findByPk(req.params.id);

    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    // Check if user has access to this VM
    if (req.user.role !== 'admin' && vm.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get server and pool for resource deallocation
    const server = await Server.findByPk(vm.serverId);
    const pool = await VMPool.findByPk(vm.poolId);

    // Deallocate resources
    if (server) {
      await server.update({
        allocatedCpu: server.allocatedCpu - vm.cpuCores,
        allocatedMemory: server.allocatedMemory - vm.memoryGb,
        allocatedStorage: server.allocatedStorage - vm.storageGb
      });
    }

    if (pool) {
      await pool.update({
        allocatedCpu: pool.allocatedCpu - vm.cpuCores,
        allocatedMemory: pool.allocatedMemory - vm.memoryGb,
        allocatedStorage: pool.allocatedStorage - vm.storageGb,
        currentVMs: pool.currentVMs - 1
      });
    }

    await vm.destroy();

    logger.info(`VM deleted: ${vm.hostname}`);

    res.json({
      success: true,
      message: 'VM deleted successfully'
    });
  } catch (error) {
    logger.error('Delete VM error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/vms/:id/start
// @desc    Start VM
// @access  Private
router.post('/:id/start', auth, async (req, res) => {
  try {
    const vm = await VM.findByPk(req.params.id);

    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    // Check if user has access to this VM
    if (req.user.role !== 'admin' && vm.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (vm.status === 'running') {
      return res.status(400).json({ error: 'VM is already running' });
    }

    await vm.update({ status: 'starting' });

    // TODO: Implement VM start logic
    // This would involve calling the VM management service

    logger.info(`VM start initiated: ${vm.hostname}`);

    res.json({
      success: true,
      message: 'VM start initiated'
    });
  } catch (error) {
    logger.error('Start VM error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/vms/:id/stop
// @desc    Stop VM
// @access  Private
router.post('/:id/stop', auth, async (req, res) => {
  try {
    const vm = await VM.findByPk(req.params.id);

    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    // Check if user has access to this VM
    if (req.user.role !== 'admin' && vm.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (vm.status === 'stopped') {
      return res.status(400).json({ error: 'VM is already stopped' });
    }

    await vm.update({ status: 'stopping' });

    // TODO: Implement VM stop logic
    // This would involve calling the VM management service

    logger.info(`VM stop initiated: ${vm.hostname}`);

    res.json({
      success: true,
      message: 'VM stop initiated'
    });
  } catch (error) {
    logger.error('Stop VM error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const bcrypt = require('bcryptjs');
const { User, Namespace, ResourceQuota } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Admin
router.get('/', adminAuth, async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const whereClause = {};

    if (role) whereClause.role = role;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const users = await User.findAll({
      where: whereClause,
      include: [
        { model: Namespace, as: 'namespaces' }
      ],
      attributes: { exclude: ['password'] },
      order: [['username', 'ASC']]
    });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Admin
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Namespace, as: 'namespaces' }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Admin
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role = 'user',
      sshPublicKey
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        $or: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      sshPublicKey
    });

    logger.info(`User created: ${username} by ${req.user.username}`);

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        sshPublicKey: user.sshPublicKey
      }
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Admin
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      username,
      email,
      firstName,
      lastName,
      role,
      isActive,
      sshPublicKey
    } = req.body;

    await user.update({
      username: username || user.username,
      email: email || user.email,
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      role: role || user.role,
      isActive: isActive !== undefined ? isActive : user.isActive,
      sshPublicKey: sshPublicKey || user.sshPublicKey
    });

    logger.info(`User updated: ${user.username} by ${req.user.username}`);

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        sshPublicKey: user.sshPublicKey
      }
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has namespaces
    const namespaceCount = await user.countNamespaces();
    if (namespaceCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with active namespaces' 
      });
    }

    await user.destroy();

    logger.info(`User deleted: ${user.username} by ${req.user.username}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/users/:id/reset-password
// @desc    Reset user password
// @access  Admin
router.post('/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await user.update({ password: hashedPassword });

    logger.info(`Password reset for user: ${user.username} by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/:id/namespaces
// @desc    Get user namespaces
// @access  Private
router.get('/:id/namespaces', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findByPk(userId, {
      include: [
        { 
          model: Namespace, 
          as: 'namespaces',
          include: [
            { model: ResourceQuota, as: 'resourceQuota' }
          ]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user.namespaces
    });
  } catch (error) {
    logger.error('Get user namespaces error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/users/:id/namespaces
// @desc    Create namespace for user
// @access  Admin
router.post('/:id/namespaces', adminAuth, async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      cpuLimit,
      memoryLimit,
      storageLimit,
      cpuRequest,
      memoryRequest,
      storageRequest,
      podLimit,
      poolId
    } = req.body;

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate required fields
    if (!name || !displayName || !poolId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create namespace
    const namespace = await Namespace.create({
      name,
      displayName,
      description,
      cpuLimit,
      memoryLimit,
      storageLimit,
      cpuRequest,
      memoryRequest,
      storageRequest,
      podLimit,
      userId: user.id,
      poolId
    });

    // Create resource quota
    if (cpuLimit || memoryLimit || storageLimit) {
      await ResourceQuota.create({
        name: `${name}-quota`,
        cpuLimit,
        memoryLimit,
        storageLimit,
        cpuRequest,
        memoryRequest,
        storageRequest,
        podLimit,
        namespaceId: namespace.id
      });
    }

    logger.info(`Namespace created: ${name} for user ${user.username}`);

    res.status(201).json({
      success: true,
      data: namespace
    });
  } catch (error) {
    logger.error('Create namespace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/users/:id/namespaces/:namespaceId
// @desc    Update namespace resource limits
// @access  Admin
router.put('/:id/namespaces/:namespaceId', adminAuth, async (req, res) => {
  try {
    const { namespaceId } = req.params;
    const {
      cpuLimit,
      memoryLimit,
      storageLimit,
      cpuRequest,
      memoryRequest,
      storageRequest,
      podLimit
    } = req.body;

    const namespace = await Namespace.findByPk(namespaceId);

    if (!namespace) {
      return res.status(404).json({ error: 'Namespace not found' });
    }

    // Update namespace
    await namespace.update({
      cpuLimit: cpuLimit || namespace.cpuLimit,
      memoryLimit: memoryLimit || namespace.memoryLimit,
      storageLimit: storageLimit || namespace.storageLimit,
      cpuRequest: cpuRequest || namespace.cpuRequest,
      memoryRequest: memoryRequest || namespace.memoryRequest,
      storageRequest: storageRequest || namespace.storageRequest,
      podLimit: podLimit || namespace.podLimit
    });

    // Update resource quota
    const resourceQuota = await ResourceQuota.findOne({
      where: { namespaceId: namespace.id }
    });

    if (resourceQuota) {
      await resourceQuota.update({
        cpuLimit: cpuLimit || resourceQuota.cpuLimit,
        memoryLimit: memoryLimit || resourceQuota.memoryLimit,
        storageLimit: storageLimit || resourceQuota.storageLimit,
        cpuRequest: cpuRequest || resourceQuota.cpuRequest,
        memoryRequest: memoryRequest || resourceQuota.memoryRequest,
        storageRequest: storageRequest || resourceQuota.storageRequest,
        podLimit: podLimit || resourceQuota.podLimit
      });
    }

    logger.info(`Namespace updated: ${namespace.name}`);

    res.json({
      success: true,
      data: namespace
    });
  } catch (error) {
    logger.error('Update namespace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/users/:id/namespaces/:namespaceId
// @desc    Delete namespace
// @access  Admin
router.delete('/:id/namespaces/:namespaceId', adminAuth, async (req, res) => {
  try {
    const { namespaceId } = req.params;

    const namespace = await Namespace.findByPk(namespaceId);

    if (!namespace) {
      return res.status(404).json({ error: 'Namespace not found' });
    }

    // Check if namespace has resources
    if (namespace.currentPods > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete namespace with active pods' 
      });
    }

    await namespace.destroy();

    logger.info(`Namespace deleted: ${namespace.name}`);

    res.json({
      success: true,
      message: 'Namespace deleted successfully'
    });
  } catch (error) {
    logger.error('Delete namespace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { MonitoringData, Server, VM, K8sNode } = require('../models');
const logger = require('../utils/logger');

// Get monitoring data
router.get('/data', async (req, res) => {
  try {
    const { resourceType, resourceId, limit = 100 } = req.query;
    
    let whereClause = {};
    if (resourceType) whereClause.resourceType = resourceType;
    if (resourceId) whereClause.resourceId = resourceId;
    
    const monitoringData = await MonitoringData.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      include: [
        {
          model: Server,
          as: 'server',
          attributes: ['hostname', 'ipAddress']
        },
        {
          model: VM,
          as: 'vm',
          attributes: ['hostname', 'ipAddress']
        },
        {
          model: K8sNode,
          as: 'k8sNode',
          attributes: ['nodeName', 'role']
        }
      ]
    });
    
    res.json(monitoringData);
  } catch (error) {
    logger.error('Error fetching monitoring data:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring data' });
  }
});

// Get monitoring data for a specific resource
router.get('/data/:resourceType/:resourceId', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { limit = 100, hours = 24 } = req.query;
    
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const monitoringData = await MonitoringData.findAll({
      where: {
        resourceType,
        resourceId,
        timestamp: {
          [require('sequelize').Op.gte]: hoursAgo
        }
      },
      order: [['timestamp', 'ASC']],
      limit: parseInt(limit)
    });
    
    res.json(monitoringData);
  } catch (error) {
    logger.error('Error fetching resource monitoring data:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring data' });
  }
});

// Create monitoring data entry
router.post('/data', async (req, res) => {
  try {
    const {
      resourceType,
      resourceId,
      cpuUsage,
      memoryUsage,
      storageUsage,
      networkInBytes,
      networkOutBytes,
      diskReadOps,
      diskWriteOps,
      diskReadBytes,
      diskWriteBytes,
      loadAverage1m,
      loadAverage5m,
      loadAverage15m,
      temperature,
      uptime,
      serverId,
      vmId,
      k8sNodeId,
      metadata
    } = req.body;
    
    const monitoringData = await MonitoringData.create({
      resourceType,
      resourceId,
      cpuUsage,
      memoryUsage,
      storageUsage,
      networkInBytes,
      networkOutBytes,
      diskReadOps,
      diskWriteOps,
      diskReadBytes,
      diskWriteBytes,
      loadAverage1m,
      loadAverage5m,
      loadAverage15m,
      temperature,
      uptime,
      serverId,
      vmId,
      k8sNodeId,
      metadata
    });
    
    res.status(201).json(monitoringData);
  } catch (error) {
    logger.error('Error creating monitoring data:', error);
    res.status(500).json({ error: 'Failed to create monitoring data' });
  }
});

// Get resource health status
router.get('/health', async (req, res) => {
  try {
    const servers = await Server.findAll({
      attributes: ['id', 'hostname', 'status', 'healthStatus', 'lastHealthCheck']
    });
    
    const vms = await VM.findAll({
      attributes: ['id', 'hostname', 'status', 'healthStatus', 'lastHealthCheck']
    });
    
    const k8sNodes = await K8sNode.findAll({
      attributes: ['id', 'nodeName', 'status', 'lastHeartbeat']
    });
    
    const healthSummary = {
      servers: {
        total: servers.length,
        healthy: servers.filter(s => s.healthStatus === 'healthy').length,
        warning: servers.filter(s => s.healthStatus === 'warning').length,
        critical: servers.filter(s => s.healthStatus === 'critical').length
      },
      vms: {
        total: vms.length,
        healthy: vms.filter(v => v.healthStatus === 'healthy').length,
        warning: vms.filter(v => v.healthStatus === 'warning').length,
        critical: vms.filter(v => v.healthStatus === 'critical').length
      },
      k8sNodes: {
        total: k8sNodes.length,
        ready: k8sNodes.filter(n => n.status === 'ready').length,
        notready: k8sNodes.filter(n => n.status === 'notready').length,
        unknown: k8sNodes.filter(n => n.status === 'unknown').length
      }
    };
    
    res.json(healthSummary);
  } catch (error) {
    logger.error('Error fetching health status:', error);
    res.status(500).json({ error: 'Failed to fetch health status' });
  }
});

module.exports = router;
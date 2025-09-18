const express = require('express');
const { Alert, Notification } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const { WebClient } = require('@slack/web-api');

const router = express.Router();

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// @route   GET /api/notifications/alerts
// @desc    Get all alerts
// @access  Private
router.get('/alerts', auth, async (req, res) => {
  try {
    const { status, severity, resourceType } = req.query;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;
    if (resourceType) whereClause.resourceType = resourceType;

    const alerts = await Alert.findAll({
      where: whereClause,
      include: [
        { model: Notification, as: 'notifications' }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/notifications/alerts/:id
// @desc    Get alert by ID
// @access  Private
router.get('/alerts/:id', auth, async (req, res) => {
  try {
    const alert = await Alert.findByPk(req.params.id, {
      include: [
        { model: Notification, as: 'notifications' }
      ]
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Get alert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/notifications/alerts
// @desc    Create new alert
// @access  Admin
router.post('/alerts', adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      resourceType,
      resourceId,
      metric,
      threshold,
      operator = '>',
      duration = 300,
      severity = 'warning',
      labels = {},
      annotations = {}
    } = req.body;

    // Validate required fields
    if (!name || !resourceType || !resourceId || !metric || !threshold) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if alert already exists
    const existingAlert = await Alert.findOne({
      where: {
        name,
        resourceType,
        resourceId
      }
    });

    if (existingAlert) {
      return res.status(400).json({ error: 'Alert already exists' });
    }

    const alert = await Alert.create({
      name,
      description,
      resourceType,
      resourceId,
      metric,
      threshold,
      operator,
      duration,
      severity,
      labels,
      annotations,
      status: 'active'
    });

    logger.info(`Alert created: ${name} for ${resourceType}:${resourceId}`);

    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Create alert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/notifications/alerts/:id
// @desc    Update alert
// @access  Admin
router.put('/alerts/:id', adminAuth, async (req, res) => {
  try {
    const alert = await Alert.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const {
      name,
      description,
      threshold,
      operator,
      duration,
      severity,
      status,
      labels,
      annotations
    } = req.body;

    await alert.update({
      name: name || alert.name,
      description: description || alert.description,
      threshold: threshold || alert.threshold,
      operator: operator || alert.operator,
      duration: duration || alert.duration,
      severity: severity || alert.severity,
      status: status || alert.status,
      labels: labels || alert.labels,
      annotations: annotations || alert.annotations
    });

    logger.info(`Alert updated: ${alert.name}`);

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Update alert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/notifications/alerts/:id
// @desc    Delete alert
// @access  Admin
router.delete('/alerts/:id', adminAuth, async (req, res) => {
  try {
    const alert = await Alert.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.destroy();

    logger.info(`Alert deleted: ${alert.name}`);

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    logger.error('Delete alert error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/notifications/alerts/:id/test
// @desc    Test alert notification
// @access  Admin
router.post('/alerts/:id/test', adminAuth, async (req, res) => {
  try {
    const alert = await Alert.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Send test notification
    await sendSlackNotification({
      alert,
      message: `Test alert: ${alert.name}`,
      severity: alert.severity,
      resourceType: alert.resourceType,
      resourceId: alert.resourceId
    });

    logger.info(`Test notification sent for alert: ${alert.name}`);

    res.json({
      success: true,
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    logger.error('Test notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/notifications/history
// @desc    Get notification history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    const notifications = await Notification.findAll({
      where: whereClause,
      include: [
        { model: Alert, as: 'alert' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    logger.error('Get notification history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/notifications/slack/test
// @desc    Test Slack integration
// @access  Admin
router.post('/slack/test', adminAuth, async (req, res) => {
  try {
    const { channel, message } = req.body;

    if (!channel || !message) {
      return res.status(400).json({ error: 'Channel and message are required' });
    }

    // Send test message to Slack
    await slack.chat.postMessage({
      channel: channel,
      text: message,
      username: 'DC Management Bot',
      icon_emoji: ':robot_face:'
    });

    logger.info(`Test Slack message sent to channel: ${channel}`);

    res.json({
      success: true,
      message: 'Test message sent successfully'
    });
  } catch (error) {
    logger.error('Test Slack message error:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

// @route   GET /api/notifications/slack/channels
// @desc    Get Slack channels
// @access  Admin
router.get('/slack/channels', adminAuth, async (req, res) => {
  try {
    // Get list of channels
    const result = await slack.conversations.list({
      types: 'public_channel,private_channel'
    });

    const channels = result.channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private
    }));

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    logger.error('Get Slack channels error:', error);
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

// @route   POST /api/notifications/webhook/test
// @desc    Test webhook notification
// @access  Admin
router.post('/webhook/test', adminAuth, async (req, res) => {
  try {
    const { url, payload } = req.body;

    if (!url || !payload) {
      return res.status(400).json({ error: 'URL and payload are required' });
    }

    // Send test webhook
    const axios = require('axios');
    await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    logger.info(`Test webhook sent to: ${url}`);

    res.json({
      success: true,
      message: 'Test webhook sent successfully'
    });
  } catch (error) {
    logger.error('Test webhook error:', error);
    res.status(500).json({ error: 'Failed to send test webhook' });
  }
});

// Helper function to send Slack notification
async function sendSlackNotification({ alert, message, severity, resourceType, resourceId }) {
  try {
    const severityEmoji = {
      'info': ':information_source:',
      'warning': ':warning:',
      'critical': ':red_circle:'
    };

    const severityColor = {
      'info': '#36a64f',
      'warning': '#ff9500',
      'critical': '#ff0000'
    };

    const slackMessage = {
      channel: process.env.SLACK_CHANNEL_ID,
      text: `${severityEmoji[severity]} ${message}`,
      username: 'DC Management Bot',
      icon_emoji: ':robot_face:',
      attachments: [
        {
          color: severityColor[severity],
          fields: [
            {
              title: 'Alert',
              value: alert.name,
              short: true
            },
            {
              title: 'Severity',
              value: severity.toUpperCase(),
              short: true
            },
            {
              title: 'Resource',
              value: `${resourceType}:${resourceId}`,
              short: true
            },
            {
              title: 'Metric',
              value: alert.metric,
              short: true
            },
            {
              title: 'Threshold',
              value: `${alert.operator} ${alert.threshold}`,
              short: true
            },
            {
              title: 'Time',
              value: new Date().toISOString(),
              short: true
            }
          ]
        }
      ]
    };

    await slack.chat.postMessage(slackMessage);

    // Log notification
    await Notification.create({
      type: 'slack',
      channel: process.env.SLACK_CHANNEL_ID,
      message: message,
      status: 'sent',
      sentAt: new Date(),
      alertId: alert.id
    });

  } catch (error) {
    logger.error('Slack notification error:', error);
    
    // Log failed notification
    await Notification.create({
      type: 'slack',
      channel: process.env.SLACK_CHANNEL_ID,
      message: message,
      status: 'failed',
      errorMessage: error.message,
      alertId: alert.id
    });
  }
}

// Helper function to send webhook notification
async function sendWebhookNotification({ alert, message, severity, resourceType, resourceId, webhookUrl }) {
  try {
    const axios = require('axios');
    
    const payload = {
      alert: {
        name: alert.name,
        description: alert.description,
        severity: severity,
        resourceType: resourceType,
        resourceId: resourceId,
        metric: alert.metric,
        threshold: alert.threshold,
        operator: alert.operator
      },
      message: message,
      timestamp: new Date().toISOString()
    };

    await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Log notification
    await Notification.create({
      type: 'webhook',
      channel: webhookUrl,
      message: message,
      status: 'sent',
      sentAt: new Date(),
      alertId: alert.id
    });

  } catch (error) {
    logger.error('Webhook notification error:', error);
    
    // Log failed notification
    await Notification.create({
      type: 'webhook',
      channel: webhookUrl,
      message: message,
      status: 'failed',
      errorMessage: error.message,
      alertId: alert.id
    });
  }
}

module.exports = router;
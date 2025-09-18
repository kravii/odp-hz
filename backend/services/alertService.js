const { Alert, Notification, MonitoringData } = require('../models');
const logger = require('../utils/logger');
const { sendSlackNotification, sendWebhookNotification } = require('./notificationService');

class AlertService {
  constructor() {
    this.activeAlerts = new Map();
    this.alertTimers = new Map();
  }

  async initialize() {
    logger.info('Initializing Alert Service...');
    
    // Load active alerts from database
    const alerts = await Alert.findAll({
      where: { status: 'active' }
    });

    for (const alert of alerts) {
      this.activeAlerts.set(alert.id, alert);
    }

    logger.info(`Loaded ${alerts.length} active alerts`);
  }

  async processMonitoringData(monitoringData) {
    try {
      const { resourceType, resourceId, cpuUsage, memoryUsage, storageUsage, temperature, loadAverage1m } = monitoringData;

      // Check all active alerts for this resource
      for (const [alertId, alert] of this.activeAlerts) {
        if (alert.resourceType === resourceType && alert.resourceId === resourceId) {
          await this.checkAlert(alert, monitoringData);
        }
      }
    } catch (error) {
      logger.error('Error processing monitoring data:', error);
    }
  }

  async checkAlert(alert, monitoringData) {
    try {
      const { metric, threshold, operator, duration } = alert;
      let currentValue = null;

      // Get current value based on metric
      switch (metric) {
        case 'cpu':
          currentValue = monitoringData.cpuUsage;
          break;
        case 'memory':
          currentValue = monitoringData.memoryUsage;
          break;
        case 'storage':
          currentValue = monitoringData.storageUsage;
          break;
        case 'temperature':
          currentValue = monitoringData.temperature;
          break;
        case 'load':
          currentValue = monitoringData.loadAverage1m;
          break;
        default:
          logger.warn(`Unknown metric: ${metric}`);
          return;
      }

      if (currentValue === null || currentValue === undefined) {
        return;
      }

      // Check if threshold is exceeded
      const thresholdExceeded = this.evaluateThreshold(currentValue, threshold, operator);

      if (thresholdExceeded) {
        await this.handleThresholdExceeded(alert, currentValue);
      } else {
        await this.handleThresholdNormal(alert);
      }
    } catch (error) {
      logger.error(`Error checking alert ${alert.name}:`, error);
    }
  }

  evaluateThreshold(currentValue, threshold, operator) {
    switch (operator) {
      case '>':
        return currentValue > threshold;
      case '<':
        return currentValue < threshold;
      case '>=':
        return currentValue >= threshold;
      case '<=':
        return currentValue <= threshold;
      case '==':
        return currentValue === threshold;
      case '!=':
        return currentValue !== threshold;
      default:
        logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  async handleThresholdExceeded(alert, currentValue) {
    const alertKey = `${alert.id}_${alert.resourceType}_${alert.resourceId}`;
    
    if (!this.alertTimers.has(alertKey)) {
      // Start timer for alert duration
      const timer = setTimeout(async () => {
        await this.fireAlert(alert, currentValue);
        this.alertTimers.delete(alertKey);
      }, alert.duration * 1000);

      this.alertTimers.set(alertKey, timer);
      logger.info(`Alert ${alert.name} threshold exceeded, timer started for ${alert.duration}s`);
    }
  }

  async handleThresholdNormal(alert) {
    const alertKey = `${alert.id}_${alert.resourceType}_${alert.resourceId}`;
    
    if (this.alertTimers.has(alertKey)) {
      // Clear timer and resolve alert if it was firing
      clearTimeout(this.alertTimers.get(alertKey));
      this.alertTimers.delete(alertKey);
      
      if (alert.status === 'firing') {
        await this.resolveAlert(alert);
      }
      
      logger.info(`Alert ${alert.name} threshold normal, timer cleared`);
    }
  }

  async fireAlert(alert, currentValue) {
    try {
      // Update alert status
      await alert.update({
        status: 'firing',
        lastFired: new Date(),
        fireCount: alert.fireCount + 1
      });

      // Create notification message
      const message = this.createAlertMessage(alert, currentValue);

      // Send notifications
      await this.sendNotifications(alert, message);

      logger.info(`Alert fired: ${alert.name} - ${message}`);
    } catch (error) {
      logger.error(`Error firing alert ${alert.name}:`, error);
    }
  }

  async resolveAlert(alert) {
    try {
      // Update alert status
      await alert.update({
        status: 'resolved',
        lastResolved: new Date()
      });

      // Create resolution message
      const message = `Alert resolved: ${alert.name}`;

      // Send resolution notifications
      await this.sendNotifications(alert, message, 'resolved');

      logger.info(`Alert resolved: ${alert.name}`);
    } catch (error) {
      logger.error(`Error resolving alert ${alert.name}:`, error);
    }
  }

  createAlertMessage(alert, currentValue) {
    const { name, description, metric, threshold, operator, severity, resourceType, resourceId } = alert;
    
    let message = `🚨 ALERT: ${name}`;
    
    if (description) {
      message += `\nDescription: ${description}`;
    }
    
    message += `\nResource: ${resourceType}:${resourceId}`;
    message += `\nMetric: ${metric}`;
    message += `\nCurrent Value: ${currentValue}`;
    message += `\nThreshold: ${operator} ${threshold}`;
    message += `\nSeverity: ${severity.toUpperCase()}`;
    message += `\nTime: ${new Date().toISOString()}`;
    
    return message;
  }

  async sendNotifications(alert, message, type = 'firing') {
    try {
      // Send Slack notification
      if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID) {
        await sendSlackNotification({
          alert,
          message,
          severity: alert.severity,
          resourceType: alert.resourceType,
          resourceId: alert.resourceId,
          type
        });
      }

      // Send webhook notifications
      if (process.env.WEBHOOK_URLS) {
        const webhookUrls = process.env.WEBHOOK_URLS.split(',');
        for (const webhookUrl of webhookUrls) {
          await sendWebhookNotification({
            alert,
            message,
            severity: alert.severity,
            resourceType: alert.resourceType,
            resourceId: alert.resourceId,
            webhookUrl: webhookUrl.trim(),
            type
          });
        }
      }
    } catch (error) {
      logger.error('Error sending notifications:', error);
    }
  }

  async addAlert(alert) {
    this.activeAlerts.set(alert.id, alert);
    logger.info(`Alert added: ${alert.name}`);
  }

  async removeAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      // Clear any active timers
      const alertKey = `${alert.id}_${alert.resourceType}_${alert.resourceId}`;
      if (this.alertTimers.has(alertKey)) {
        clearTimeout(this.alertTimers.get(alertKey));
        this.alertTimers.delete(alertKey);
      }
      
      this.activeAlerts.delete(alertId);
      logger.info(`Alert removed: ${alert.name}`);
    }
  }

  async updateAlert(alert) {
    this.activeAlerts.set(alert.id, alert);
    logger.info(`Alert updated: ${alert.name}`);
  }

  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  getAlertStats() {
    const alerts = this.getActiveAlerts();
    const stats = {
      total: alerts.length,
      firing: alerts.filter(a => a.status === 'firing').length,
      active: alerts.filter(a => a.status === 'active').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      }
    };
    
    return stats;
  }
}

// Create singleton instance
const alertService = new AlertService();

module.exports = alertService;
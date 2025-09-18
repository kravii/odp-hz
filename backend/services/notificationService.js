const { WebClient } = require('@slack/web-api');
const axios = require('axios');
const logger = require('../utils/logger');

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

class NotificationService {
  constructor() {
    this.slackEnabled = !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID);
    this.webhookUrls = process.env.WEBHOOK_URLS ? process.env.WEBHOOK_URLS.split(',') : [];
  }

  async sendSlackNotification({ alert, message, severity, resourceType, resourceId, type = 'firing' }) {
    if (!this.slackEnabled) {
      logger.warn('Slack notifications not configured');
      return;
    }

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

      const typeEmoji = type === 'firing' ? '🚨' : '✅';

      const slackMessage = {
        channel: process.env.SLACK_CHANNEL_ID,
        text: `${typeEmoji} ${severityEmoji[severity]} ${message}`,
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
                title: 'Status',
                value: type.toUpperCase(),
                short: true
              },
              {
                title: 'Time',
                value: new Date().toISOString(),
                short: false
              }
            ]
          }
        ]
      };

      await slack.chat.postMessage(slackMessage);
      logger.info(`Slack notification sent for alert: ${alert.name}`);

    } catch (error) {
      logger.error('Slack notification error:', error);
      throw error;
    }
  }

  async sendWebhookNotification({ alert, message, severity, resourceType, resourceId, webhookUrl, type = 'firing' }) {
    try {
      const payload = {
        alert: {
          id: alert.id,
          name: alert.name,
          description: alert.description,
          severity: severity,
          resourceType: resourceType,
          resourceId: resourceId,
          metric: alert.metric,
          threshold: alert.threshold,
          operator: alert.operator,
          duration: alert.duration,
          status: alert.status,
          fireCount: alert.fireCount
        },
        message: message,
        type: type,
        timestamp: new Date().toISOString(),
        system: {
          name: 'DC Management System',
          version: '1.0.0'
        }
      };

      await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DC-Management-System/1.0.0'
        },
        timeout: 10000
      });

      logger.info(`Webhook notification sent to: ${webhookUrl}`);

    } catch (error) {
      logger.error(`Webhook notification error for ${webhookUrl}:`, error);
      throw error;
    }
  }

  async sendEmailNotification({ alert, message, severity, resourceType, resourceId, email, type = 'firing' }) {
    // Email notification implementation would go here
    // This would require an email service like SendGrid, AWS SES, etc.
    logger.info(`Email notification would be sent to: ${email} for alert: ${alert.name}`);
  }

  async sendSMSNotification({ alert, message, severity, resourceType, resourceId, phoneNumber, type = 'firing' }) {
    // SMS notification implementation would go here
    // This would require an SMS service like Twilio, AWS SNS, etc.
    logger.info(`SMS notification would be sent to: ${phoneNumber} for alert: ${alert.name}`);
  }

  async sendDiscordNotification({ alert, message, severity, resourceType, resourceId, webhookUrl, type = 'firing' }) {
    try {
      const severityColor = {
        'info': 0x36a64f,
        'warning': 0xff9500,
        'critical': 0xff0000
      };

      const typeEmoji = type === 'firing' ? '🚨' : '✅';

      const discordPayload = {
        username: 'DC Management Bot',
        avatar_url: 'https://cdn.discordapp.com/emojis/robot_face.png',
        embeds: [
          {
            title: `${typeEmoji} ${alert.name}`,
            description: message,
            color: severityColor[severity],
            fields: [
              {
                name: 'Severity',
                value: severity.toUpperCase(),
                inline: true
              },
              {
                name: 'Resource',
                value: `${resourceType}:${resourceId}`,
                inline: true
              },
              {
                name: 'Metric',
                value: alert.metric,
                inline: true
              },
              {
                name: 'Threshold',
                value: `${alert.operator} ${alert.threshold}`,
                inline: true
              },
              {
                name: 'Status',
                value: type.toUpperCase(),
                inline: true
              },
              {
                name: 'Time',
                value: new Date().toISOString(),
                inline: false
              }
            ],
            timestamp: new Date().toISOString()
          }
        ]
      };

      await axios.post(webhookUrl, discordPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.info(`Discord notification sent to: ${webhookUrl}`);

    } catch (error) {
      logger.error(`Discord notification error for ${webhookUrl}:`, error);
      throw error;
    }
  }

  async sendTeamsNotification({ alert, message, severity, resourceType, resourceId, webhookUrl, type = 'firing' }) {
    try {
      const severityColor = {
        'info': 'Good',
        'warning': 'Warning',
        'critical': 'Attention'
      };

      const typeEmoji = type === 'firing' ? '🚨' : '✅';

      const teamsPayload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: severity === 'critical' ? 'FF0000' : severity === 'warning' ? 'FF9500' : '36A64F',
        summary: `${typeEmoji} ${alert.name}`,
        sections: [
          {
            activityTitle: `${typeEmoji} ${alert.name}`,
            activitySubtitle: message,
            facts: [
              {
                name: 'Severity',
                value: severity.toUpperCase()
              },
              {
                name: 'Resource',
                value: `${resourceType}:${resourceId}`
              },
              {
                name: 'Metric',
                value: alert.metric
              },
              {
                name: 'Threshold',
                value: `${alert.operator} ${alert.threshold}`
              },
              {
                name: 'Status',
                value: type.toUpperCase()
              },
              {
                name: 'Time',
                value: new Date().toISOString()
              }
            ]
          }
        ]
      };

      await axios.post(webhookUrl, teamsPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.info(`Teams notification sent to: ${webhookUrl}`);

    } catch (error) {
      logger.error(`Teams notification error for ${webhookUrl}:`, error);
      throw error;
    }
  }

  async sendAllNotifications({ alert, message, severity, resourceType, resourceId, type = 'firing' }) {
    const notifications = [];

    // Send Slack notification
    if (this.slackEnabled) {
      notifications.push(
        this.sendSlackNotification({ alert, message, severity, resourceType, resourceId, type })
          .catch(error => logger.error('Slack notification failed:', error))
      );
    }

    // Send webhook notifications
    for (const webhookUrl of this.webhookUrls) {
      notifications.push(
        this.sendWebhookNotification({ alert, message, severity, resourceType, resourceId, webhookUrl: webhookUrl.trim(), type })
          .catch(error => logger.error(`Webhook notification failed for ${webhookUrl}:`, error))
      );
    }

    // Wait for all notifications to complete
    await Promise.allSettled(notifications);
  }

  async testSlackConnection() {
    if (!this.slackEnabled) {
      throw new Error('Slack not configured');
    }

    try {
      const result = await slack.auth.test();
      return {
        success: true,
        team: result.team,
        user: result.user,
        url: result.url
      };
    } catch (error) {
      throw new Error(`Slack connection test failed: ${error.message}`);
    }
  }

  async testWebhookConnection(webhookUrl) {
    try {
      const testPayload = {
        test: true,
        message: 'Test notification from DC Management System',
        timestamp: new Date().toISOString()
      };

      await axios.post(webhookUrl, testPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Webhook test failed: ${error.message}`);
    }
  }

  getNotificationStats() {
    return {
      slackEnabled: this.slackEnabled,
      webhookCount: this.webhookUrls.length,
      webhookUrls: this.webhookUrls
    };
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
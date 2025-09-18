module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('slack', 'email', 'webhook'),
      allowNull: false
    },
    channel: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed', 'retrying'),
      defaultValue: 'pending'
    },
    sentAt: {
      type: DataTypes.DATE,
      field: 'sent_at'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'retry_count'
    },
    maxRetries: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      field: 'max_retries'
    },
    nextRetryAt: {
      type: DataTypes.DATE,
      field: 'next_retry_at'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      field: 'error_message'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'notifications',
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['type']
      },
      {
        fields: ['sent_at']
      },
      {
        fields: ['alert_id']
      }
    ]
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.Alert, {
      foreignKey: 'alertId',
      as: 'alert'
    });
  };

  return Notification;
};
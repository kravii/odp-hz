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
      type: DataTypes.DATE
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    maxRetries: {
      type: DataTypes.INTEGER,
      defaultValue: 3
    },
    nextRetryAt: {
      type: DataTypes.DATE
    },
    errorMessage: {
      type: DataTypes.TEXT
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
        fields: ['sentAt']
      },
      {
        fields: ['alertId']
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
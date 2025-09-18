module.exports = (sequelize, DataTypes) => {
  const Alert = sequelize.define('Alert', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    resourceType: {
      type: DataTypes.ENUM('server', 'vm', 'k8s_node', 'namespace'),
      allowNull: false,
      field: 'resource_type'
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'resource_id'
    },
    metric: {
      type: DataTypes.ENUM('cpu', 'memory', 'storage', 'network', 'disk_io', 'temperature', 'load'),
      allowNull: false
    },
    threshold: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: 'Threshold value for the metric'
    },
    operator: {
      type: DataTypes.ENUM('>', '<', '>=', '<=', '==', '!='),
      allowNull: false,
      defaultValue: '>'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 300,
      comment: 'Duration in seconds before alert triggers'
    },
    severity: {
      type: DataTypes.ENUM('info', 'warning', 'critical'),
      allowNull: false,
      defaultValue: 'warning'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'firing', 'resolved'),
      defaultValue: 'active'
    },
    lastFired: {
      type: DataTypes.DATE,
      field: 'last_fired'
    },
    lastResolved: {
      type: DataTypes.DATE,
      field: 'last_resolved'
    },
    fireCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'fire_count'
    },
    labels: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    annotations: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'alerts',
    indexes: [
      {
        fields: ['resource_type', 'resource_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['metric']
      }
    ]
  });

  Alert.associate = (models) => {
    Alert.hasMany(models.Notification, {
      foreignKey: 'alertId',
      as: 'notifications'
    });
  };

  return Alert;
};
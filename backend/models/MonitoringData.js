module.exports = (sequelize, DataTypes) => {
  const MonitoringData = sequelize.define('MonitoringData', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    resourceType: {
      type: DataTypes.ENUM('server', 'vm', 'k8s_node'),
      allowNull: false
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cpuUsage: {
      type: DataTypes.DECIMAL(5, 2),
      comment: 'CPU usage percentage'
    },
    memoryUsage: {
      type: DataTypes.DECIMAL(5, 2),
      comment: 'Memory usage percentage'
    },
    storageUsage: {
      type: DataTypes.DECIMAL(5, 2),
      comment: 'Storage usage percentage'
    },
    networkInBytes: {
      type: DataTypes.BIGINT,
      comment: 'Network input in bytes'
    },
    networkOutBytes: {
      type: DataTypes.BIGINT,
      comment: 'Network output in bytes'
    },
    diskReadOps: {
      type: DataTypes.BIGINT,
      comment: 'Disk read operations'
    },
    diskWriteOps: {
      type: DataTypes.BIGINT,
      comment: 'Disk write operations'
    },
    diskReadBytes: {
      type: DataTypes.BIGINT,
      comment: 'Disk read bytes'
    },
    diskWriteBytes: {
      type: DataTypes.BIGINT,
      comment: 'Disk write bytes'
    },
    loadAverage1m: {
      type: DataTypes.DECIMAL(5, 2),
      comment: '1-minute load average'
    },
    loadAverage5m: {
      type: DataTypes.DECIMAL(5, 2),
      comment: '5-minute load average'
    },
    loadAverage15m: {
      type: DataTypes.DECIMAL(5, 2),
      comment: '15-minute load average'
    },
    temperature: {
      type: DataTypes.DECIMAL(5, 2),
      comment: 'CPU temperature in Celsius'
    },
    uptime: {
      type: DataTypes.BIGINT,
      comment: 'System uptime in seconds'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'monitoring_data',
    indexes: [
      {
        fields: ['resourceType', 'resourceId']
      },
      {
        fields: ['timestamp']
      },
      {
        fields: ['resourceType', 'resourceId', 'timestamp']
      }
    ]
  });

  MonitoringData.associate = (models) => {
    MonitoringData.belongsTo(models.Server, {
      foreignKey: 'serverId',
      as: 'server'
    });
    
    MonitoringData.belongsTo(models.VM, {
      foreignKey: 'vmId',
      as: 'vm'
    });
    
    MonitoringData.belongsTo(models.K8sNode, {
      foreignKey: 'k8sNodeId',
      as: 'k8sNode'
    });
  };

  return MonitoringData;
};
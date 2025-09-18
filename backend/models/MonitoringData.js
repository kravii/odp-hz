module.exports = (sequelize, DataTypes) => {
  const MonitoringData = sequelize.define('MonitoringData', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    resourceType: {
      type: DataTypes.ENUM('server', 'vm', 'k8s_node'),
      allowNull: false,
      field: 'resource_type'
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'resource_id'
    },
    cpuUsage: {
      type: DataTypes.DECIMAL(5, 2),
      comment: 'CPU usage percentage',
      field: 'cpu_usage'
    },
    memoryUsage: {
      type: DataTypes.DECIMAL(5, 2),
      comment: 'Memory usage percentage',
      field: 'memory_usage'
    },
    storageUsage: {
      type: DataTypes.DECIMAL(5, 2),
      comment: 'Storage usage percentage',
      field: 'storage_usage'
    },
    networkInBytes: {
      type: DataTypes.BIGINT,
      comment: 'Network input in bytes',
      field: 'network_in_bytes'
    },
    networkOutBytes: {
      type: DataTypes.BIGINT,
      comment: 'Network output in bytes',
      field: 'network_out_bytes'
    },
    diskReadOps: {
      type: DataTypes.BIGINT,
      comment: 'Disk read operations',
      field: 'disk_read_ops'
    },
    diskWriteOps: {
      type: DataTypes.BIGINT,
      comment: 'Disk write operations',
      field: 'disk_write_ops'
    },
    diskReadBytes: {
      type: DataTypes.BIGINT,
      comment: 'Disk read bytes',
      field: 'disk_read_bytes'
    },
    diskWriteBytes: {
      type: DataTypes.BIGINT,
      comment: 'Disk write bytes',
      field: 'disk_write_bytes'
    },
    loadAverage1m: {
      type: DataTypes.DECIMAL(5, 2),
      comment: '1-minute load average',
      field: 'load_average_1m'
    },
    loadAverage5m: {
      type: DataTypes.DECIMAL(5, 2),
      comment: '5-minute load average',
      field: 'load_average_5m'
    },
    loadAverage15m: {
      type: DataTypes.DECIMAL(5, 2),
      comment: '15-minute load average',
      field: 'load_average_15m'
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
        fields: ['resource_type', 'resource_id']
      },
      {
        fields: ['timestamp']
      },
      {
        fields: ['resource_type', 'resource_id', 'timestamp']
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
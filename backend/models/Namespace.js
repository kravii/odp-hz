module.exports = (sequelize, DataTypes) => {
  const Namespace = sequelize.define('Namespace', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    displayName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'display_name'
    },
    description: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active'
    },
    cpuLimit: {
      type: DataTypes.INTEGER,
      comment: 'CPU limit in millicores',
      field: 'cpu_limit'
    },
    memoryLimit: {
      type: DataTypes.INTEGER,
      comment: 'Memory limit in MB',
      field: 'memory_limit'
    },
    storageLimit: {
      type: DataTypes.INTEGER,
      comment: 'Storage limit in GB',
      field: 'storage_limit'
    },
    cpuRequest: {
      type: DataTypes.INTEGER,
      comment: 'CPU request in millicores',
      field: 'cpu_request'
    },
    memoryRequest: {
      type: DataTypes.INTEGER,
      comment: 'Memory request in MB',
      field: 'memory_request'
    },
    storageRequest: {
      type: DataTypes.INTEGER,
      comment: 'Storage request in GB',
      field: 'storage_request'
    },
    podLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of pods',
      field: 'pod_limit'
    },
    currentPods: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_pods'
    },
    currentCpuUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Current CPU usage in millicores',
      field: 'current_cpu_usage'
    },
    currentMemoryUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Current memory usage in MB',
      field: 'current_memory_usage'
    },
    currentStorageUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Current storage usage in GB',
      field: 'current_storage_usage'
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
    tableName: 'namespaces',
    indexes: [
      {
        unique: true,
        fields: ['name', 'pool_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['pool_id']
      },
      {
        fields: ['status']
      }
    ]
  });

  Namespace.associate = (models) => {
    Namespace.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Namespace.belongsTo(models.K8sPool, {
      foreignKey: 'poolId',
      as: 'pool'
    });
    
    Namespace.hasOne(models.ResourceQuota, {
      foreignKey: 'namespaceId',
      as: 'resourceQuota'
    });
  };

  return Namespace;
};
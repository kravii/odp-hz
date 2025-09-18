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
      allowNull: false
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
      comment: 'CPU limit in millicores'
    },
    memoryLimit: {
      type: DataTypes.INTEGER,
      comment: 'Memory limit in MB'
    },
    storageLimit: {
      type: DataTypes.INTEGER,
      comment: 'Storage limit in GB'
    },
    cpuRequest: {
      type: DataTypes.INTEGER,
      comment: 'CPU request in millicores'
    },
    memoryRequest: {
      type: DataTypes.INTEGER,
      comment: 'Memory request in MB'
    },
    storageRequest: {
      type: DataTypes.INTEGER,
      comment: 'Storage request in GB'
    },
    podLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of pods'
    },
    currentPods: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    currentCpuUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Current CPU usage in millicores'
    },
    currentMemoryUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Current memory usage in MB'
    },
    currentStorageUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Current storage usage in GB'
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
        fields: ['name', 'poolId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['poolId']
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
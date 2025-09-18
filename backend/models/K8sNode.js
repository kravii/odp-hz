module.exports = (sequelize, DataTypes) => {
  const K8sNode = sequelize.define('K8sNode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nodeName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    role: {
      type: DataTypes.ENUM('master', 'worker'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ready', 'notready', 'unknown', 'provisioning', 'error'),
      defaultValue: 'provisioning'
    },
    kubeletVersion: {
      type: DataTypes.STRING(50)
    },
    containerRuntime: {
      type: DataTypes.STRING(50),
      defaultValue: 'containerd'
    },
    osImage: {
      type: DataTypes.STRING(100)
    },
    kernelVersion: {
      type: DataTypes.STRING(100)
    },
    architecture: {
      type: DataTypes.STRING(20),
      defaultValue: 'amd64'
    },
    cpuCapacity: {
      type: DataTypes.INTEGER,
      comment: 'CPU capacity in millicores'
    },
    memoryCapacity: {
      type: DataTypes.STRING(20),
      comment: 'Memory capacity in bytes'
    },
    storageCapacity: {
      type: DataTypes.STRING(20),
      comment: 'Storage capacity in bytes'
    },
    cpuAllocatable: {
      type: DataTypes.INTEGER,
      comment: 'Allocatable CPU in millicores'
    },
    memoryAllocatable: {
      type: DataTypes.STRING(20),
      comment: 'Allocatable memory in bytes'
    },
    storageAllocatable: {
      type: DataTypes.STRING(20),
      comment: 'Allocatable storage in bytes'
    },
    labels: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    taints: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    conditions: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    joinedAt: {
      type: DataTypes.DATE
    },
    lastHeartbeat: {
      type: DataTypes.DATE
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'k8s_nodes',
    indexes: [
      {
        unique: true,
        fields: ['nodeName']
      },
      {
        fields: ['role']
      },
      {
        fields: ['status']
      },
      {
        fields: ['serverId']
      }
    ]
  });

  K8sNode.associate = (models) => {
    K8sNode.belongsTo(models.Server, {
      foreignKey: 'serverId',
      as: 'server'
    });
    
    K8sNode.belongsTo(models.K8sPool, {
      foreignKey: 'poolId',
      as: 'pool'
    });
    
    K8sNode.hasMany(models.MonitoringData, {
      foreignKey: 'k8sNodeId',
      as: 'monitoringData'
    });
  };

  return K8sNode;
};
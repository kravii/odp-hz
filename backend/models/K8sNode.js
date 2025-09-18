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
      unique: true,
      field: 'node_name'
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
      type: DataTypes.STRING(50),
      field: 'kubelet_version'
    },
    containerRuntime: {
      type: DataTypes.STRING(50),
      defaultValue: 'containerd',
      field: 'container_runtime'
    },
    osImage: {
      type: DataTypes.STRING(100),
      field: 'os_image'
    },
    kernelVersion: {
      type: DataTypes.STRING(100),
      field: 'kernel_version'
    },
    architecture: {
      type: DataTypes.STRING(20),
      defaultValue: 'amd64'
    },
    cpuCapacity: {
      type: DataTypes.INTEGER,
      comment: 'CPU capacity in millicores',
      field: 'cpu_capacity'
    },
    memoryCapacity: {
      type: DataTypes.STRING(20),
      comment: 'Memory capacity in bytes',
      field: 'memory_capacity'
    },
    storageCapacity: {
      type: DataTypes.STRING(20),
      comment: 'Storage capacity in bytes',
      field: 'storage_capacity'
    },
    cpuAllocatable: {
      type: DataTypes.INTEGER,
      comment: 'Allocatable CPU in millicores',
      field: 'cpu_allocatable'
    },
    memoryAllocatable: {
      type: DataTypes.STRING(20),
      comment: 'Allocatable memory in bytes',
      field: 'memory_allocatable'
    },
    storageAllocatable: {
      type: DataTypes.STRING(20),
      comment: 'Allocatable storage in bytes',
      field: 'storage_allocatable'
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
      type: DataTypes.DATE,
      field: 'joined_at'
    },
    lastHeartbeat: {
      type: DataTypes.DATE,
      field: 'last_heartbeat'
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
        fields: ['node_name']
      },
      {
        fields: ['role']
      },
      {
        fields: ['status']
      },
      {
        fields: ['server_id']
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
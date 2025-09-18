module.exports = (sequelize, DataTypes) => {
  const K8sPool = sequelize.define('K8sPool', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT
    },
    clusterName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'cluster_name'
    },
    kubernetesVersion: {
      type: DataTypes.STRING(20),
      defaultValue: '1.28.0',
      field: 'kubernetes_version'
    },
    totalCpu: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total CPU cores in pool',
      field: 'total_cpu'
    },
    totalMemory: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total memory in GB in pool',
      field: 'total_memory'
    },
    totalStorage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total storage in GB in pool',
      field: 'total_storage'
    },
    allocatedCpu: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Allocated CPU cores',
      field: 'allocated_cpu'
    },
    allocatedMemory: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Allocated memory in GB',
      field: 'allocated_memory'
    },
    allocatedStorage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Allocated storage in GB',
      field: 'allocated_storage'
    },
    masterNodes: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: 'Number of master nodes for HA',
      field: 'master_nodes'
    },
    workerNodes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of worker nodes',
      field: 'worker_nodes'
    },
    status: {
      type: DataTypes.ENUM('provisioning', 'active', 'inactive', 'maintenance', 'error'),
      defaultValue: 'provisioning'
    },
    apiServerEndpoint: {
      type: DataTypes.STRING(255),
      field: 'api_server_endpoint'
    },
    kubeconfig: {
      type: DataTypes.TEXT
    },
    rancherClusterId: {
      type: DataTypes.STRING(100),
      field: 'rancher_cluster_id'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'k8s_pools',
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        unique: true,
        fields: ['cluster_name']
      },
      {
        fields: ['status']
      }
    ]
  });

  K8sPool.associate = (models) => {
    K8sPool.belongsToMany(models.Server, {
      through: 'ServerK8sPool',
      foreignKey: 'poolId',
      as: 'servers'
    });
    
    K8sPool.hasMany(models.K8sNode, {
      foreignKey: 'poolId',
      as: 'nodes'
    });
    
    K8sPool.hasMany(models.Namespace, {
      foreignKey: 'poolId',
      as: 'namespaces'
    });
  };

  return K8sPool;
};
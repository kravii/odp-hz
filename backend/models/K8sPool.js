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
      unique: true
    },
    kubernetesVersion: {
      type: DataTypes.STRING(20),
      defaultValue: '1.28.0'
    },
    totalCpu: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total CPU cores in pool'
    },
    totalMemory: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total memory in GB in pool'
    },
    totalStorage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total storage in GB in pool'
    },
    allocatedCpu: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Allocated CPU cores'
    },
    allocatedMemory: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Allocated memory in GB'
    },
    allocatedStorage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Allocated storage in GB'
    },
    masterNodes: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: 'Number of master nodes for HA'
    },
    workerNodes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of worker nodes'
    },
    status: {
      type: DataTypes.ENUM('provisioning', 'active', 'inactive', 'maintenance', 'error'),
      defaultValue: 'provisioning'
    },
    apiServerEndpoint: {
      type: DataTypes.STRING(255)
    },
    kubeconfig: {
      type: DataTypes.TEXT
    },
    rancherClusterId: {
      type: DataTypes.STRING(100)
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
        fields: ['clusterName']
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
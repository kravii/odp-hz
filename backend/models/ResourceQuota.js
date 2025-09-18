module.exports = (sequelize, DataTypes) => {
  const ResourceQuota = sequelize.define('ResourceQuota', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
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
    serviceLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of services',
      field: 'service_limit'
    },
    pvcLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of persistent volume claims',
      field: 'pvc_limit'
    },
    configMapLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of config maps',
      field: 'config_map_limit'
    },
    secretLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of secrets',
      field: 'secret_limit'
    },
    ingressLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of ingresses',
      field: 'ingress_limit'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'resource_quotas',
    indexes: [
      {
        unique: true,
        fields: ['name', 'namespace_id']
      },
      {
        fields: ['namespace_id']
      },
      {
        fields: ['status']
      }
    ]
  });

  ResourceQuota.associate = (models) => {
    ResourceQuota.belongsTo(models.Namespace, {
      foreignKey: 'namespaceId',
      as: 'namespace'
    });
  };

  return ResourceQuota;
};
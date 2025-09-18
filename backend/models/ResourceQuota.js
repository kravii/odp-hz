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
    serviceLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of services'
    },
    pvcLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of persistent volume claims'
    },
    configMapLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of config maps'
    },
    secretLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of secrets'
    },
    ingressLimit: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of ingresses'
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
        fields: ['name', 'namespaceId']
      },
      {
        fields: ['namespaceId']
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
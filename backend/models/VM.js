module.exports = (sequelize, DataTypes) => {
  const VM = sequelize.define('VM', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    hostname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true,
      field: 'ip_address'
    },
    status: {
      type: DataTypes.ENUM('running', 'stopped', 'starting', 'stopping', 'error', 'provisioning'),
      defaultValue: 'provisioning'
    },
    cpuCores: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'cpu_cores'
    },
    memoryGb: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'memory_gb'
    },
    storageGb: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'storage_gb'
    },
    osImage: {
      type: DataTypes.ENUM(
        'centos7', 'rhel7', 'rhel8', 'rhel9', 
        'rockylinux9', 'ubuntu20', 'ubuntu22', 
        'ubuntu24', 'oel8.10'
      ),
      allowNull: false,
      field: 'os_image'
    },
    mountPoints: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'mount_points'
    },
    sshKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'ssh_key'
    },
    defaultUser: {
      type: DataTypes.STRING(50),
      defaultValue: 'acceldata',
      field: 'default_user'
    },
    provisionedAt: {
      type: DataTypes.DATE,
      field: 'provisioned_at'
    },
    lastHealthCheck: {
      type: DataTypes.DATE,
      field: 'last_health_check'
    },
    healthStatus: {
      type: DataTypes.ENUM('healthy', 'warning', 'critical'),
      defaultValue: 'healthy',
      field: 'health_status'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'vms',
    indexes: [
      {
        unique: true,
        fields: ['hostname']
      },
      {
        unique: true,
        fields: ['ip_address']
      },
      {
        fields: ['status']
      },
      {
        fields: ['server_id']
      },
      {
        fields: ['created_by']
      }
    ]
  });

  VM.associate = (models) => {
    VM.belongsTo(models.Server, {
      foreignKey: 'serverId',
      as: 'server'
    });
    
    VM.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    
    VM.hasMany(models.MonitoringData, {
      foreignKey: 'vmId',
      as: 'monitoringData'
    });
  };

  return VM;
};
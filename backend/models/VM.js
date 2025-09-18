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
      unique: true
    },
    status: {
      type: DataTypes.ENUM('running', 'stopped', 'starting', 'stopping', 'error', 'provisioning'),
      defaultValue: 'provisioning'
    },
    cpuCores: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    memoryGb: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    storageGb: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    osImage: {
      type: DataTypes.ENUM(
        'centos7', 'rhel7', 'rhel8', 'rhel9', 
        'rockylinux9', 'ubuntu20', 'ubuntu22', 
        'ubuntu24', 'oel8.10'
      ),
      allowNull: false
    },
    mountPoints: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    sshKey: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    defaultUser: {
      type: DataTypes.STRING(50),
      defaultValue: 'acceldata'
    },
    provisionedAt: {
      type: DataTypes.DATE
    },
    lastHealthCheck: {
      type: DataTypes.DATE
    },
    healthStatus: {
      type: DataTypes.ENUM('healthy', 'warning', 'critical'),
      defaultValue: 'healthy'
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
        fields: ['ipAddress']
      },
      {
        fields: ['status']
      },
      {
        fields: ['serverId']
      },
      {
        fields: ['createdBy']
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
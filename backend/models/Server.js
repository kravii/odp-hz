module.exports = (sequelize, DataTypes) => {
  const Server = sequelize.define('Server', {
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
      type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'error'),
      defaultValue: 'active'
    },
    totalCpu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total CPU cores'
    },
    totalMemory: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total memory in GB'
    },
    totalStorage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total storage in GB'
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
    osVersion: {
      type: DataTypes.STRING(50),
      defaultValue: 'Rocky Linux 9'
    },
    sshPort: {
      type: DataTypes.INTEGER,
      defaultValue: 22
    },
    sshUser: {
      type: DataTypes.STRING(50),
      defaultValue: 'root'
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
    tableName: 'servers',
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
        fields: ['healthStatus']
      }
    ]
  });

  Server.associate = (models) => {
    Server.belongsToMany(models.VMPool, {
      through: 'ServerVMPool',
      foreignKey: 'serverId',
      as: 'vmPools'
    });
    
    Server.belongsToMany(models.K8sPool, {
      through: 'ServerK8sPool',
      foreignKey: 'serverId',
      as: 'k8sPools'
    });
    
    Server.hasMany(models.VM, {
      foreignKey: 'serverId',
      as: 'vms'
    });
    
    Server.hasMany(models.K8sNode, {
      foreignKey: 'serverId',
      as: 'k8sNodes'
    });
    
    Server.hasMany(models.MonitoringData, {
      foreignKey: 'serverId',
      as: 'monitoringData'
    });
  };

  return Server;
};
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
      unique: true,
      field: 'ip_address'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'error'),
      defaultValue: 'active'
    },
    totalCpu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total CPU cores',
      field: 'total_cpu'
    },
    totalMemory: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total memory in GB',
      field: 'total_memory'
    },
    totalStorage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total storage in GB',
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
    osVersion: {
      type: DataTypes.STRING(50),
      defaultValue: 'Rocky Linux 9',
      field: 'os_version'
    },
    sshPort: {
      type: DataTypes.INTEGER,
      defaultValue: 22,
      field: 'ssh_port'
    },
    sshUser: {
      type: DataTypes.STRING(50),
      defaultValue: 'root',
      field: 'ssh_user'
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
    tableName: 'servers',
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
        fields: ['health_status']
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
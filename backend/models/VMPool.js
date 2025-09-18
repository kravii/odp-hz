module.exports = (sequelize, DataTypes) => {
  const VMPool = sequelize.define('VMPool', {
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
    maxVMs: {
      type: DataTypes.INTEGER,
      defaultValue: 300,
      comment: 'Maximum number of VMs in this pool',
      field: 'max_vms'
    },
    currentVMs: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Current number of VMs',
      field: 'current_vms'
    },
    ipRangeStart: {
      type: DataTypes.STRING(45),
      defaultValue: '10.0.1.1',
      field: 'ip_range_start'
    },
    ipRangeEnd: {
      type: DataTypes.STRING(45),
      defaultValue: '10.0.1.254',
      field: 'ip_range_end'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
      defaultValue: 'active'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'vm_pools',
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        fields: ['status']
      }
    ]
  });

  VMPool.associate = (models) => {
    VMPool.belongsToMany(models.Server, {
      through: 'ServerVMPool',
      foreignKey: 'poolId',
      as: 'servers'
    });
    
    VMPool.hasMany(models.VM, {
      foreignKey: 'poolId',
      as: 'vms'
    });
  };

  return VMPool;
};
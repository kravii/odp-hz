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
    maxVMs: {
      type: DataTypes.INTEGER,
      defaultValue: 300,
      comment: 'Maximum number of VMs in this pool'
    },
    currentVMs: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Current number of VMs'
    },
    ipRangeStart: {
      type: DataTypes.STRING(45),
      defaultValue: '10.0.1.1'
    },
    ipRangeEnd: {
      type: DataTypes.STRING(45),
      defaultValue: '10.0.1.254'
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
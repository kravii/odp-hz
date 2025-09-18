const { Sequelize } = require('sequelize');
const db = require('../config/database');

// Import models
const User = require('./User');
const Server = require('./Server');
const VMPool = require('./VMPool');
const K8sPool = require('./K8sPool');
const VM = require('./VM');
const K8sNode = require('./K8sNode');
const Namespace = require('./Namespace');
const ResourceQuota = require('./ResourceQuota');
const MonitoringData = require('./MonitoringData');
const Alert = require('./Alert');
const Notification = require('./Notification');

// Initialize models
const models = {
  User: User(db, Sequelize),
  Server: Server(db, Sequelize),
  VMPool: VMPool(db, Sequelize),
  K8sPool: K8sPool(db, Sequelize),
  VM: VM(db, Sequelize),
  K8sNode: K8sNode(db, Sequelize),
  Namespace: Namespace(db, Sequelize),
  ResourceQuota: ResourceQuota(db, Sequelize),
  MonitoringData: MonitoringData(db, Sequelize),
  Alert: Alert(db, Sequelize),
  Notification: Notification(db, Sequelize)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
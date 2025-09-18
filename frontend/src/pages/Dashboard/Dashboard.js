import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  Computer,
  Storage,
  AccountTree,
  People,
  TrendingUp,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';

const Dashboard = () => {
  const { data: serversData } = useQuery('servers', () =>
    axios.get('/api/servers').then(res => res.data)
  );

  const { data: vmsData } = useQuery('vms', () =>
    axios.get('/api/vms').then(res => res.data)
  );

  const { data: k8sData } = useQuery('k8s-pools', () =>
    axios.get('/api/kubernetes/pools').then(res => res.data)
  );

  const { data: usersData } = useQuery('users', () =>
    axios.get('/api/users').then(res => res.data)
  );

  const servers = serversData?.data || [];
  const vms = vmsData?.data || [];
  const k8sPools = k8sData?.data || [];
  const users = usersData?.data || [];

  const stats = [
    {
      title: 'Total Servers',
      value: servers.length,
      icon: <Computer />,
      color: '#1976d2',
    },
    {
      title: 'Baremetal with Monitoring',
      value: servers.filter(s => s.monitoringEnabled).length,
      icon: <Computer />,
      color: '#4caf50',
    },
    {
      title: 'Active VMs',
      value: vms.filter(vm => vm.status === 'running').length,
      icon: <Storage />,
      color: '#ff9800',
    },
    {
      title: 'K8s Clusters',
      value: k8sPools.length,
      icon: <AccountTree />,
      color: '#ff5722',
    },
    {
      title: 'Total Users',
      value: users.length,
      icon: <People />,
      color: '#9c27b0',
    },
  ];

  const recentAlerts = [
    { id: 1, message: 'Server dc-server-01 CPU usage high', severity: 'warning', time: '2 minutes ago' },
    { id: 2, message: 'VM vm-web-01 stopped unexpectedly', severity: 'critical', time: '15 minutes ago' },
    { id: 3, message: 'K8s node k8s-worker-02 joined cluster', severity: 'info', time: '1 hour ago' },
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#757575';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <Warning />;
      case 'warning': return <Warning />;
      case 'info': return <CheckCircle />;
      default: return <TrendingUp />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Statistics Cards */}
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: `${stat.color}20`,
                      color: stat.color,
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Server Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Baremetal Servers Status
            </Typography>
            <List dense>
              {servers.slice(0, 5).map((server) => (
                <ListItem key={server.id}>
                  <ListItemIcon>
                    <Computer color={server.healthStatus === 'healthy' ? 'success' : 'error'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={server.hostname}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {server.ipAddress} - {server.status}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Pool: {server.poolType === 'vm' && server.vmPool ? server.vmPool.name : 
                                 server.poolType === 'k8s' && server.k8sPool ? server.k8sPool.name : 
                                 'None'} | 
                          Monitoring: {server.monitoringEnabled ? 'Enabled' : 'Disabled'}
                        </Typography>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Chip
                      label={server.healthStatus}
                      size="small"
                      color={server.healthStatus === 'healthy' ? 'success' : 'error'}
                    />
                    <Chip
                      label={server.poolType.toUpperCase()}
                      size="small"
                      variant="outlined"
                      color={server.poolType === 'none' ? 'default' : 'primary'}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Recent Alerts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Alerts
            </Typography>
            <List dense>
              {recentAlerts.map((alert) => (
                <ListItem key={alert.id}>
                  <ListItemIcon>
                    <Box sx={{ color: getSeverityColor(alert.severity) }}>
                      {getSeverityIcon(alert.severity)}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={alert.message}
                    secondary={alert.time}
                  />
                  <Chip
                    label={alert.severity}
                    size="small"
                    sx={{ backgroundColor: getSeverityColor(alert.severity), color: 'white' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Resource Utilization */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Resource Utilization
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {servers.reduce((sum, server) => sum + server.allocatedCpu, 0)} / {servers.reduce((sum, server) => sum + server.totalCpu, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    CPU Cores Used
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary">
                    {servers.reduce((sum, server) => sum + server.allocatedMemory, 0)} / {servers.reduce((sum, server) => sum + server.totalMemory, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Memory (GB) Used
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {servers.reduce((sum, server) => sum + server.allocatedStorage, 0)} / {servers.reduce((sum, server) => sum + server.totalStorage, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Storage (GB) Used
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
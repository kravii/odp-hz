import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const Monitoring = () => {
  const [monitoringData, setMonitoringData] = useState([]);
  const [servers, setServers] = useState([]);
  const [vms, setVms] = useState([]);
  const [k8sNodes, setK8sNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResource, setSelectedResource] = useState('all');

  useEffect(() => {
    fetchMonitoringData();
    fetchResources();
  }, []);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring/data');
      if (response.ok) {
        const data = await response.json();
        setMonitoringData(data);
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const [serversRes, vmsRes, nodesRes] = await Promise.all([
        fetch('/api/servers'),
        fetch('/api/vms'),
        fetch('/api/kubernetes/nodes')
      ]);

      if (serversRes.ok) {
        const serversData = await serversRes.json();
        setServers(serversData);
      }

      if (vmsRes.ok) {
        const vmsData = await vmsRes.json();
        setVms(vmsData);
      }

      if (nodesRes.ok) {
        const nodesData = await nodesRes.json();
        setK8sNodes(nodesData);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'running':
      case 'ready': return 'success';
      case 'inactive':
      case 'stopped':
      case 'notready': return 'default';
      case 'maintenance':
      case 'provisioning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  // Sample data for charts (replace with real data)
  const cpuData = [
    { time: '00:00', cpu: 45 },
    { time: '04:00', cpu: 52 },
    { time: '08:00', cpu: 38 },
    { time: '12:00', cpu: 65 },
    { time: '16:00', cpu: 72 },
    { time: '20:00', cpu: 58 }
  ];

  const memoryData = [
    { time: '00:00', memory: 60 },
    { time: '04:00', memory: 65 },
    { time: '08:00', memory: 55 },
    { time: '12:00', memory: 70 },
    { time: '16:00', memory: 75 },
    { time: '20:00', memory: 68 }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Monitoring Dashboard
        </Typography>
        <Box>
          <IconButton onClick={fetchMonitoringData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Resource Overview Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Servers
              </Typography>
              <Typography variant="h4">
                {servers.length}
              </Typography>
              <Typography color="textSecondary">
                {servers.filter(s => s.status === 'active').length} Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total VMs
              </Typography>
              <Typography variant="h4">
                {vms.length}
              </Typography>
              <Typography color="textSecondary">
                {vms.filter(v => v.status === 'running').length} Running
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                K8s Nodes
              </Typography>
              <Typography variant="h4">
                {k8sNodes.length}
              </Typography>
              <Typography color="textSecondary">
                {k8sNodes.filter(n => n.status === 'ready').length} Ready
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Health Status
              </Typography>
              <Typography variant="h4" color="success.main">
                Healthy
              </Typography>
              <Typography color="textSecondary">
                All systems operational
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CPU Usage Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cpuData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cpu" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Memory Usage Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={memoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="memory" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Resource Status Tables */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Server Status
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Hostname</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Health</TableCell>
                      <TableCell>CPU Usage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {servers.slice(0, 5).map((server) => (
                      <TableRow key={server.id}>
                        <TableCell>{server.hostname}</TableCell>
                        <TableCell>
                          <Chip
                            label={server.status}
                            color={getStatusColor(server.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={server.healthStatus}
                            color={getHealthStatusColor(server.healthStatus)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ width: '100%' }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.random() * 100}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                VM Status
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Hostname</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Health</TableCell>
                      <TableCell>Memory Usage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vms.slice(0, 5).map((vm) => (
                      <TableRow key={vm.id}>
                        <TableCell>{vm.hostname}</TableCell>
                        <TableCell>
                          <Chip
                            label={vm.status}
                            color={getStatusColor(vm.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={vm.healthStatus}
                            color={getHealthStatusColor(vm.healthStatus)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ width: '100%' }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.random() * 100}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Monitoring;
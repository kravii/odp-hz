import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
} from '@mui/material';
import {
  Add,
  MoreVert,
  PlayArrow,
  Stop,
  Refresh,
  Delete,
  Assignment,
  Monitor,
  Storage,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const Servers = () => {
  const [open, setOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [monitoringDialogOpen, setMonitoringDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    hostname: '',
    ipAddress: '',
    totalCpu: '',
    totalMemory: '',
    totalStorage: '',
    osVersion: 'Rocky Linux 9',
    sshPort: 22,
    sshUser: 'root',
    poolType: 'none',
    poolId: '',
    enableMonitoring: false,
    installPackages: [],
  });
  const [poolData, setPoolData] = useState({
    poolType: 'vm',
    poolId: '',
  });
  const [monitoringData, setMonitoringData] = useState({
    packages: [],
  });
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data: serversData, isLoading } = useQuery('servers', () =>
    axios.get('/api/servers').then(res => res.data)
  );

  const { data: poolsData } = useQuery('available-pools', () =>
    axios.get('/api/servers/pools/available').then(res => res.data)
  );

  const addServerMutation = useMutation(
    (serverData) => axios.post('/api/servers', serverData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('servers');
        enqueueSnackbar('Server added successfully', { variant: 'success' });
        setOpen(false);
        resetForm();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to add server', { variant: 'error' });
      },
    }
  );

  const deleteServerMutation = useMutation(
    (id) => axios.delete(`/api/servers/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('servers');
        enqueueSnackbar('Server deleted successfully', { variant: 'success' });
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to delete server', { variant: 'error' });
      },
    }
  );

  const healthCheckMutation = useMutation(
    (id) => {
      console.log('Running health check for server:', id);
      return axios.post(`/api/servers/${id}/health-check`);
    },
    {
      onSuccess: (response) => {
        console.log('Health check successful:', response.data);
        queryClient.invalidateQueries('servers');
        enqueueSnackbar('Health check completed', { variant: 'success' });
      },
      onError: (error) => {
        console.error('Health check error:', error);
        const errorMessage = error.response?.data?.error || 'Health check failed';
        enqueueSnackbar(errorMessage, { variant: 'error' });
      },
    }
  );

  const assignPoolMutation = useMutation(
    ({ id, poolData }) => {
      console.log('Assigning pool:', { id, poolData });
      return axios.post(`/api/servers/${id}/assign-pool`, poolData);
    },
    {
      onSuccess: (response) => {
        console.log('Pool assignment successful:', response.data);
        queryClient.invalidateQueries('servers');
        enqueueSnackbar('Server assigned to pool successfully', { variant: 'success' });
        setPoolDialogOpen(false);
        setPoolData({ poolType: 'vm', poolId: '' });
      },
      onError: (error) => {
        console.error('Pool assignment error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to assign pool';
        enqueueSnackbar(errorMessage, { variant: 'error' });
      },
    }
  );

  const setupMonitoringMutation = useMutation(
    ({ id, monitoringData }) => {
      console.log('Setting up monitoring:', { id, monitoringData });
      return axios.post(`/api/servers/${id}/setup-monitoring`, monitoringData);
    },
    {
      onSuccess: (response) => {
        console.log('Monitoring setup successful:', response.data);
        queryClient.invalidateQueries('servers');
        enqueueSnackbar('Monitoring setup completed successfully', { variant: 'success' });
        setMonitoringDialogOpen(false);
        setMonitoringData({ packages: [] });
      },
      onError: (error) => {
        console.error('Monitoring setup error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to setup monitoring';
        enqueueSnackbar(errorMessage, { variant: 'error' });
      },
    }
  );

  const servers = serversData?.data || [];

  const columns = [
    { field: 'hostname', headerName: 'Hostname', width: 200 },
    { field: 'ipAddress', headerName: 'IP Address', width: 150 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'healthStatus', headerName: 'Health', width: 120 },
    { field: 'poolType', headerName: 'Pool Type', width: 120 },
    { 
      field: 'poolName', 
      headerName: 'Pool Name', 
      width: 150,
      renderCell: (params) => {
        const server = params.row;
        if (server.poolType === 'vm' && server.vmPool) {
          return server.vmPool.name;
        } else if (server.poolType === 'k8s' && server.k8sPool) {
          return server.k8sPool.name;
        }
        return 'None';
      }
    },
    { field: 'totalCpu', headerName: 'Total CPU', width: 100 },
    { field: 'totalMemory', headerName: 'Total Memory (GB)', width: 150 },
    { field: 'totalStorage', headerName: 'Total Storage (GB)', width: 150 },
    { field: 'allocatedCpu', headerName: 'Allocated CPU', width: 120 },
    { field: 'allocatedMemory', headerName: 'Allocated Memory (GB)', width: 150 },
    { field: 'allocatedStorage', headerName: 'Allocated Storage (GB)', width: 150 },
    { field: 'monitoringEnabled', headerName: 'Monitoring', width: 120 },
    { field: 'osVersion', headerName: 'OS Version', width: 150 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        <IconButton
          onClick={(e) => handleMenuOpen(e, params.row)}
          size="small"
        >
          <MoreVert />
        </IconButton>
      ),
    },
  ];

  const handleMenuOpen = (event, server) => {
    setAnchorEl(event.currentTarget);
    setSelectedServer(server);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedServer(null);
  };

  const handleAddServer = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      hostname: '',
      ipAddress: '',
      totalCpu: '',
      totalMemory: '',
      totalStorage: '',
      osVersion: 'Rocky Linux 9',
      sshPort: 22,
      sshUser: 'root',
      poolType: 'none',
      poolId: '',
      enableMonitoring: false,
      installPackages: [],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addServerMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (selectedServer) {
      deleteServerMutation.mutate(selectedServer.id);
    }
    handleMenuClose();
  };

  const handleHealthCheck = () => {
    if (selectedServer) {
      healthCheckMutation.mutate(selectedServer.id);
    }
    handleMenuClose();
  };

  const handleAssignPool = () => {
    setPoolDialogOpen(true);
    handleMenuClose();
  };

  const handleSetupMonitoring = () => {
    setMonitoringDialogOpen(true);
    handleMenuClose();
  };

  const handlePoolSubmit = () => {
    if (selectedServer) {
      assignPoolMutation.mutate({ 
        id: selectedServer.id, 
        poolData: {
          poolType: poolData.poolType,
          poolId: poolData.poolId
        }
      });
    }
  };

  const handleMonitoringSubmit = () => {
    if (selectedServer) {
      setupMonitoringMutation.mutate({ 
        id: selectedServer.id, 
        monitoringData: {
          packages: monitoringData.packages
        }
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'maintenance': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Servers</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddServer}
        >
          Add Server
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {servers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Servers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {servers.filter(s => s.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Servers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {servers.filter(s => s.healthStatus === 'warning').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Warning Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="error.main">
                {servers.filter(s => s.healthStatus === 'critical').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Critical Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Servers Table */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={servers}
          columns={columns}
          loading={isLoading}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Box>

      {/* Add Server Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Add New Server</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Hostname"
                  name="hostname"
                  value={formData.hostname}
                  onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="IP Address"
                  name="ipAddress"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Total CPU Cores"
                  name="totalCpu"
                  type="number"
                  value={formData.totalCpu}
                  onChange={(e) => setFormData({ ...formData, totalCpu: parseInt(e.target.value) })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Total Memory (GB)"
                  name="totalMemory"
                  type="number"
                  value={formData.totalMemory}
                  onChange={(e) => setFormData({ ...formData, totalMemory: parseInt(e.target.value) })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Total Storage (GB)"
                  name="totalStorage"
                  type="number"
                  value={formData.totalStorage}
                  onChange={(e) => setFormData({ ...formData, totalStorage: parseInt(e.target.value) })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="OS Version"
                  name="osVersion"
                  value={formData.osVersion}
                  onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="SSH Port"
                  name="sshPort"
                  type="number"
                  value={formData.sshPort}
                  onChange={(e) => setFormData({ ...formData, sshPort: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="SSH User"
                  name="sshUser"
                  value={formData.sshUser}
                  onChange={(e) => setFormData({ ...formData, sshUser: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Pool Assignment
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Pool Type</InputLabel>
                  <Select
                    value={formData.poolType}
                    onChange={(e) => setFormData({ ...formData, poolType: e.target.value, poolId: '' })}
                    label="Pool Type"
                  >
                    <MenuItem value="none">No Pool</MenuItem>
                    <MenuItem value="vm">VM Pool</MenuItem>
                    <MenuItem value="k8s">Kubernetes Pool</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={formData.poolType === 'none'}>
                  <InputLabel>Select Pool</InputLabel>
                  <Select
                    value={formData.poolId}
                    onChange={(e) => setFormData({ ...formData, poolId: e.target.value })}
                    label="Select Pool"
                  >
                    {formData.poolType === 'vm' && poolsData?.data?.vmPools?.map((pool) => (
                      <MenuItem key={pool.id} value={pool.id}>
                        {pool.name} - {pool.totalCpu} CPU, {pool.totalMemory}GB RAM
                      </MenuItem>
                    ))}
                    {formData.poolType === 'k8s' && poolsData?.data?.k8sPools?.map((pool) => (
                      <MenuItem key={pool.id} value={pool.id}>
                        {pool.name} ({pool.clusterName}) - {pool.totalCpu} CPU, {pool.totalMemory}GB RAM
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Monitoring & Packages
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.enableMonitoring}
                      onChange={(e) => setFormData({ ...formData, enableMonitoring: e.target.checked })}
                    />
                  }
                  label="Enable Monitoring"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Select Packages to Install:
                </Typography>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.installPackages.includes('prometheus')}
                        onChange={(e) => {
                          const packages = e.target.checked
                            ? [...formData.installPackages, 'prometheus']
                            : formData.installPackages.filter(p => p !== 'prometheus');
                          setFormData({ ...formData, installPackages: packages });
                        }}
                      />
                    }
                    label="Prometheus"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.installPackages.includes('grafana')}
                        onChange={(e) => {
                          const packages = e.target.checked
                            ? [...formData.installPackages, 'grafana']
                            : formData.installPackages.filter(p => p !== 'grafana');
                          setFormData({ ...formData, installPackages: packages });
                        }}
                      />
                    }
                    label="Grafana"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.installPackages.includes('node-exporter')}
                        onChange={(e) => {
                          const packages = e.target.checked
                            ? [...formData.installPackages, 'node-exporter']
                            : formData.installPackages.filter(p => p !== 'node-exporter');
                          setFormData({ ...formData, installPackages: packages });
                        }}
                      />
                    }
                    label="Node Exporter"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.installPackages.includes('docker')}
                        onChange={(e) => {
                          const packages = e.target.checked
                            ? [...formData.installPackages, 'docker']
                            : formData.installPackages.filter(p => p !== 'docker');
                          setFormData({ ...formData, installPackages: packages });
                        }}
                      />
                    }
                    label="Docker"
                  />
                </FormGroup>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={addServerMutation.isLoading}>
              {addServerMutation.isLoading ? 'Adding...' : 'Add Server'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleHealthCheck}>
          <Refresh sx={{ mr: 1 }} />
          Health Check
        </MenuItem>
        <MenuItem onClick={handleAssignPool}>
          <Assignment sx={{ mr: 1 }} />
          Assign to Pool
        </MenuItem>
        <MenuItem onClick={handleSetupMonitoring}>
          <Monitor sx={{ mr: 1 }} />
          Setup Monitoring
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Pool Assignment Dialog */}
      <Dialog open={poolDialogOpen} onClose={() => setPoolDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Server to Pool</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Pool Type</InputLabel>
                <Select
                  value={poolData.poolType}
                  onChange={(e) => setPoolData({ ...poolData, poolType: e.target.value, poolId: '' })}
                  label="Pool Type"
                >
                  <MenuItem value="vm">VM Pool</MenuItem>
                  <MenuItem value="k8s">Kubernetes Pool</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Pool</InputLabel>
                <Select
                  value={poolData.poolId}
                  onChange={(e) => setPoolData({ ...poolData, poolId: e.target.value })}
                  label="Select Pool"
                >
                  {poolData.poolType === 'vm' && poolsData?.data?.vmPools?.map((pool) => (
                    <MenuItem key={pool.id} value={pool.id}>
                      {pool.name} - {pool.totalCpu} CPU, {pool.totalMemory}GB RAM
                    </MenuItem>
                  ))}
                  {poolData.poolType === 'k8s' && poolsData?.data?.k8sPools?.map((pool) => (
                    <MenuItem key={pool.id} value={pool.id}>
                      {pool.name} ({pool.clusterName}) - {pool.totalCpu} CPU, {pool.totalMemory}GB RAM
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoolDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handlePoolSubmit} 
            variant="contained" 
            disabled={assignPoolMutation.isLoading || !poolData.poolId}
          >
            {assignPoolMutation.isLoading ? 'Assigning...' : 'Assign to Pool'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Monitoring Setup Dialog */}
      <Dialog open={monitoringDialogOpen} onClose={() => setMonitoringDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Setup Monitoring on Server</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Select Packages to Install
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={monitoringData.packages.includes('prometheus')}
                      onChange={(e) => {
                        const packages = e.target.checked
                          ? [...monitoringData.packages, 'prometheus']
                          : monitoringData.packages.filter(p => p !== 'prometheus');
                        setMonitoringData({ ...monitoringData, packages });
                      }}
                    />
                  }
                  label="Prometheus (Monitoring)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={monitoringData.packages.includes('grafana')}
                      onChange={(e) => {
                        const packages = e.target.checked
                          ? [...monitoringData.packages, 'grafana']
                          : monitoringData.packages.filter(p => p !== 'grafana');
                        setMonitoringData({ ...monitoringData, packages });
                      }}
                    />
                  }
                  label="Grafana (Visualization)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={monitoringData.packages.includes('node-exporter')}
                      onChange={(e) => {
                        const packages = e.target.checked
                          ? [...monitoringData.packages, 'node-exporter']
                          : monitoringData.packages.filter(p => p !== 'node-exporter');
                        setMonitoringData({ ...monitoringData, packages });
                      }}
                    />
                  }
                  label="Node Exporter (System Metrics)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={monitoringData.packages.includes('docker')}
                      onChange={(e) => {
                        const packages = e.target.checked
                          ? [...monitoringData.packages, 'docker']
                          : monitoringData.packages.filter(p => p !== 'docker');
                        setMonitoringData({ ...monitoringData, packages });
                      }}
                    />
                  }
                  label="Docker (Container Runtime)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={monitoringData.packages.includes('kubectl')}
                      onChange={(e) => {
                        const packages = e.target.checked
                          ? [...monitoringData.packages, 'kubectl']
                          : monitoringData.packages.filter(p => p !== 'kubectl');
                        setMonitoringData({ ...monitoringData, packages });
                      }}
                    />
                  }
                  label="Kubectl (Kubernetes CLI)"
                />
              </FormGroup>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                This will install the selected packages and configure monitoring on the server.
                The server will be accessible via SSH using the configured credentials.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMonitoringDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleMonitoringSubmit} 
            variant="contained" 
            disabled={setupMonitoringMutation.isLoading}
          >
            {setupMonitoringMutation.isLoading ? 'Setting up...' : 'Setup Monitoring'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Servers;
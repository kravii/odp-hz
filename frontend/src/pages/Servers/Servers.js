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
} from '@mui/material';
import {
  Add,
  MoreVert,
  PlayArrow,
  Stop,
  Refresh,
  Delete,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const Servers = () => {
  const [open, setOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [formData, setFormData] = useState({
    hostname: '',
    ipAddress: '',
    totalCpu: '',
    totalMemory: '',
    totalStorage: '',
    osVersion: 'Rocky Linux 9',
    sshPort: 22,
    sshUser: 'root',
  });
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data: serversData, isLoading } = useQuery('servers', () =>
    axios.get('/api/servers').then(res => res.data)
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
    (id) => axios.post(`/api/servers/${id}/health-check`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('servers');
        enqueueSnackbar('Health check completed', { variant: 'success' });
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Health check failed', { variant: 'error' });
      },
    }
  );

  const servers = serversData?.data || [];

  const columns = [
    { field: 'hostname', headerName: 'Hostname', width: 200 },
    { field: 'ipAddress', headerName: 'IP Address', width: 150 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'healthStatus', headerName: 'Health', width: 120 },
    { field: 'totalCpu', headerName: 'Total CPU', width: 100 },
    { field: 'totalMemory', headerName: 'Total Memory (GB)', width: 150 },
    { field: 'totalStorage', headerName: 'Total Storage (GB)', width: 150 },
    { field: 'allocatedCpu', headerName: 'Allocated CPU', width: 120 },
    { field: 'allocatedMemory', headerName: 'Allocated Memory (GB)', width: 150 },
    { field: 'allocatedStorage', headerName: 'Allocated Storage (GB)', width: 150 },
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
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Servers;
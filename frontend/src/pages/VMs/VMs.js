import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';

const VMs = () => {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    hostname: '',
    cpuCores: '',
    memoryGb: '',
    storageGb: '',
    osImage: 'rockylinux9',
    sshKey: ''
  });

  useEffect(() => {
    fetchVMs();
  }, []);

  const fetchVMs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vms');
      if (response.ok) {
        const data = await response.json();
        setVms(data);
      }
    } catch (error) {
      console.error('Error fetching VMs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVM = async () => {
    try {
      const response = await fetch('/api/vms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setOpen(false);
        setFormData({
          hostname: '',
          cpuCores: '',
          memoryGb: '',
          storageGb: '',
          osImage: 'rockylinux9',
          sshKey: ''
        });
        fetchVMs();
      }
    } catch (error) {
      console.error('Error creating VM:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'default';
      case 'starting': return 'warning';
      case 'stopping': return 'warning';
      case 'error': return 'error';
      case 'provisioning': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Virtual Machines
        </Typography>
        <Box>
          <IconButton onClick={fetchVMs} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ ml: 1 }}
          >
            Create VM
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Hostname</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>CPU Cores</TableCell>
                  <TableCell>Memory (GB)</TableCell>
                  <TableCell>Storage (GB)</TableCell>
                  <TableCell>OS Image</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vms.map((vm) => (
                  <TableRow key={vm.id}>
                    <TableCell>{vm.hostname}</TableCell>
                    <TableCell>{vm.ipAddress}</TableCell>
                    <TableCell>
                      <Chip
                        label={vm.status}
                        color={getStatusColor(vm.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{vm.cpuCores}</TableCell>
                    <TableCell>{vm.memoryGb}</TableCell>
                    <TableCell>{vm.storageGb}</TableCell>
                    <TableCell>{vm.osImage}</TableCell>
                    <TableCell>
                      {new Date(vm.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New VM</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Hostname"
              value={formData.hostname}
              onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="CPU Cores"
              type="number"
              value={formData.cpuCores}
              onChange={(e) => setFormData({ ...formData, cpuCores: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Memory (GB)"
              type="number"
              value={formData.memoryGb}
              onChange={(e) => setFormData({ ...formData, memoryGb: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Storage (GB)"
              type="number"
              value={formData.storageGb}
              onChange={(e) => setFormData({ ...formData, storageGb: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>OS Image</InputLabel>
              <Select
                value={formData.osImage}
                onChange={(e) => setFormData({ ...formData, osImage: e.target.value })}
              >
                <MenuItem value="rockylinux9">Rocky Linux 9</MenuItem>
                <MenuItem value="rhel9">Red Hat Enterprise Linux 9</MenuItem>
                <MenuItem value="ubuntu22">Ubuntu 22.04</MenuItem>
                <MenuItem value="ubuntu24">Ubuntu 24.04</MenuItem>
                <MenuItem value="centos7">CentOS 7</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="SSH Public Key"
              multiline
              rows={3}
              value={formData.sshKey}
              onChange={(e) => setFormData({ ...formData, sshKey: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateVM} variant="contained">
            Create VM
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VMs;
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
  Tabs,
  Tab,
  Grid
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';

const Kubernetes = () => {
  const [k8sPools, setK8sPools] = useState([]);
  const [k8sNodes, setK8sNodes] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    clusterName: '',
    kubernetesVersion: '1.28.0',
    masterNodes: 3,
    workerNodes: 0,
    totalCpu: '',
    totalMemory: '',
    totalStorage: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [poolsRes, nodesRes, namespacesRes] = await Promise.all([
        fetch('/api/kubernetes/pools'),
        fetch('/api/kubernetes/nodes'),
        fetch('/api/kubernetes/namespaces')
      ]);

      if (poolsRes.ok) {
        const poolsData = await poolsRes.json();
        setK8sPools(poolsData);
      }

      if (nodesRes.ok) {
        const nodesData = await nodesRes.json();
        setK8sNodes(nodesData);
      }

      if (namespacesRes.ok) {
        const namespacesData = await namespacesRes.json();
        setNamespaces(namespacesData);
      }
    } catch (error) {
      console.error('Error fetching Kubernetes data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async () => {
    try {
      const response = await fetch('/api/kubernetes/pools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setOpen(false);
        setFormData({
          name: '',
          clusterName: '',
          kubernetesVersion: '1.28.0',
          masterNodes: 3,
          workerNodes: 0,
          totalCpu: '',
          totalMemory: '',
          totalStorage: ''
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating K8s pool:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'provisioning': return 'warning';
      case 'inactive': return 'default';
      case 'maintenance': return 'info';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const TabPanel = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`k8s-tabpanel-${index}`}
      aria-labelledby={`k8s-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Kubernetes Management
        </Typography>
        <Box>
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ ml: 1 }}
          >
            Create Pool
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Pools" />
              <Tab label="Nodes" />
              <Tab label="Namespaces" />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Cluster Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>K8s Version</TableCell>
                    <TableCell>Master Nodes</TableCell>
                    <TableCell>Worker Nodes</TableCell>
                    <TableCell>Total CPU</TableCell>
                    <TableCell>Total Memory</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {k8sPools.map((pool) => (
                    <TableRow key={pool.id}>
                      <TableCell>{pool.name}</TableCell>
                      <TableCell>{pool.clusterName}</TableCell>
                      <TableCell>
                        <Chip
                          label={pool.status}
                          color={getStatusColor(pool.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{pool.kubernetesVersion}</TableCell>
                      <TableCell>{pool.masterNodes}</TableCell>
                      <TableCell>{pool.workerNodes}</TableCell>
                      <TableCell>{pool.totalCpu}</TableCell>
                      <TableCell>{pool.totalMemory} GB</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Node Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Kubelet Version</TableCell>
                    <TableCell>OS Image</TableCell>
                    <TableCell>CPU Capacity</TableCell>
                    <TableCell>Memory Capacity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {k8sNodes.map((node) => (
                    <TableRow key={node.id}>
                      <TableCell>{node.nodeName}</TableCell>
                      <TableCell>
                        <Chip
                          label={node.role}
                          color={node.role === 'master' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={node.status}
                          color={getStatusColor(node.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{node.kubeletVersion}</TableCell>
                      <TableCell>{node.osImage}</TableCell>
                      <TableCell>{node.cpuCapacity}</TableCell>
                      <TableCell>{node.memoryCapacity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Display Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>CPU Limit</TableCell>
                    <TableCell>Memory Limit</TableCell>
                    <TableCell>Storage Limit</TableCell>
                    <TableCell>Current Pods</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {namespaces.map((namespace) => (
                    <TableRow key={namespace.id}>
                      <TableCell>{namespace.name}</TableCell>
                      <TableCell>{namespace.displayName}</TableCell>
                      <TableCell>
                        <Chip
                          label={namespace.status}
                          color={getStatusColor(namespace.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{namespace.cpuLimit}</TableCell>
                      <TableCell>{namespace.memoryLimit} MB</TableCell>
                      <TableCell>{namespace.storageLimit} GB</TableCell>
                      <TableCell>{namespace.currentPods}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Kubernetes Pool</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Pool Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cluster Name"
                  value={formData.clusterName}
                  onChange={(e) => setFormData({ ...formData, clusterName: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Kubernetes Version"
                  value={formData.kubernetesVersion}
                  onChange={(e) => setFormData({ ...formData, kubernetesVersion: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Master Nodes"
                  type="number"
                  value={formData.masterNodes}
                  onChange={(e) => setFormData({ ...formData, masterNodes: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Worker Nodes"
                  type="number"
                  value={formData.workerNodes}
                  onChange={(e) => setFormData({ ...formData, workerNodes: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Total CPU"
                  type="number"
                  value={formData.totalCpu}
                  onChange={(e) => setFormData({ ...formData, totalCpu: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Total Memory (GB)"
                  type="number"
                  value={formData.totalMemory}
                  onChange={(e) => setFormData({ ...formData, totalMemory: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Total Storage (GB)"
                  type="number"
                  value={formData.totalStorage}
                  onChange={(e) => setFormData({ ...formData, totalStorage: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreatePool} variant="contained">
            Create Pool
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Kubernetes;
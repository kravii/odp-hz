import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Servers from './pages/Servers/Servers';
import VMs from './pages/VMs/VMs';
import Kubernetes from './pages/Kubernetes/Kubernetes';
import Users from './pages/Users/Users';
import Monitoring from './pages/Monitoring/Monitoring';
import Profile from './pages/Profile/Profile';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <div>Loading...</div>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        <Route
          path="/*"
          element={
            user ? (
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/servers" element={<Servers />} />
                  <Route path="/vms" element={<VMs />} />
                  <Route path="/kubernetes" element={<Kubernetes />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/monitoring" element={<Monitoring />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Box>
  );
}

export default App;
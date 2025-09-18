# API Documentation

This document provides comprehensive API documentation for the Internal DC Management System.

## Base URL

- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

## Authentication

All API endpoints (except auth endpoints) require authentication via JWT token.

### Headers

```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "user|admin"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string"
  }
}
```

#### POST /api/auth/login
Login user.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string"
  }
}
```

#### GET /api/auth/me
Get current user information.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string",
    "isActive": true,
    "lastLogin": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /api/auth/profile
Update user profile.

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "sshPublicKey": "string"
}
```

### Servers

#### GET /api/servers
Get all servers.

**Query Parameters:**
- `status`: Filter by status (active, inactive, maintenance, error)
- `healthStatus`: Filter by health status (healthy, warning, critical)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "hostname": "server-01",
      "ipAddress": "10.0.1.10",
      "status": "active",
      "healthStatus": "healthy",
      "totalCpu": 16,
      "totalMemory": 64,
      "totalStorage": 1536,
      "allocatedCpu": 8,
      "allocatedMemory": 32,
      "allocatedStorage": 768,
      "osVersion": "Rocky Linux 9",
      "lastHealthCheck": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/servers/:id
Get server by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "hostname": "server-01",
    "ipAddress": "10.0.1.10",
    "status": "active",
    "healthStatus": "healthy",
    "totalCpu": 16,
    "totalMemory": 64,
    "totalStorage": 1536,
    "allocatedCpu": 8,
    "allocatedMemory": 32,
    "allocatedStorage": 768,
    "osVersion": "Rocky Linux 9",
    "lastHealthCheck": "2024-01-01T00:00:00Z",
    "vmPools": [],
    "k8sPools": []
  }
}
```

#### POST /api/servers
Add new server (Admin only).

**Request Body:**
```json
{
  "hostname": "string",
  "ipAddress": "string",
  "totalCpu": 16,
  "totalMemory": 64,
  "totalStorage": 1536,
  "osVersion": "Rocky Linux 9",
  "sshPort": 22,
  "sshUser": "root"
}
```

#### PUT /api/servers/:id
Update server (Admin only).

#### DELETE /api/servers/:id
Delete server (Admin only).

#### POST /api/servers/:id/health-check
Perform health check on server.

### VMs

#### GET /api/vms
Get all VMs.

**Query Parameters:**
- `status`: Filter by status (running, stopped, starting, stopping, error, provisioning)
- `poolId`: Filter by VM pool ID
- `userId`: Filter by user ID (non-admin users can only see their own VMs)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "hostname": "vm-web-01",
      "ipAddress": "10.0.1.100",
      "status": "running",
      "cpuCores": 2,
      "memoryGb": 4,
      "storageGb": 50,
      "osImage": "ubuntu22",
      "mountPoints": [
        {
          "path": "/",
          "size": "30G"
        },
        {
          "path": "/var",
          "size": "20G"
        }
      ],
      "defaultUser": "acceldata",
      "provisionedAt": "2024-01-01T00:00:00Z",
      "server": {
        "hostname": "server-01",
        "ipAddress": "10.0.1.10"
      },
      "creator": {
        "username": "admin",
        "firstName": "Admin",
        "lastName": "User"
      }
    }
  ]
}
```

#### GET /api/vms/:id
Get VM by ID.

#### POST /api/vms
Create new VM.

**Request Body:**
```json
{
  "hostname": "string",
  "cpuCores": 2,
  "memoryGb": 4,
  "storageGb": 50,
  "osImage": "ubuntu22",
  "mountPoints": [
    {
      "path": "/",
      "size": "30G"
    }
  ],
  "poolId": 1
}
```

#### PUT /api/vms/:id
Update VM.

#### DELETE /api/vms/:id
Delete VM.

#### POST /api/vms/:id/start
Start VM.

#### POST /api/vms/:id/stop
Stop VM.

### Kubernetes

#### GET /api/kubernetes/pools
Get all K8s pools.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "production-k8s",
      "description": "Production Kubernetes cluster",
      "clusterName": "dc-cluster",
      "kubernetesVersion": "1.28.0",
      "totalCpu": 48,
      "totalMemory": 192,
      "totalStorage": 4608,
      "allocatedCpu": 24,
      "allocatedMemory": 96,
      "allocatedStorage": 2304,
      "masterNodes": 3,
      "workerNodes": 3,
      "status": "active",
      "apiServerEndpoint": "https://dc-cluster-lb:6443",
      "servers": [],
      "nodes": [],
      "namespaces": []
    }
  ]
}
```

#### GET /api/kubernetes/pools/:id
Get K8s pool by ID.

#### POST /api/kubernetes/pools
Create new K8s pool (Admin only).

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "clusterName": "string",
  "kubernetesVersion": "1.28.0",
  "masterNodes": 3,
  "serverIds": [1, 2, 3]
}
```

#### PUT /api/kubernetes/pools/:id
Update K8s pool (Admin only).

#### DELETE /api/kubernetes/pools/:id
Delete K8s pool (Admin only).

#### POST /api/kubernetes/pools/:id/add-server
Add server to K8s pool (Admin only).

**Request Body:**
```json
{
  "serverId": 1
}
```

#### POST /api/kubernetes/pools/:id/remove-server
Remove server from K8s pool (Admin only).

**Request Body:**
```json
{
  "serverId": 1
}
```

#### GET /api/kubernetes/nodes
Get all K8s nodes.

**Query Parameters:**
- `poolId`: Filter by pool ID
- `role`: Filter by role (master, worker)
- `status`: Filter by status (ready, notready, unknown, provisioning, error)

#### GET /api/kubernetes/nodes/:id
Get K8s node by ID.

### Users

#### GET /api/users
Get all users (Admin only).

**Query Parameters:**
- `role`: Filter by role (admin, user)
- `isActive`: Filter by active status

#### GET /api/users/:id
Get user by ID (Admin only).

#### POST /api/users
Create new user (Admin only).

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "user",
  "sshPublicKey": "string"
}
```

#### PUT /api/users/:id
Update user (Admin only).

#### DELETE /api/users/:id
Delete user (Admin only).

#### POST /api/users/:id/reset-password
Reset user password (Admin only).

**Request Body:**
```json
{
  "newPassword": "string"
}
```

#### GET /api/users/:id/namespaces
Get user namespaces.

#### POST /api/users/:id/namespaces
Create namespace for user (Admin only).

**Request Body:**
```json
{
  "name": "string",
  "displayName": "string",
  "description": "string",
  "cpuLimit": 1000,
  "memoryLimit": 2048,
  "storageLimit": 100,
  "cpuRequest": 500,
  "memoryRequest": 1024,
  "storageRequest": 50,
  "podLimit": 10,
  "poolId": 1
}
```

#### PUT /api/users/:id/namespaces/:namespaceId
Update namespace resource limits (Admin only).

#### DELETE /api/users/:id/namespaces/:namespaceId
Delete namespace (Admin only).

### Monitoring

#### GET /api/monitoring/data
Get monitoring data.

**Query Parameters:**
- `resourceType`: Filter by resource type (server, vm, k8s_node)
- `resourceId`: Filter by resource ID
- `startTime`: Start time for data range
- `endTime`: End time for data range
- `limit`: Number of records to return

**Response:**
```json
{
  "success": true,
  "count": 100,
  "data": [
    {
      "id": 1,
      "resourceType": "server",
      "resourceId": 1,
      "cpuUsage": 45.2,
      "memoryUsage": 67.8,
      "storageUsage": 23.4,
      "networkInBytes": 1024000,
      "networkOutBytes": 2048000,
      "diskReadOps": 150,
      "diskWriteOps": 75,
      "loadAverage1m": 1.2,
      "temperature": 45.5,
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/monitoring/data
Submit monitoring data.

**Request Body:**
```json
{
  "resourceType": "server",
  "resourceId": 1,
  "cpuUsage": 45.2,
  "memoryUsage": 67.8,
  "storageUsage": 23.4,
  "networkInBytes": 1024000,
  "networkOutBytes": 2048000,
  "diskReadOps": 150,
  "diskWriteOps": 75,
  "loadAverage1m": 1.2,
  "temperature": 45.5
}
```

### Notifications

#### GET /api/notifications/alerts
Get all alerts.

**Query Parameters:**
- `status`: Filter by status (active, inactive, firing, resolved)
- `severity`: Filter by severity (info, warning, critical)
- `resourceType`: Filter by resource type

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "name": "High CPU Usage",
      "description": "Alert when CPU usage exceeds 80%",
      "resourceType": "server",
      "resourceId": 1,
      "metric": "cpu",
      "threshold": 80.0,
      "operator": ">",
      "duration": 300,
      "severity": "warning",
      "status": "active",
      "lastFired": null,
      "fireCount": 0,
      "notifications": []
    }
  ]
}
```

#### GET /api/notifications/alerts/:id
Get alert by ID.

#### POST /api/notifications/alerts
Create new alert (Admin only).

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "resourceType": "server",
  "resourceId": 1,
  "metric": "cpu",
  "threshold": 80.0,
  "operator": ">",
  "duration": 300,
  "severity": "warning",
  "labels": {},
  "annotations": {}
}
```

#### PUT /api/notifications/alerts/:id
Update alert (Admin only).

#### DELETE /api/notifications/alerts/:id
Delete alert (Admin only).

#### POST /api/notifications/alerts/:id/test
Test alert notification (Admin only).

#### GET /api/notifications/history
Get notification history.

**Query Parameters:**
- `status`: Filter by status (pending, sent, failed, retrying)
- `type`: Filter by type (slack, email, webhook)
- `limit`: Number of records to return

#### POST /api/notifications/slack/test
Test Slack integration (Admin only).

**Request Body:**
```json
{
  "channel": "string",
  "message": "string"
}
```

#### GET /api/notifications/slack/channels
Get Slack channels (Admin only).

#### POST /api/notifications/webhook/test
Test webhook notification (Admin only).

**Request Body:**
```json
{
  "url": "string",
  "payload": {}
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Invalid or missing authentication token
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `409`: Conflict - Resource already exists
- `500`: Internal Server Error - Server error

## Rate Limiting

API requests are rate limited to 100 requests per 15 minutes per IP address.

## WebSocket Events

The system supports real-time updates via WebSocket connections.

### Connection

```javascript
const socket = io('ws://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

### Events

#### Join Room
```javascript
socket.emit('join-room', 'servers');
socket.emit('join-room', 'vms');
socket.emit('join-room', 'kubernetes');
```

#### Server Updates
```javascript
socket.on('server-updated', (data) => {
  console.log('Server updated:', data);
});
```

#### VM Updates
```javascript
socket.on('vm-updated', (data) => {
  console.log('VM updated:', data);
});
```

#### Alert Notifications
```javascript
socket.on('alert-fired', (data) => {
  console.log('Alert fired:', data);
});

socket.on('alert-resolved', (data) => {
  console.log('Alert resolved:', data);
});
```

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class DCManagementClient {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getServers() {
    const response = await this.client.get('/api/servers');
    return response.data;
  }

  async createVM(vmData) {
    const response = await this.client.post('/api/vms', vmData);
    return response.data;
  }

  async getMonitoringData(resourceType, resourceId) {
    const response = await this.client.get('/api/monitoring/data', {
      params: { resourceType, resourceId }
    });
    return response.data;
  }
}

// Usage
const client = new DCManagementClient('http://localhost:3001', 'your-jwt-token');
const servers = await client.getServers();
```

### Python

```python
import requests

class DCManagementClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_servers(self):
        response = requests.get(
            f'{self.base_url}/api/servers',
            headers=self.headers
        )
        return response.json()
    
    def create_vm(self, vm_data):
        response = requests.post(
            f'{self.base_url}/api/vms',
            json=vm_data,
            headers=self.headers
        )
        return response.json()

# Usage
client = DCManagementClient('http://localhost:3001', 'your-jwt-token')
servers = client.get_servers()
```

This API documentation provides comprehensive information about all available endpoints, request/response formats, and usage examples for the Internal DC Management System.
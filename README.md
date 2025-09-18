# Internal Data Center Management System

A comprehensive solution for managing VMs and Kubernetes clusters on Hetzner baremetal servers.

## Features

### Server Management
- Add/remove baremetal servers to VM or K8s pools
- Resource allocation (RAM/CPU/Storage) with 1.5TB storage per server
- Support for up to 200 baremetal servers
- Health monitoring dashboard

### VM Management
- Provision VMs with customizable resources
- Support for multiple OS images (CentOS7, RHEL7/8/9, RockyLinux9, Ubuntu20/22/24, OEL8.10)
- Up to 300 VMs with IP range management
- Default user `acceldata` with SSH key configuration

### Kubernetes Cluster Management
- Automated K8s setup with HA control plane (3 nodes)
- Resource pooling from multiple servers
- GUI for adding/removing nodes
- User namespace management with resource quotas

### Monitoring & Alerts
- Real-time monitoring of baremetal servers and VMs
- CPU/Memory/Storage/IO-OPS tracking
- Slack notifications for alerts and threshold breaches
- Health dashboard with hostname/IP tracking

### User Management
- Admin and user roles
- Namespace configuration per user
- Resource allocation and scaling capabilities

## Technology Stack

- **Backend**: Node.js/Express with MySQL
- **Frontend**: React with Material-UI
- **Container Orchestration**: Kubernetes with Rancher
- **Package Management**: Helm charts
- **Monitoring**: Prometheus + Grafana
- **CLI Tools**: kubectl, k9s, Telepresence

## Quick Start

### Prerequisites
- Mac with Docker Desktop
- MySQL database
- Access to Hetzner baremetal servers (Rocky Linux 9)
- Private SSH key for server access

### Local Development Setup

1. Clone the repository
```bash
git clone <repository-url>
cd internal-dc-management
```

2. Install dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Configure environment variables
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your database and server credentials
```

4. Start the development environment
```bash
# Start MySQL (if using Docker)
docker-compose up -d mysql

# Start backend
cd backend
npm run dev

# Start frontend (in new terminal)
cd frontend
npm start
```

### Manual Setup on Baremetal Servers

See [MANUAL_SETUP.md](docs/MANUAL_SETUP.md) for detailed step-by-step instructions.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   MySQL DB      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Baremetal     │
                       │   Servers       │
                       │   (Rocky Linux) │
                       └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │   VM Pool   │ │   K8s Pool  │ │ Monitoring  │
            │             │ │             │ │   Agents    │
            └─────────────┘ └─────────────┘ └─────────────┘
```

## Documentation

- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Monitoring Setup](docs/MONITORING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.
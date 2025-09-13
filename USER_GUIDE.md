# OpsGraph User Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [Core Features](#core-features)
5. [User Roles and Permissions](#user-roles-and-permissions)
6. [Ticket Management](#ticket-management)
7. [Asset Management](#asset-management)
8. [Knowledge Graph](#knowledge-graph)
9. [Alerting and Events](#alerting-and-events)
10. [Admin Features](#admin-features)
11. [Mobile App](#mobile-app)
12. [API Reference](#api-reference)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)

## Overview

OpsGraph is an enterprise-grade ticket management and knowledge graph system designed for operational facilities like fuel stations, retail locations, and industrial sites. It combines traditional ticketing with intelligent graph-based analytics to provide deep insights into asset relationships, failure patterns, and operational dependencies.

### Key Capabilities

- **Unified Ticketing**: Comprehensive ticket lifecycle management with privacy controls, watchers, and SLA tracking
- **Knowledge Graph**: SQL Server Graph-based asset modeling with relationship tracking and co-failure analysis
- **Real-time Monitoring**: Event ingestion, alert generation, and live updates via Server-Sent Events (SSE)
- **Semantic Search**: AI-powered search across assets, tickets, and knowledge base
- **Multi-site Management**: Site-based access control with row-level security (RLS)
- **Mobile Support**: Native mobile app for field technicians and managers
- **Advanced Analytics**: Blast radius analysis, centrality metrics, and predictive maintenance insights

### Architecture

The system consists of:
- **Database**: SQL Server 2019+ with graph capabilities
- **API Backend**: Node.js/Fastify with TypeScript
- **Worker Services**: Python-based background processing
- **Web UI**: Next.js/React with Chakra UI
- **Mobile App**: React Native/Expo
- **Real-time**: Server-Sent Events for live updates

## Getting Started

### System Requirements

- Docker and Docker Compose
- 8GB RAM minimum (16GB recommended)
- SQL Server 2019+ compatible environment
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Quick Start

1. **Clone and Start Services**
   ```bash
   git clone <repository-url>
   cd TicketKnowLedgegraph
   docker-compose up --build
   ```

2. **Access the Application**
   - Web UI: http://localhost:3002
   - API: http://localhost:3001
   - API Documentation: http://localhost:3001/documentation
   - Worker Health: http://localhost:8000/health

3. **Database Setup**
   The database schema is automatically created when the containers start. The setup includes:
   - Core schemas: `app`, `kg`, `sec`, `semantic`
   - Sample data for 7 locations
   - Security policies and permissions
   - Full-text search indexes

## Authentication

### Login Methods

The system supports multiple authentication methods:

#### Local Authentication
- Direct username/password authentication
- Password hashing with Argon2id
- JWT-based sessions with refresh tokens

#### Microsoft SSO (Enterprise)
- Azure AD integration
- Single sign-on capabilities
- Role mapping from AD groups

### Demo Accounts

For testing and evaluation, use these pre-configured accounts:

| Role | Email | Password | Access Level |
|------|-------|----------|-------------|
| System Admin | admin@heinzcorps.com | admin123 | All sites, full admin |
| Site Manager | manager@vermillion.com | vermillion123 | Vermillion site only |
| Site Manager | manager@hotsprings.com | hotsprings123 | Hot Springs site only |
| Technician | tech@steele.com | steele123 | Steele site only |
| Technician | tech@summit.com | summit123 | Summit site only |

### Security Features

- **Row-Level Security (RLS)**: Automatic data filtering based on user's site access
- **JWT Tokens**: 15-minute access tokens with 7-day refresh tokens
- **Session Context**: SQL Server context automatically set for each request
- **Privacy Levels**: Public, site-only, and private tickets
- **Audit Logging**: All actions tracked with user attribution

## Core Features

### Dashboard

The main dashboard provides:
- **Open Tickets Summary**: Count and average priority of open tickets
- **Recent Alerts**: Latest system alerts and their status
- **Asset Status**: Health overview of critical assets
- **Knowledge Graph Insights**: Co-failure patterns and blast radius analysis
- **Performance Metrics**: SLA compliance and resolution times

### Navigation

- **Tickets**: Create, view, and manage tickets
- **Assets**: Monitor asset health and relationships
- **Knowledge Graph**: Explore asset relationships and dependencies
- **Alerts**: View and manage system alerts
- **Admin**: User management and system configuration (admin only)

## User Roles and Permissions

### Role Hierarchy

1. **Admin**
   - Full system access
   - User management
   - Site configuration
   - Security policy management
   - All tickets and assets

2. **Manager**
   - Site-level management
   - Team oversight
   - Ticket assignment and escalation
   - Site-specific reporting
   - Local user management

3. **Technician**
   - Ticket creation and updates
   - Asset maintenance
   - Field data entry
   - Limited administrative functions

4. **Viewer**
   - Read-only access
   - Reporting and analytics
   - Dashboard viewing
   - No modification rights

### Site Access Control

Users are assigned to specific sites and can only:
- View tickets and assets for their assigned sites
- Create tickets for locations they have access to
- Receive notifications for relevant events
- Access knowledge graph data within their scope

## Ticket Management

### Creating Tickets

1. **Manual Creation**
   - Navigate to Tickets → New Ticket
   - Fill required fields: Summary, Description, Site, Category
   - Set priority and severity levels
   - Assign to user or team
   - Add watchers for notifications

2. **Template-Based Creation**
   - Use predefined ticket templates
   - Automatic field population
   - Consistent categorization
   - Built-in checklists and workflows

3. **Automated Creation**
   - Event-driven ticket generation
   - Alert promotion to tickets
   - Integration with monitoring systems

### Ticket Properties

#### Core Fields
- **Summary**: Brief description of the issue
- **Description**: Detailed problem description
- **Status**: Open, In Progress, Closed, Canceled
- **Sub-status**: Granular workflow states (Awaiting Assignment, Researching, etc.)
- **Priority**: 1-5 scale (5 = Critical)
- **Severity**: Impact assessment
- **Category**: Equipment type or service area
- **Site**: Physical location
- **Asset**: Specific equipment or system

#### Enhanced Features
- **Privacy Levels**: Public, Site-Only, Private
- **Watchers**: Users receiving notifications
- **Due Dates**: SLA-driven deadlines
- **Contact Information**: Customer or requestor details
- **Attachments**: Documents, photos, diagnostic reports

### Ticket Workflow

1. **Creation**: Initial ticket submission
2. **Assignment**: Route to appropriate team/person
3. **Diagnosis**: Problem investigation and analysis
4. **Resolution**: Implement solution
5. **Verification**: Confirm issue resolved
6. **Closure**: Final documentation and sign-off

### Privacy and Security

- **Public Tickets**: Visible to all users with site access
- **Site-Only**: Restricted to users at specific locations
- **Private**: Limited to assigned users and watchers
- **Audit Trail**: Complete history of changes and access

## Asset Management

### Asset Types

The system tracks various asset categories:

#### Fuel Systems
- **Dispensers**: Fuel pumps and payment terminals
- **Tanks**: Underground storage tanks (UST)
- **ATG Systems**: Automatic Tank Gauging
- **Piping**: Fuel line infrastructure
- **Environmental**: Leak detection systems

#### Power and Electrical
- **Generators**: Backup power systems
- **UPS**: Uninterruptible power supplies
- **Electrical Panels**: Distribution and control
- **Lighting**: Interior and exterior systems

#### Network and IT
- **POS Systems**: Point of sale terminals
- **Networking**: Switches, routers, wireless
- **Endpoints**: Computers, tablets, phones
- **Security**: Cameras, access control

#### Building Systems
- **HVAC**: Heating, ventilation, air conditioning
- **Refrigeration**: Coolers and freezers
- **Security**: Alarms, locks, monitoring
- **Facilities**: Doors, windows, structural

### Asset Relationships

The knowledge graph tracks relationships between assets:

- **Physical Connections**: Cables, pipes, power feeds
- **Logical Dependencies**: Network hierarchies, control systems
- **Spatial Relationships**: Same room, adjacent zones
- **Operational Dependencies**: Backup systems, redundancy

### Asset Monitoring

- **Health Status**: Operational, Warning, Critical, Offline
- **Performance Metrics**: Utilization, efficiency, capacity
- **Maintenance Schedules**: Preventive maintenance tracking
- **Event History**: All incidents and changes

## Knowledge Graph

### Graph Analytics

The knowledge graph provides powerful analytical capabilities:

#### Blast Radius Analysis
- **Network Impact**: What systems are affected if a network component fails?
- **Power Impact**: Which assets lose power if a generator fails?
- **Cascading Effects**: How do failures propagate through connected systems?

#### Centrality Analysis
- **Degree Centrality**: Most connected assets in the network
- **Betweenness Centrality**: Critical path components
- **Eigenvector Centrality**: Assets connected to other important assets
- **Classification**: Core, important, peripheral, isolated assets

#### Co-failure Analysis
- **Temporal Correlation**: Assets that frequently fail together
- **Root Cause Identification**: Common failure patterns
- **Predictive Insights**: Early warning indicators
- **Time Windows**: Configurable analysis periods (60, 120, 240 minutes)

### Semantic Search

Advanced search capabilities across all system data:

- **Asset Search**: Find equipment by type, model, vendor, location
- **Ticket Search**: Full-text search across summaries and descriptions
- **Knowledge Base**: Search documentation and procedures
- **Relevance Scoring**: AI-powered result ranking
- **Faceted Search**: Filter by entity type, site, date range

### Visual Exploration

Interactive graph visualization:

- **Node Types**: Assets, sites, tickets, alerts, users
- **Edge Types**: Relationships, dependencies, associations
- **Layout Options**: Hierarchical, force-directed, circular
- **Filtering**: Show/hide node types, relationship types
- **Drill-down**: Expand neighborhoods, explore connections
- **Real-time Updates**: Live graph changes via SSE

## Alerting and Events

### Event Processing

The system ingests events from various sources:

#### Data Sources
- **Monitoring Systems**: Nagios, Zabbix, PRTG
- **IoT Sensors**: Temperature, pressure, flow, vibration
- **Network Equipment**: SNMP traps, syslog
- **Applications**: Custom integrations, APIs
- **Manual Entry**: User-reported incidents

#### Event Normalization
- **Vendor Code Mapping**: Normalize different vendor alert codes
- **Severity Standardization**: Consistent 1-5 scale
- **Deduplication**: Avoid duplicate events from multiple sources
- **Enrichment**: Add context from asset database

### Alert Management

#### Alert Lifecycle
1. **Event Ingestion**: Raw event received
2. **Normalization**: Apply code mappings and enrichment
3. **Correlation**: Group related events
4. **Alert Generation**: Create actionable alerts
5. **Notification**: Send to relevant users
6. **Escalation**: Auto-escalate if unacknowledged
7. **Resolution**: Close when issue resolved

#### Alert Types
- **Critical**: Immediate attention required
- **Warning**: Potential issues developing
- **Informational**: Status changes and updates
- **Maintenance**: Planned work notifications

### Real-time Updates

Server-Sent Events (SSE) provide live updates:

- **Ticket Changes**: Status updates, new comments
- **Alert Notifications**: New alerts, acknowledgments
- **Asset Status**: Health changes, metric updates
- **Graph Changes**: New relationships, topology updates

## Admin Features

### User Management

Administrators can manage system users:

#### User Creation
- Local account creation with email/password
- Role assignment (Admin, Manager, Technician, Viewer)
- Site access configuration
- Team membership assignment

#### User Administration
- Password resets and account lockouts
- Role modifications and permission changes
- Site access updates
- Activity monitoring and audit logs

### Site Configuration

- **Site Directory**: Locations, addresses, contact information
- **Asset Registration**: Equipment inventory and specifications
- **Team Setup**: Local teams and responsibilities
- **SLA Configuration**: Service level agreements and targets

### System Configuration

- **Category Management**: Ticket categories and mappings
- **Status Workflows**: Custom status transitions
- **Template Management**: Ticket templates and automation
- **Integration Settings**: External system connections

### Security Management

- **Access Policies**: Fine-grained permission control
- **Audit Configuration**: Logging and retention policies
- **RLS Management**: Row-level security rules
- **API Key Management**: External system authentication

## Mobile App

### Features

The mobile app provides field-friendly access:

#### Core Functionality
- **Ticket Management**: View, create, update tickets
- **Asset Inspection**: Check asset status and history
- **Photo Capture**: Attach images to tickets
- **Offline Support**: Basic functionality without connectivity
- **GPS Integration**: Location-aware ticket creation

#### Authentication
- **Biometric Login**: Fingerprint and Face ID support
- **Token Management**: Automatic refresh and renewal
- **Secure Storage**: Encrypted local data storage

#### Field-Optimized UI
- **Large Touch Targets**: Easy operation with gloves
- **High Contrast**: Readable in various lighting
- **Quick Actions**: Common tasks with minimal taps
- **Voice Notes**: Audio attachments for tickets

### Installation

1. **Download**: Available on iOS App Store and Google Play
2. **Configuration**: Enter server URL and credentials
3. **Sync**: Initial data download and synchronization
4. **Permissions**: Camera, location, biometric access

## API Reference

### Authentication Endpoints

#### POST /api/auth/local/signin
Login with email and password
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /api/auth/refresh
Refresh access token
```json
{
  "refreshToken": "refresh_token_here"
}
```

#### GET /api/auth/validate
Validate current token (requires Authorization header)

### Ticket Endpoints

#### GET /api/tickets
List tickets with optional filters
- Query parameters: `siteId`, `status`, `categoryId`, `assignedToId`, `fromDate`, `toDate`

#### POST /api/tickets
Create new ticket
```json
{
  "summary": "Equipment malfunction",
  "description": "Detailed description",
  "status": "Open",
  "severity": 3,
  "category_id": 1,
  "site_id": 1000,
  "privacy_level": "public"
}
```

#### GET /api/tickets/:id
Get ticket details

#### PATCH /api/tickets/:id
Update ticket (requires If-Match header for optimistic locking)

#### POST /api/tickets/:id/messages
Add comment or update to ticket

### Asset Endpoints

#### GET /api/assets
List assets with filters

#### GET /api/assets/:id
Get asset details and relationships

### Knowledge Graph Endpoints

#### GET /api/kg/graph-data
Get graph nodes and edges
- Query parameters: `siteId`, `nodeTypes`, `edgeTypes`

#### GET /api/kg/blast-radius
Get blast radius analysis
- Query parameters: `assetId`, `analysisType` (network/power)

#### GET /api/kg/centrality
Get centrality metrics for assets
- Query parameters: `siteId`

#### GET /api/kg/co-failure
Get co-failure analysis
- Query parameters: `siteId`, `windowMinutes`

#### GET /api/kg/semantic-search
Semantic search across entities
- Query parameters: `q` (query), `entityType`, `limit`

### Alert Endpoints

#### GET /api/alerts
List alerts with filters

#### POST /api/alerts/:id/acknowledge
Acknowledge alert

### Real-time Endpoints

#### GET /api/sse/tickets
Server-Sent Events for ticket updates

#### GET /api/sse/alerts
Server-Sent Events for alert notifications

#### GET /api/sse/kg
Server-Sent Events for knowledge graph updates

## Deployment

### Production Deployment

#### Environment Setup
1. **Database**: SQL Server 2019+ with sufficient resources
2. **Application Server**: Node.js 18+ environment
3. **Worker Services**: Python 3.11+ environment
4. **Load Balancer**: HTTPS termination and routing
5. **Monitoring**: Application and infrastructure monitoring

#### Configuration
- **Environment Variables**: Database connections, JWT secrets, CORS origins
- **SSL Certificates**: HTTPS for all external endpoints
- **Database Backup**: Regular backups and point-in-time recovery
- **Log Management**: Centralized logging and retention

#### Scaling Considerations
- **API Horizontal Scaling**: Multiple API instances behind load balancer
- **Database Scaling**: Read replicas for reporting workloads
- **Worker Scaling**: Multiple worker instances for event processing
- **CDN**: Static asset distribution for web UI

### Docker Deployment

The provided `docker-compose.yml` includes:
- **SQL Server**: Database with persistent volumes
- **API Service**: Node.js application with health checks
- **Worker Service**: Python background processing
- **Web UI**: React application (optional, can be deployed separately)

### Azure Deployment

For Azure deployment:
1. **Azure SQL Database**: Managed SQL Server instance
2. **App Service**: API and web application hosting
3. **Container Instances**: Worker service deployment
4. **Application Insights**: Monitoring and telemetry
5. **Key Vault**: Secure secrets management

## Troubleshooting

### Common Issues

#### Authentication Problems
- **Invalid Credentials**: Check username/password, account status
- **Token Expiration**: Refresh tokens or re-login
- **Site Access**: Verify user has access to requested sites
- **RLS Issues**: Check session context setting

#### Performance Issues
- **Slow Queries**: Review database indexes and query plans
- **High Memory Usage**: Monitor graph data loading and caching
- **API Timeouts**: Check database connection pooling
- **UI Responsiveness**: Verify network connectivity and API response times

#### Data Issues
- **Missing Tickets**: Check privacy levels and site access
- **Incorrect Relationships**: Verify asset data and graph mirroring
- **Event Processing**: Review worker logs and event normalization
- **Search Problems**: Check full-text indexing and semantic search setup

### Logging and Monitoring

#### Application Logs
- **API Logs**: Structured JSON logging with request tracing
- **Worker Logs**: Event processing and error handling
- **Database Logs**: Query performance and error tracking
- **UI Logs**: Client-side error reporting

#### Health Checks
- **API Health**: `/health` endpoint with dependency checks
- **Database Health**: Connection and query performance
- **Worker Health**: Background job processing status
- **External Integrations**: Third-party service connectivity

#### Metrics and Alerts
- **Response Times**: API and database performance
- **Error Rates**: Application and system errors
- **Resource Usage**: CPU, memory, disk space
- **Business Metrics**: Ticket volumes, resolution times, SLA compliance

### Support and Maintenance

#### Regular Maintenance
- **Database Maintenance**: Index rebuilding, statistics updates
- **Log Rotation**: Prevent disk space issues
- **Security Updates**: Keep dependencies current
- **Backup Verification**: Test restore procedures

#### Upgrades and Migration
- **Schema Migrations**: Version-controlled database changes
- **Application Updates**: Rolling deployment strategies
- **Data Migration**: Legacy system integration
- **Testing**: Comprehensive testing before production deployment

---

## Quick Reference

### Default Ports
- Web UI: 3002
- API: 3001
- Database: 1433
- Worker Health: 8000

### Key File Locations
- API Source: `./api/src/`
- UI Source: `./ui/src/`
- Worker Source: `./worker/`
- Database Scripts: `./*.sql`
- Docker Configuration: `./docker-compose.yml`

### Support Contacts
- System Administrator: admin@heinzcorps.com
- Technical Support: Contact your IT department
- Documentation: This guide and API documentation at `/documentation`

For additional assistance, consult the API documentation at `http://localhost:3001/documentation` or review the application logs for detailed error information.

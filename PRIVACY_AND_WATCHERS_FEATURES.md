# Enhanced Ticket Privacy and Watcher System

## Overview
We have significantly enhanced the Coffee Cup Travel Plaza ticket system with comprehensive privacy controls and watcher management capabilities. This addresses the requirement for private tickets and interested party notifications.

## 🔒 Privacy System Features

### Privacy Levels
1. **Public** - Visible to all users with site access (default)
2. **Site Only** - Visible only to users assigned to the specific site
3. **Private** - Visible only to:
   - Ticket creator
   - Assigned user
   - Site contacts
   - Active watchers

### Privacy Enforcement
- Privacy checking function: `app.fn_CanUserViewTicket(@ticket_id, @user_id)`
- All ticket queries filter based on user permissions
- Privacy level can be changed via API: `PATCH /api/tickets/:id/privacy`
- UI shows privacy indicators with icons:
  - 👁️ Public (green)
  - 👥 Site Only (blue) 
  - 🔒 Private (red)

## 👥 Watcher System Features

### Watcher Types
1. **Interested** - Basic notification recipient
2. **Collaborator** - Active participant in ticket resolution
3. **Site Contact** - Primary site representative
4. **Assignee Backup** - Secondary assignee for coverage

### Watcher Management
- Database table: `app.TicketWatchers` with full audit trail
- Can add both internal users (by user_id) and external contacts (email/name)
- Notification preferences per watcher
- Add/remove watchers via API endpoints
- Bulk watcher addition during ticket creation

### API Endpoints
```
GET    /api/tickets/:id/watchers           - Get ticket watchers
POST   /api/tickets/:id/watchers           - Add watcher
DELETE /api/tickets/:id/watchers/:watcherId - Remove watcher
```

## 📋 Enhanced Status System

### Improved Status Structure
- Main statuses: Open, In Progress, Pending, Resolved, Closed, Canceled
- Detailed substatuses based on your requirements:

**Open:**
- Awaiting Assignment

**In Progress:**
- Awaiting Equipment
- Awaiting Contact Reply
- Awaiting Tech Reply
- Awaiting Service
- Researching

**Closed:**
- Service Complete
- Canceled

### Database Schema
```sql
-- Main statuses
app.Statuses (status, sort_order)

-- Detailed substatuses
app.Substatuses (
  substatus_id, status, substatus_code, 
  substatus_name, sort_order, is_active
)

-- Privacy levels
app.TicketPrivacyLevels (
  privacy_level, display_name, description, sort_order
)
```

## 🎯 Enhanced Ticket Creation

### New Ticket Form Features
- **Privacy Level Selection** with visual indicators and descriptions
- **Contact Information** fields (name, email, phone)
- **Problem Description** for AI assistance
- **Watcher Management** - Add multiple watchers during creation
- **Enhanced Status/Substatus** selection with dependent dropdowns

### Form Validation
- Summary required
- Either user_id or email+name required for watchers
- Privacy level validation
- Real-time status/substatus dependency

## 📊 Enhanced Ticket Display

### Ticket List Features
- **Privacy Indicators** - Visual icons showing privacy level
- **Watcher Count** - Shows number of watchers and collaborators
- **Enhanced Filtering** - Filter by privacy level, status, site
- **Search Functionality** - Search across summary, description, ticket number
- **Contact Information** - Shows primary contact when available
- **Real-time Timestamps** - "Created X ago", "Updated X ago"

### Ticket Detail View
- **Complete Watcher List** with types and contact info
- **Privacy Level Management** - Change privacy level with proper authorization
- **Enhanced Contact Display** - All contact fields visible
- **Problem/Solution Tracking** for AI assistance
- **Full Audit Trail** including privacy changes

## 🔧 Technical Implementation

### Database Enhancements
```sql
-- Enhanced Tickets table with new fields
ALTER TABLE app.Tickets ADD 
  privacy_level NVARCHAR(20) DEFAULT 'public',
  contact_name NVARCHAR(100),
  contact_email NVARCHAR(255),
  contact_phone NVARCHAR(20),
  problem_description NVARCHAR(MAX),
  solution_description NVARCHAR(MAX);

-- TicketWatchers table for comprehensive watcher management
CREATE TABLE app.TicketWatchers (
  watcher_id INT IDENTITY(1,1) PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NULL,
  email NVARCHAR(255) NULL,
  name NVARCHAR(100) NULL,
  watcher_type NVARCHAR(20) NOT NULL,
  notification_preferences NVARCHAR(100),
  added_by INT NULL,
  added_at DATETIME2(3) DEFAULT GETUTCDATE(),
  is_active BIT DEFAULT 1
);
```

### API Enhancements
- **Privacy-aware ticket queries** - All endpoints respect privacy settings
- **Enhanced ticket creation** - Support for privacy and watchers
- **Watcher management endpoints** - Full CRUD operations
- **Privacy management** - Change privacy levels with authorization
- **Enhanced error handling** - Proper error messages for privacy violations

### UI Components
- **TicketFormModal** - Complete ticket creation with all new features
- **EnhancedTicketList** - Modern ticket list with privacy and watcher info
- **Privacy Controls** - Visual privacy level selection and display
- **Watcher Management** - Add/remove watchers with proper UI

## 🚀 Usage Examples

### Creating a Private Ticket with Watchers
```typescript
const newTicket = await createTicket({
  summary: "CONFIDENTIAL: Security System Issue",
  privacy_level: "private",
  contact_name: "Security Manager",
  contact_email: "security@coffeecup.com",
  problem_description: "Security cameras offline in store 1000",
  watchers: [
    {
      email: "it-security@coffeecup.com",
      name: "IT Security Team",
      watcher_type: "collaborator"
    },
    {
      email: "manager.1000@coffeecup.com", 
      name: "Store Manager",
      watcher_type: "site_contact"
    }
  ]
});
```

### Adding Watchers to Existing Ticket
```typescript
await addTicketWatcher(ticketId, {
  email: "maintenance@coffeecup.com",
  name: "Maintenance Team",
  watcher_type: "interested",
  notification_preferences: "status_changes,comments"
});
```

### Updating Ticket Privacy
```typescript
await updateTicketPrivacy(ticketId, "private");
```

## 📋 Next Steps

1. **Test the System** - Create sample tickets with different privacy levels
2. **Configure Notifications** - Set up email notifications for watchers
3. **Train Users** - Educate staff on privacy levels and watcher management
4. **Monitor Usage** - Track privacy level usage and watcher engagement
5. **Expand Features** - Consider adding more watcher types or notification options

## 🎯 Key Benefits

- **Enhanced Security** - Private tickets protect sensitive information
- **Better Communication** - Watchers keep all stakeholders informed
- **Improved Workflow** - Detailed statuses provide clear process tracking
- **User-Friendly** - Intuitive UI makes privacy and watcher management easy
- **Audit Trail** - Complete tracking of who can see what and when
- **Flexible** - Support for both internal users and external contacts

This enhanced system provides Coffee Cup Travel Plaza with enterprise-level ticket privacy and collaboration capabilities while maintaining ease of use for daily operations.

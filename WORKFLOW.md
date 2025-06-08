# Multi-Tenant Slack Integration Workflow

This document outlines the complete workflow for the multi-tenant Slack integration platform built with Next.js, Shadcn UI, and TypeORM.

## Overview

The platform allows users to create workspaces (tenants) and connect their Slack workspaces to manage conversations and receive real-time events. Each tenant is completely isolated with its own data and configurations.

## Workflow Steps

### 1. User Registration & Workspace Creation

**Registration Form (`app/register/page.tsx`)**
- User provides personal information (name, email, password)
- User creates a workspace with:
  - **Workspace Name**: Display name for the workspace
  - **Workspace URL**: Unique slug (letters, numbers, hyphens, underscores only)
- Real-time validation ensures slug format compliance
- Visual feedback with checkmarks/error icons

**Backend Processing:**
1. User account creation via `/api/auth/register`
2. Automatic login via `/api/auth/login`
3. Tenant creation via `/api/tenants/create` with slug validation
4. Redirect to `/{tenantId}/integrations` for Slack setup

### 2. Slack Integration Setup

**Integrations Page (`app/(dashboard)/[tenantId]/integrations/page.tsx`)**
- Welcome message for new users
- Slack integration card with connection status
- "Add to Slack" button for OAuth flow

**OAuth Flow:**
1. **Install Route** (`/api/[tenantId]/slack/install`):
   - Redirects to Slack OAuth with required scopes
   - Includes state parameter for security (tenant ID)

2. **Callback Route** (`/api/[tenantId]/slack/callback`):
   - Validates state parameter
   - Exchanges code for access token
   - Saves configuration including signing secret
   - Redirects back with success/error status

**Required Slack Scopes:**
- `channels:read` - Read public channels
- `groups:read` - Read private channels
- `im:read` - Read direct messages
- `mpim:read` - Read group messages
- `reactions:read` - Read message reactions
- `chat:write` - Send messages
- `team:read` - Read team information

### 3. Real-Time Event Processing

**Event Webhook (`/api/[tenantId]/slack/events`)**
- Handles Slack Events API webhooks
- Verifies request signatures for security
- Processes different event types:
  - `message` - New messages and thread parents
  - `reaction_added` - Emoji reactions
  - `reaction_removed` - Reaction removals
  - Thread replies (messages with `thread_ts`)

**Data Storage:**
- Messages stored in `conversations` table
- Reactions stored as JSONB arrays
- Thread replies stored as JSONB arrays
- Full tenant isolation via `tenantId`

### 4. Dashboard & Analytics

**Main Dashboard (`app/(dashboard)/[tenantId]/page.tsx`)**
- Connection status indicators
- Real-time statistics:
  - Total conversations
  - Active channels
  - Last sync timestamp
- Recent conversations list
- Quick action cards

**Conversation List (`components/conversation-list.tsx`)**
- Displays recent conversations with metadata
- Shows reaction counts and thread replies
- Responsive card-based layout
- Empty state for new workspaces

## Architecture Components

### Database Schema

```typescript
// Tenant Entity
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ unique: true })
  slug: string

  @Column({ type: 'jsonb', nullable: true })
  slackConfig?: {
    botToken: string
    signingSecret: string
    teamId: string
    teamName?: string
    installedBy?: string
  }

  @Column({ default: true })
  isActive: boolean
}

// Conversation Entity
@Entity('conversations')
export class Conversation {
  @PrimaryColumn()
  id: string // Slack message timestamp

  @Column()
  tenantId: string

  @Column()
  channelId: string

  @Column()
  content: string

  @Column({ type: 'jsonb' })
  reactions: SlackReaction[]

  @Column({ type: 'jsonb' })
  threadReplies: SlackMessage[]
}
```

### Security Implementation

**Row Level Security:**
- All database queries filtered by `tenantId`
- Middleware validates tenant access
- JWT-based session management

**Slack Signature Verification:**
- HMAC-SHA256 signature validation
- Timestamp verification (5-minute window)
- Signing secret per tenant

**Access Control:**
- Tenant-specific API routes
- User-tenant relationship validation
- Protected dashboard routes

### API Routes Structure

```
/api/
├── auth/
│   ├── register
│   ├── login
│   └── logout
├── tenants/
│   ├── create
│   └── [tenantId]/
│       └── info
└── [tenantId]/
    └── slack/
        ├── install
        ├── callback
        └── events
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key

# Slack App Credentials
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
SLACK_SIGNING_SECRET=your-signing-secret
```

## Deployment Considerations

### Slack App Configuration

1. **OAuth & Permissions:**
   - Redirect URLs: `https://yourdomain.com/api/[tenantId]/slack/callback`
   - Scopes: Listed above

2. **Event Subscriptions:**
   - Request URL: `https://yourdomain.com/api/[tenantId]/slack/events`
   - Events: `message.channels`, `reaction_added`, `reaction_removed`

3. **App Distribution:**
   - Set to public for multi-tenant use
   - Configure app directory listing

### Infrastructure

- **Database**: PostgreSQL with JSONB support
- **Hosting**: Vercel, Railway, or similar
- **SSL**: Required for Slack webhooks
- **Monitoring**: Error tracking and performance monitoring

## Key Features

### Multi-Tenancy
- Complete data isolation
- Tenant-specific configurations
- Independent Slack integrations
- Scalable architecture

### Real-Time Processing
- Webhook-based event handling
- Immediate data synchronization
- Reaction and thread tracking
- Message deduplication

### User Experience
- Intuitive onboarding flow
- Real-time validation feedback
- Responsive dashboard
- Clear status indicators

### Security
- Signature verification
- Access control
- Session management
- Input validation

## Testing the Workflow

1. **Registration:**
   - Create account with valid workspace slug
   - Verify redirect to integrations page

2. **Slack Integration:**
   - Click "Add to Slack"
   - Complete OAuth flow
   - Verify success message and status

3. **Event Processing:**
   - Send messages in connected Slack workspace
   - Add reactions to messages
   - Verify data appears in dashboard

4. **Dashboard:**
   - Check statistics update
   - View conversation list
   - Test navigation between pages

This workflow provides a complete multi-tenant Slack integration platform with proper security, scalability, and user experience considerations. 
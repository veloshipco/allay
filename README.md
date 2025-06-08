# Allay - Multi-Tenant Slack Integration Platform

A comprehensive multi-tenant workflow implementation using Next.js App Router, Shadcn UI, TypeORM, and Slack API for conversation syncing and management.

## 🏗️ Architecture Overview

This application implements a robust multi-tenant architecture where each tenant can independently connect their Slack workspace and manage their conversations in isolation.

### Key Features

- **Multi-Tenant Architecture**: Complete tenant isolation with separate configurations
- **Slack OAuth Integration**: Secure workspace connection per tenant
- **Real-Time Event Processing**: Webhook-based message and reaction syncing
- **Modern UI**: Shadcn/ui components with responsive design
- **Type-Safe Database**: TypeORM with PostgreSQL for reliable data management
- **Security**: Row-level security, signature verification, and access controls

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Slack App (for OAuth integration)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Create a `.env.local` file with the sample variables provided above.

3. **Configure your Slack App:**
   - Create a new Slack app at https://api.slack.com/apps
   - Add OAuth scopes: `channels:read`, `groups:read`, `im:read`, `mpim:read`, `reactions:read`, `chat:write`, `team:read`
   - Set redirect URL: `https://yourdomain.com/api/[tenantId]/slack/callback`
   - Enable Event Subscriptions with endpoint: `https://yourdomain.com/api/[tenantId]/slack/events`

4. **Set up the database:**
```bash
npm run dev
```
The TypeORM synchronization will create the necessary tables in development.

5. **Start the development server:**
```bash
npm run dev
```

## 📁 Project Structure

### Core Architecture Components

#### 1. Database Layer (`lib/database/`)
- **`entities/Tenant.ts`**: Multi-tenant configuration and Slack settings
- **`entities/Conversation.ts`**: Slack messages, reactions, and thread replies
- **`config.ts`**: TypeORM database connection and initialization

#### 2. Tenant Management (`lib/tenant.ts`)
- Tenant context retrieval and validation
- Slack configuration management
- Tenant creation and access control

#### 3. Authentication & Security (`lib/auth.ts`, `middleware.ts`)
- Tenant access validation
- Route protection middleware
- Session management framework

#### 4. Slack Integration (`lib/slack-events.ts`)
- Webhook signature verification
- Message and reaction event processing
- Thread reply handling
- Real-time conversation syncing

### Frontend Components

#### 1. Multi-Tenant Routing (`app/(dashboard)/[tenantId]/`)
- **`layout.tsx`**: Tenant-specific dashboard wrapper
- **`page.tsx`**: Main dashboard with integration status
- **`integrations/page.tsx`**: Slack connection management

#### 2. UI Components (`components/`)
- **`tenant-nav.tsx`**: Navigation with tenant context
- **`conversation-list.tsx`**: Real-time conversation display
- **`slack-connect-button.tsx`**: OAuth integration component

#### 3. API Routes (`app/api/[tenantId]/slack/`)
- **`install/route.ts`**: OAuth authorization initiation
- **`callback/route.ts`**: OAuth token exchange and storage
- **`events/route.ts`**: Slack webhook event processing

## 🔧 Implementation Details

### Multi-Tenant Isolation Strategy

Each tenant operates in complete isolation:

```typescript
// Tenant-specific data access
const conversations = await conversationRepository.find({
  where: { tenantId },
  order: { createdAt: 'DESC' }
})
```

### Slack OAuth Flow

1. **Authorization**: User clicks "Connect to Slack" → redirects to Slack OAuth
2. **Callback**: Slack returns with authorization code
3. **Token Exchange**: Server exchanges code for access token
4. **Storage**: Encrypted token stored in tenant configuration
5. **Webhook Setup**: Events endpoint configured for real-time updates

### Real-Time Event Processing

```typescript
// Webhook signature verification
const isValid = await verifySlackSignature(req, tenant.slackConfig.signingSecret)

// Event processing
switch (body.event.type) {
  case 'message':
    await processMessageEvent(tenantId, body.event)
    break
  case 'reaction_added':
    await processReactionEvent(tenantId, body.event)
    break
}
```

### Security Implementation

#### 1. Middleware Protection
- UUID-based tenant route validation
- Session verification
- Access control enforcement

#### 2. Slack Webhook Security
- Request signature verification
- Timestamp validation (5-minute window)
- Secure HMAC-SHA256 validation

#### 3. Database Security
- Tenant-scoped queries
- Prepared statements (TypeORM)
- Input validation and sanitization

## 🎨 UI/UX Design

### Responsive Dashboard
- Modern card-based layout
- Real-time status indicators
- Interactive integration management
- Mobile-responsive design

### Tenant Navigation
- Context-aware routing
- Breadcrumb navigation
- Quick action access
- Session management

### Integration Status
- Connection health monitoring
- OAuth flow management
- Error handling and recovery
- Success/failure feedback

## 🔒 Security Features

### Authentication & Authorization
- Tenant-based access control
- Session validation middleware
- Secure OAuth implementation
- Route protection

### Data Protection
- Tenant data isolation
- Encrypted token storage
- Secure webhook handling
- Input validation

### Slack Integration Security
- Signature verification
- Request timestamp validation
- Scope-limited permissions
- Secure token exchange

## 📊 Database Schema

### Tenants Table
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  slack_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Conversations Table
```sql
CREATE TABLE conversations (
  id VARCHAR PRIMARY KEY, -- Slack message timestamp
  tenant_id UUID REFERENCES tenants(id),
  channel_id VARCHAR NOT NULL,
  channel_name VARCHAR,
  content TEXT NOT NULL,
  user_id VARCHAR NOT NULL,
  user_name VARCHAR,
  reactions JSONB DEFAULT '[]',
  thread_replies JSONB DEFAULT '[]',
  thread_ts VARCHAR,
  slack_timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🚧 Future Enhancements

### Planned Features
- [ ] Microsoft Teams integration
- [ ] Discord server connections
- [ ] Advanced conversation analytics
- [ ] Custom webhook endpoints
- [ ] Bulk message operations
- [ ] Advanced search and filtering

### Technical Improvements
- [ ] Redis caching layer
- [ ] Message queue for event processing
- [ ] Horizontal scaling support
- [ ] Advanced monitoring and logging
- [ ] Automated testing suite
- [ ] CI/CD pipeline

## 📝 Environment Setup

### Required Environment Variables
- **Database**: PostgreSQL connection details
- **Slack App**: OAuth credentials and signing secret
- **Supabase**: Optional for additional features
- **Next.js**: Development/production configuration

### Slack App Configuration
1. Create app at https://api.slack.com/apps
2. Configure OAuth & Permissions
3. Set up Event Subscriptions
4. Install to development workspace
5. Copy credentials to environment

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Submit pull request
5. Code review and merge

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits
- Component documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions, issues, or contributions:
- Create GitHub issues for bugs
- Submit feature requests
- Join community discussions
- Review documentation

---

**Built with:** Next.js 15, TypeScript, TypeORM, PostgreSQL, Shadcn/ui, Tailwind CSS, and Slack API

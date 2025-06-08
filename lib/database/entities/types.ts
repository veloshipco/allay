// Shared types to avoid circular dependencies between entities

export interface ITenant {
  id: string
  name: string
  slug: string
  slackConfig?: {
    botToken: string
    signingSecret: string
    teamId: string
    teamName?: string
    installedBy?: string
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  conversations: IConversation[]
}

export interface IConversation {
  id: string
  tenantId: string
  tenant: ITenant
  channelId: string
  channelName?: string
  content: string
  userId: string
  userName?: string
  reactions: SlackReaction[]
  threadReplies: SlackMessage[]
  threadTs?: string
  slackTimestamp: Date
  createdAt: Date
  updatedAt: Date
}

export interface SlackReaction {
  name: string
  users: string[]
  count: number
}

export interface SlackMessage {
  ts: string
  user: string
  text: string
  type: string
  subtype?: string
  thread_ts?: string
} 
import { NextRequest } from 'next/server'

// Type for SSE connection writer
type SSEWriter = ReadableStreamDefaultController<Uint8Array>

// Simple in-memory store for SSE connections
const sseConnections = new Map<string, Set<SSEWriter>>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params

  if (!tenantId) {
    return new Response('Tenant ID is required', { status: 400 })
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', tenantId })}\n\n`
      controller.enqueue(encoder.encode(data))

      // Store writer for this tenant
      if (!sseConnections.has(tenantId)) {
        sseConnections.set(tenantId, new Set())
      }
      
      const writer = controller
      sseConnections.get(tenantId)!.add(writer)

      // Setup heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`
          controller.enqueue(encoder.encode(heartbeatData))
        } catch {
          // Connection closed
          clearInterval(heartbeat)
          sseConnections.get(tenantId)?.delete(writer)
        }
      }, 30000) // 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        sseConnections.get(tenantId)?.delete(writer)
        if (sseConnections.get(tenantId)?.size === 0) {
          sseConnections.delete(tenantId)
        }
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}

// Function to broadcast updates to all connected clients for a tenant
export function broadcastConversationUpdate(tenantId: string, data: unknown) {
  const connections = sseConnections.get(tenantId)
  if (!connections || connections.size === 0) {
    return
  }

  const encoder = new TextEncoder()
  const message = `data: ${JSON.stringify({ type: 'conversation_update', data, timestamp: new Date().toISOString() })}\n\n`
  const encodedMessage = encoder.encode(message)

  // Send to all connections for this tenant
  const closedConnections: SSEWriter[] = []
  connections.forEach((writer) => {
    try {
      writer.enqueue(encodedMessage)
    } catch {
      // Connection is closed, mark for removal
      closedConnections.push(writer)
    }
  })

  // Clean up closed connections
  closedConnections.forEach((writer) => {
    connections.delete(writer)
  })

  if (connections.size === 0) {
    sseConnections.delete(tenantId)
  }
} 
import { NextRequest } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const actor = request.headers.get('x-actor-email')?.trim() || searchParams.get('actor')?.trim() || ''

  if (!actor) {
    return new Response('actor required', { status: 400 })
  }

  const pdb = getDbForRequest(request)

  const encoder = new TextEncoder()
  let interval: any

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      // Initial burst: last 10 unread
      try {
        const rows = await pdb.finNotification.findMany({ where: { userEmail: actor, status: 'unread' }, orderBy: { createdAt: 'desc' }, take: 10 })
        send({ type: 'init', notifications: rows })
      } catch {}

      // Heartbeat + poll every 15s
      interval = setInterval(async () => {
        try {
          const count = await pdb.finNotification.count({ where: { userEmail: actor, status: 'unread' } })
          send({ type: 'heartbeat', unreadCount: count, at: new Date().toISOString() })
          // Also push any new unread since last poll
          const recent = await pdb.finNotification.findMany({ where: { userEmail: actor, status: 'unread' }, orderBy: { createdAt: 'desc' }, take: 5 })
          if (recent.length > 0) send({ type: 'update', notifications: recent })
        } catch {}
      }, 15000)

      // Keep alive comment every 20s
      const keepAlive = setInterval(()=> {
        try { controller.enqueue(encoder.encode(`: keepalive\n\n`)) } catch {}
      }, 20000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        clearInterval(keepAlive)
        try { controller.close() } catch {}
      })
    },
    cancel() {
      clearInterval(interval)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

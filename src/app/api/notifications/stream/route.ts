import { NextRequest } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { getInboxOwner } from '@/lib/notification-bus'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Always the signed-in user — see getInboxOwner.
  const actor = getInboxOwner(request)
  if (!actor) {
    return new Response('Not signed in', { status: 401 })
  }
  const me = { equals: actor, mode: 'insensitive' as const }

  const pdb = getDbForRequest(request)

  const encoder = new TextEncoder()
  let interval: any
  let lastId = 0

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      // Initial burst: last 10 unread
      try {
        const rows = await pdb.finNotification.findMany({ where: { userEmail: me, status: 'unread' }, orderBy: { createdAt: 'desc' }, take: 10 })
        lastId = rows.reduce((m: number, r: any) => Math.max(m, r.id), 0)
        send({ type: 'init', notifications: rows })
      } catch {}

      // Heartbeat + poll every 15s
      interval = setInterval(async () => {
        try {
          const count = await pdb.finNotification.count({ where: { userEmail: me, status: 'unread' } })
          send({ type: 'heartbeat', unreadCount: count, at: new Date().toISOString() })
          // Also push any new unread since last poll
          const recent = await pdb.finNotification.findMany({ where: { userEmail: me, status: 'unread', id: { gt: lastId } }, orderBy: { createdAt: 'desc' }, take: 5 })
          if (recent.length > 0) {
            lastId = Math.max(lastId, ...recent.map((r: any) => r.id))
            send({ type: 'update', notifications: recent })
          }
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

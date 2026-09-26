import { notImplementedHandlers } from '@/lib/module-not-implemented'

export const dynamic = 'force-dynamic'

const handlers = notImplementedHandlers()
export const GET = handlers.GET
export const POST = handlers.POST
export const PUT = handlers.PUT
export const DELETE = handlers.DELETE

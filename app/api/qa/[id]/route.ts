import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = Redis.fromEnv()
const KEY = 'oraculo:custom_qa'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await redis.get<{ id: string }[]>(KEY) ?? []
    const updated = existing.filter(q => q.id !== params.id)
    await redis.set(KEY, updated)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = Redis.fromEnv()
const KEY = 'oraculo:custom_qa'

export async function GET() {
  try {
    const data = await redis.get<object[]>(KEY)
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  try {
    const entry = await req.json()
    const existing = await redis.get<object[]>(KEY) ?? []
    const updated = [entry, ...existing]
    await redis.set(KEY, updated)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

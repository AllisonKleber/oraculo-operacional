import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const redis = Redis.fromEnv()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface Chunk {
  id: string
  source: string
  section: string
  content: string
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '')
}

function scoreChunk(query: string, chunk: Chunk): number {
  const q = normalize(query)
  const text = normalize(chunk.section + ' ' + chunk.content)
  const words = q.split(' ').filter(w => w.length > 3)
  if (words.length === 0) return 0
  return words.filter(w => text.includes(w)).length / words.length
}

export async function POST(req: Request) {
  try {
    const { question } = await req.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: 'Pergunta vazia.' }, { status: 400 })
    }

    const raw = await redis.get('oraculo:knowledge_chunks')
    const chunks: Chunk[] = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : [])

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: 'A base de conhecimento ainda não foi processada. Adicione PDFs na pasta **Procedimentos/** e aguarde o processamento automático.',
        found: false,
        sources: [],
      })
    }

    const scored = chunks
      .map(c => ({ chunk: c, score: scoreChunk(question, c) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(x => x.chunk)

    const context = scored.length > 0
      ? scored.map(c => `### ${c.section}\n${c.content}`).join('\n\n---\n\n')
      : chunks.slice(0, 3).map(c => `### ${c.section}\n${c.content}`).join('\n\n---\n\n')

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-8b',
      systemInstruction: 'Você é o Oráculo Normativo da Neoenergia Cosern. Responda perguntas técnicas sobre normas e procedimentos com base APENAS no contexto fornecido. Seja objetivo e preciso. Cite a seção da norma quando relevante. Responda sempre em português. Se a resposta não estiver no contexto, diga que não encontrou a informação na base atual.',
    })

    const result = await model.generateContent(
      `Contexto das normas técnicas:\n\n${context}\n\n---\n\nPergunta: ${question}`
    )

    const answer = result.response.text()
    const sources = Array.from(new Set(scored.map(c => c.source)))
    const found = scored.length > 0

    return NextResponse.json({ answer, sources, found })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

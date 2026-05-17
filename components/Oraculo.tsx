'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

const T = {
  bg: '#0d0d0f',
  sidebar: '#111114',
  surface: '#18181c',
  surfaceHover: '#1e1e23',
  border: '#2a2a32',
  borderLight: '#22222a',
  text: '#e8e8f0',
  textMuted: '#8888a0',
  textFaint: '#4a4a5a',
  accent: '#7c6af7',
  accentLight: '#a99df7',
  accentBg: '#1a1730',
  accentBorder: '#3d3580',
  success: '#22c55e',
  successBg: '#0f2a1a',
  warningBg: '#2a1f0a',
  dangerBg: '#2a0f0f',
  userBubble: '#1a1730',
  aiBubble: '#111114',
  inputBg: '#18181c',
}

interface Procedure {
  id: string
  name: string
  category: string
  department: string
  sla: string
  steps: string[]
  source: string
}

interface Message {
  id: number
  role: 'user' | 'ai'
  content: string
  time: string
  typing?: boolean
}

interface Conversation {
  id: string
  title: string
  date: string
}

const KNOWLEDGE_BASE: Procedure[] = [
  {
    id: 'POP-2024-001',
    name: 'Abertura de chamado de TI',
    category: 'Suporte',
    department: 'TI',
    sla: '4h',
    steps: [
      'Acesse o portal de suporte em suporte.empresa.com',
      'Clique em "Novo Chamado" no menu superior',
      'Selecione a categoria: Hardware, Software ou Infraestrutura',
      'Descreva o problema com título claro e descrição detalhada',
      'Anexe prints de tela se aplicável',
      'Defina a prioridade: Baixa, Média, Alta ou Crítica',
      'Confirme e anote o número do chamado gerado',
    ],
    source: 'Manual TI v3.2, p. 14',
  },
  {
    id: 'POP-2024-002',
    name: 'Fluxo de aprovação de compras',
    category: 'Financeiro',
    department: 'Compras',
    sla: '48h',
    steps: [
      'Preencha a Requisição de Compra (RC) no sistema ERP',
      'Gestor imediato aprova valores até R$ 5.000',
      'Valores entre R$ 5.001 e R$ 50.000 exigem aprovação da Gerência',
      'Acima de R$ 50.000 requer aprovação da Diretoria',
      'Após aprovação, Compras emite o Pedido de Compra (PC)',
      'Fornecedor confirmado e NF recebida → Contas a Pagar processa',
    ],
    source: 'Política Financeira 2024, p. 8-12',
  },
  {
    id: 'POP-2024-003',
    name: 'Onboarding de novos colaboradores',
    category: 'RH',
    department: 'Recursos Humanos',
    sla: '5 dias úteis',
    steps: [
      'RH envia contrato e documentação ao colaborador (D-5)',
      'TI cria conta corporativa e acesso VPN (D-3)',
      'Gestor define buddy/padrinho para o período inicial',
      'D+1: Welcome kit, tour pelas instalações, apresentação ao time',
      'D+1 a D+5: Trilha de onboarding no LMS corporativo',
      'D+30: Avaliação de nivelamento e feedback do gestor',
    ],
    source: 'Guia RH Onboarding 2024, p. 3-7',
  },
  {
    id: 'POP-2024-004',
    name: 'Gestão de não conformidades',
    category: 'Qualidade',
    department: 'Qualidade',
    sla: '24h para abertura',
    steps: [
      'Identificar e registrar a NC no sistema de qualidade (SGQ)',
      'Classificar: NC Menor, NC Maior ou NC Crítica',
      'Notificar responsável da área afetada em até 2h (NC Crítica: imediato)',
      'Análise de causa raiz (método 5 Porquês ou Ishikawa)',
      'Plano de ação corretiva com prazo e responsável definidos',
      'Implementar ações e registrar evidências',
      'Verificar eficácia no prazo definido e fechar a NC',
    ],
    source: 'Manual da Qualidade ISO 9001, p. 22',
  },
]

const SUGGESTIONS = [
  'Como faço abertura de chamado de TI?',
  'Qual o fluxo de aprovação de compras?',
  'Me mostre o checklist de onboarding',
  'Como registrar uma não conformidade?',
  'Procedimentos do departamento de RH',
  'Qual o SLA para chamados críticos?',
]

const SAMPLE_CONVERSATIONS: Conversation[] = [
  { id: 'c1', title: 'Chamado de TI urgente', date: 'Hoje' },
  { id: 'c2', title: 'Aprovação de compra equipamentos', date: 'Hoje' },
  { id: 'c3', title: 'Dúvida onboarding novo analista', date: 'Ontem' },
  { id: 'c4', title: 'NC linha de produção', date: 'Ontem' },
  { id: 'c5', title: 'Política de viagens corporativas', date: 'Esta semana' },
  { id: 'c6', title: 'Checklist auditoria interna Q3', date: 'Esta semana' },
]

const ANALYTICS = {
  procedures: 47,
  executions: 312,
  slaCompliance: 94,
  openNC: 8,
  topProcedures: [
    { name: 'Abertura de chamado TI', uses: 89 },
    { name: 'Aprovação de compras', uses: 54 },
    { name: 'Onboarding colaboradores', uses: 38 },
    { name: 'Não conformidades', uses: 31 },
    { name: 'Emissão de NF', uses: 27 },
  ],
  slaByDept: [
    { dept: 'TI', compliance: 97 },
    { dept: 'Financeiro', compliance: 91 },
    { dept: 'RH', compliance: 98 },
    { dept: 'Qualidade', compliance: 89 },
  ],
}

function findRelevantProcedure(query: string): Procedure | null {
  const q = query.toLowerCase()
  if (q.includes('chamado') || q.includes(' ti') || q.includes('suporte') || q.includes('ticket')) return KNOWLEDGE_BASE[0]
  if (q.includes('compra') || q.includes('aprovaç') || q.includes('pedido') || q.includes('aquisiç')) return KNOWLEDGE_BASE[1]
  if (q.includes('onboarding') || q.includes('colaborador') || q.includes('contrat') || q.includes('rh') || q.includes('admiss')) return KNOWLEDGE_BASE[2]
  if (q.includes('conformidade') || q.includes('qualidade') || q.includes('auditoria') || q.includes(' nc')) return KNOWLEDGE_BASE[3]
  return null
}

function buildResponse(query: string, procedure: Procedure | null): string {
  if (!procedure) {
    return `Não encontrei um procedimento específico para essa consulta na base de conhecimento atual.\n\nMinha base cobre os departamentos de **TI, Compras, RH e Qualidade**.\n\nTente reformular a pergunta. Exemplos:\n\n- "Como abrir chamado de TI?"\n- "Fluxo de aprovação de compras"\n- "Checklist de onboarding"\n- "Como registrar uma não conformidade?"`
  }
  const steps = procedure.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
  return `## ${procedure.name}\n\n**Identificador:** ${procedure.id}  \n**Departamento:** ${procedure.department}  \n**Categoria:** ${procedure.category}  \n**SLA:** ${procedure.sla}\n\n---\n\n### Passo a passo\n\n${steps}\n\n---\n\n> 📄 **Fonte:** ${procedure.source}\n\nDeseja iniciar a **execução guiada** com checklist interativo?`
}

async function* streamText(text: string): AsyncGenerator<string> {
  const words = text.split(' ')
  let buffer = ''
  for (let i = 0; i < words.length; i++) {
    buffer += (i > 0 ? ' ' : '') + words[i]
    if (i % 3 === 2 || i === words.length - 1) {
      yield buffer
      buffer = ''
      await new Promise(r => setTimeout(r, 18 + Math.random() * 20))
    }
  }
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, `<h2 style="font-size:15px;font-weight:500;color:${T.text};margin:16px 0 8px">$1</h2>`)
    .replace(/^### (.+)$/gm, `<h3 style="font-size:11px;font-weight:500;color:${T.textMuted};margin:12px 0 6px;text-transform:uppercase;letter-spacing:0.06em">$1</h3>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="font-weight:500;color:${T.text}">$1</strong>`)
    .replace(/^---$/gm, `<hr style="border:none;border-top:1px solid ${T.border};margin:12px 0">`)
    .replace(/^(\d+)\. (.+)$/gm, `<div style="display:flex;gap:10px;margin:5px 0"><span style="min-width:20px;height:20px;background:${T.accentBg};border:1px solid ${T.accentBorder};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:${T.accentLight};flex-shrink:0;margin-top:2px">$1</span><span style="color:${T.text};line-height:1.5">$2</span></div>`)
    .replace(/^> 📄 \*\*(.+?):\*\* (.+)$/gm, `<div style="background:${T.accentBg};border-left:3px solid ${T.accent};border-radius:0 6px 6px 0;padding:8px 12px;margin:12px 0;font-size:12px;color:${T.textMuted}"><strong style="color:${T.accentLight}">$1:</strong> $2</div>`)
    .replace(/^- (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0"><span style="color:${T.accent}">•</span><span style="color:${T.text}">$1</span></div>`)
    .replace(/\n/g, '<br>')
}

export default function Oraculo() {
  const [view, setView] = useState<'chat' | 'procs' | 'dash'>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [activeConv, setActiveConv] = useState('c1')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return
    setInput('')
    const userMsg: Message = { id: Date.now(), role: 'user', content: text, time: now() }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)
    const aiId = Date.now() + 1
    setMessages(prev => [...prev, { id: aiId, role: 'ai', content: '', time: now(), typing: true }])
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
    const procedure = findRelevantProcedure(text)
    const response = buildResponse(text, procedure)
    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, typing: false } : m))
    let accumulated = ''
    for await (const chunk of streamText(response)) {
      accumulated += (accumulated ? ' ' : '') + chunk
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: accumulated } : m))
    }
    setStreaming(false)
  }, [streaming])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${T.bg}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
        .root{font-family:'Sora',sans-serif;background:${T.bg};color:${T.text};height:100vh;display:flex;overflow:hidden}
        .sidebar{width:240px;background:${T.sidebar};border-right:1px solid ${T.border};display:flex;flex-direction:column;flex-shrink:0;transition:width 0.2s}
        .sidebar.closed{width:0;overflow:hidden;border:none}
        .logo-icon{width:28px;height:28px;background:${T.accent};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;font-family:'IBM Plex Mono',monospace;font-weight:500;flex-shrink:0}
        .new-btn{margin:12px;padding:8px 12px;background:${T.accentBg};border:1px solid ${T.accentBorder};border-radius:8px;color:${T.accentLight};font-size:12px;font-family:'Sora',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s;width:calc(100% - 24px)}
        .new-btn:hover{background:${T.accent};color:#fff;border-color:${T.accent}}
        .sec-label{padding:14px 12px 4px;font-size:10px;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.08em;font-family:'IBM Plex Mono',monospace}
        .conv-list{flex:1;overflow-y:auto;padding:4px 8px}
        .conv-item{padding:7px 8px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background 0.1s;margin:1px 0}
        .conv-item:hover,.conv-item.active{background:${T.surfaceHover}}
        .conv-title{font-size:12px;color:${T.textMuted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
        .sf{padding:12px;border-top:1px solid ${T.borderLight}}
        .user-pill{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer}
        .user-pill:hover{background:${T.surfaceHover}}
        .avatar{width:28px;height:28px;border-radius:50%;background:${T.accent};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:#fff;flex-shrink:0}
        .main{flex:1;display:flex;flex-direction:column;min-width:0}
        .topbar{height:48px;border-bottom:1px solid ${T.border};display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0}
        .tb-btn{width:30px;height:30px;border-radius:6px;background:transparent;border:1px solid ${T.border};color:${T.textMuted};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;transition:all 0.1s}
        .tb-btn:hover{background:${T.surface};color:${T.text}}
        .tabs{display:flex;gap:4px}
        .tab{padding:5px 10px;border-radius:6px;border:1px solid ${T.border};background:transparent;color:${T.textMuted};font-size:11px;font-family:'Sora',sans-serif;cursor:pointer;transition:all 0.1s}
        .tab.active{background:${T.accentBg};border-color:${T.accentBorder};color:${T.accentLight}}
        .tab:hover:not(.active){background:${T.surface};color:${T.text}}
        .chat-area{flex:1;overflow-y:auto;padding:24px 16px 16px;display:flex;flex-direction:column;gap:20px}
        .welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:20px;text-align:center;padding:40px 20px}
        .w-icon{width:56px;height:56px;background:${T.accentBg};border:1px solid ${T.accentBorder};border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;color:${T.accent}}
        .suggs{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:500px}
        .sugg{padding:10px 12px;background:${T.surface};border:1px solid ${T.border};border-radius:8px;color:${T.textMuted};font-size:11.5px;font-family:'Sora',sans-serif;cursor:pointer;text-align:left;transition:all 0.15s;line-height:1.4}
        .sugg:hover{background:${T.surfaceHover};color:${T.text};border-color:${T.accentBorder}}
        .msg-group{display:flex;gap:10px}
        .msg-group.user{flex-direction:row-reverse}
        .msg-av{width:28px;height:28px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px}
        .msg-av.ai{background:${T.accentBg};border:1px solid ${T.accentBorder};color:${T.accent};font-family:'IBM Plex Mono',monospace;font-weight:500}
        .msg-av.user{background:${T.surface};border:1px solid ${T.border};color:${T.textMuted}}
        .msg-body{max-width:80%;display:flex;flex-direction:column;gap:4px}
        .bubble{padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.65}
        .bubble.ai{background:${T.aiBubble};border:1px solid ${T.border};color:${T.text};border-radius:4px 12px 12px 12px}
        .bubble.user{background:${T.userBubble};border:1px solid ${T.accentBorder};color:${T.text};border-radius:12px 4px 12px 12px}
        .msg-time{font-size:10px;color:${T.textFaint};font-family:'IBM Plex Mono',monospace;padding:0 4px}
        .msg-group.user .msg-time{text-align:right}
        .dots{display:flex;gap:3px;align-items:center;padding:4px 0}
        .dot{width:5px;height:5px;background:${T.textFaint};border-radius:50%;animation:pulse 1.2s ease-in-out infinite}
        .dot:nth-child(2){animation-delay:0.2s}
        .dot:nth-child(3){animation-delay:0.4s}
        @keyframes pulse{0%,80%,100%{opacity:0.2;transform:scale(0.9)}40%{opacity:1;transform:scale(1)}}
        .msg-acts{display:flex;gap:4px;margin-top:4px}
        .msg-act{padding:3px 8px;background:transparent;border:1px solid ${T.border};border-radius:4px;color:${T.textFaint};font-size:10px;font-family:'Sora',sans-serif;cursor:pointer;transition:all 0.1s}
        .msg-act:hover{background:${T.surface};color:${T.accent};border-color:${T.accentBorder}}
        .input-area{padding:12px 16px 16px;border-top:1px solid ${T.border};flex-shrink:0}
        .input-row{display:flex;gap:8px;align-items:flex-end;background:${T.inputBg};border:1px solid ${T.border};border-radius:10px;padding:8px 8px 8px 14px;transition:border-color 0.15s}
        .input-row:focus-within{border-color:${T.accentBorder}}
        .chat-input{flex:1;background:transparent;border:none;outline:none;color:${T.text};font-family:'Sora',sans-serif;font-size:13px;resize:none;max-height:120px;line-height:1.5;padding:2px 0}
        .chat-input::placeholder{color:${T.textFaint}}
        .send-btn{width:32px;height:32px;background:${T.accent};border:none;border-radius:7px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:opacity 0.15s;flex-shrink:0}
        .send-btn:disabled{opacity:0.3;cursor:default}
        .send-btn:hover:not(:disabled){opacity:0.85}
        .inp-acts{display:flex;gap:4px;padding:6px 0 0}
        .inp-act{padding:3px 8px;background:transparent;border:1px solid ${T.border};border-radius:4px;color:${T.textFaint};font-size:10px;font-family:'Sora',sans-serif;cursor:pointer;transition:all 0.1s}
        .inp-act:hover{background:${T.surface};color:${T.textMuted}}
        .tag{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:10px;font-family:'IBM Plex Mono',monospace;font-weight:500}
        .tag-dept{background:${T.accentBg};color:${T.accentLight};border:1px solid ${T.accentBorder}}
        .tag-sla{background:${T.successBg};color:#4ade80;border:1px solid #0d3320}
        .dash{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px;overflow-y:auto;align-content:start}
        .dc{background:${T.surface};border:1px solid ${T.border};border-radius:10px;padding:14px}
        .dc.full{grid-column:1/-1}
        .dl{font-size:10px;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.08em;font-family:'IBM Plex Mono',monospace;margin-bottom:6px}
        .dv{font-size:28px;font-weight:500;color:${T.text};font-family:'IBM Plex Mono',monospace}
        .ds{font-size:11px;color:${T.textMuted};margin-top:2px}
        .bar-row{display:flex;align-items:center;gap:8px;margin:6px 0}
        .bar-lbl{font-size:11px;color:${T.textMuted};width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}
        .bar-track{flex:1;height:5px;background:${T.border};border-radius:3px;overflow:hidden}
        .bar-fill{height:100%;background:${T.accent};border-radius:3px;transition:width 0.6s ease}
        .bar-val{font-size:10px;color:${T.textFaint};font-family:'IBM Plex Mono',monospace;width:32px;text-align:right;flex-shrink:0}
        .proc-list{padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
        .proc-card{background:${T.surface};border:1px solid ${T.border};border-radius:10px;padding:14px;cursor:pointer;transition:border-color 0.15s}
        .proc-card:hover{border-color:${T.accentBorder}}
        .proc-id{font-size:10px;color:${T.textFaint};font-family:'IBM Plex Mono',monospace}
        .proc-name{font-size:14px;font-weight:500;color:${T.text};margin:4px 0 8px}
        .proc-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
      `}</style>

      <div className="root">
        {/* Sidebar */}
        <div className={`sidebar${sidebarOpen ? '' : ' closed'}`}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${T.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="logo-icon">∅</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>Oráculo</div>
                <div style={{ fontSize: 10, color: T.textMuted, fontFamily: "'IBM Plex Mono',monospace" }}>PROC. OPERACIONAIS</div>
              </div>
            </div>
          </div>
          <button className="new-btn" onClick={() => { setMessages([]); setView('chat') }}>
            <span style={{ fontSize: 16 }}>+</span> Nova conversa
          </button>
          <div className="sec-label">Recentes</div>
          <div className="conv-list">
            {SAMPLE_CONVERSATIONS.map(c => (
              <div key={c.id} className={`conv-item${activeConv === c.id ? ' active' : ''}`}
                onClick={() => { setActiveConv(c.id); setView('chat') }}>
                <span style={{ fontSize: 12, color: T.textFaint }}>💬</span>
                <span className="conv-title">{c.title}</span>
                {c.date === 'Hoje' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, flexShrink: 0 }} />}
              </div>
            ))}
          </div>
          <div className="sf">
            <div className="user-pill">
              <div className="avatar">JC</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>João Carlos</div>
                <div style={{ fontSize: 10, color: T.textMuted }}>Operador · TI</div>
              </div>
              <span style={{ fontSize: 14, color: T.textFaint, cursor: 'pointer' }}>⚙</span>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <button className="tb-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Sidebar">☰</button>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.text }}>
              {view === 'chat' ? 'Chat operacional' : view === 'dash' ? 'Dashboard analítico' : 'Procedimentos'}
            </span>
            <div className="tabs">
              {(['chat', 'procs', 'dash'] as const).map((v, i) => (
                <button key={v} className={`tab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
                  {['Chat', 'Procedimentos', 'Dashboard'][i]}
                </button>
              ))}
            </div>
          </div>

          {/* Chat */}
          {view === 'chat' && (
            <>
              <div className="chat-area">
                {messages.length === 0 ? (
                  <div className="welcome">
                    <div className="w-icon">∅</div>
                    <div style={{ fontSize: 20, fontWeight: 500 }}>Oráculo Operacional</div>
                    <div style={{ fontSize: 13, color: T.textMuted, maxWidth: 340, lineHeight: 1.6 }}>
                      Consulte procedimentos internos, fluxos de aprovação, checklists e políticas corporativas.
                    </div>
                    <div className="suggs">
                      {SUGGESTIONS.map((s, i) => (
                        <button key={i} className="sugg" onClick={() => sendMessage(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`msg-group ${msg.role}`}>
                      <div className={`msg-av ${msg.role}`}>{msg.role === 'ai' ? '∅' : 'JC'}</div>
                      <div className="msg-body">
                        <div className={`bubble ${msg.role}`}>
                          {msg.typing ? (
                            <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                          ) : msg.role === 'ai' ? (
                            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                          ) : msg.content}
                        </div>
                        <div className="msg-time">{msg.time}</div>
                        {msg.role === 'ai' && !msg.typing && msg.content && (
                          <div className="msg-acts">
                            <button className="msg-act" onClick={() => sendMessage('Inicie a execução guiada deste procedimento')}>▶ Executar</button>
                            <button className="msg-act" onClick={() => sendMessage('Quais são os riscos deste procedimento?')}>⚠ Riscos</button>
                            <button className="msg-act" onClick={() => { if (typeof navigator !== 'undefined') navigator.clipboard?.writeText(msg.content) }}>⎘ Copiar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <div className="input-area">
                <div className="input-row">
                  <textarea className="chat-input" placeholder="Consulte um procedimento operacional..."
                    value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                    rows={1} disabled={streaming} />
                  <button className="send-btn" onClick={() => sendMessage(input)} disabled={!input.trim() || streaming} aria-label="Enviar">↑</button>
                </div>
                <div className="inp-acts">
                  {['📎 Anexar doc', '🔍 Buscar base', '✅ Novo checklist'].map(a => (
                    <button key={a} className="inp-act">{a}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Procedures */}
          {view === 'procs' && (
            <div className="proc-list">
              {KNOWLEDGE_BASE.map(p => (
                <div key={p.id} className="proc-card" onClick={() => { sendMessage(`Me explique o procedimento ${p.name}`); setView('chat') }}>
                  <div className="proc-id">{p.id}</div>
                  <div className="proc-name">{p.name}</div>
                  <div className="proc-meta">
                    <span className="tag tag-dept">{p.department}</span>
                    <span className="tag tag-dept">{p.category}</span>
                    <span className="tag tag-sla">SLA {p.sla}</span>
                    <span style={{ fontSize: 11, color: T.textFaint, marginLeft: 'auto' }}>{p.steps.length} passos</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dashboard */}
          {view === 'dash' && (
            <div className="dash">
              {[
                { label: 'Procedimentos ativos', value: String(ANALYTICS.procedures), sub: '+3 este mês' },
                { label: 'Execuções no mês', value: String(ANALYTICS.executions), sub: '↑ 12% vs anterior' },
                { label: 'SLA compliance', value: ANALYTICS.slaCompliance + '%', sub: 'Meta: 95%' },
                { label: 'NCs abertas', value: String(ANALYTICS.openNC), sub: '2 críticas' },
              ].map((m, i) => (
                <div key={i} className="dc">
                  <div className="dl">{m.label}</div>
                  <div className="dv" style={{ color: i === 3 ? '#f87171' : T.text }}>{m.value}</div>
                  <div className="ds">{m.sub}</div>
                </div>
              ))}
              <div className="dc full">
                <div className="dl">Procedimentos mais utilizados</div>
                <div style={{ marginTop: 10 }}>
                  {ANALYTICS.topProcedures.map((p, i) => (
                    <div key={i} className="bar-row">
                      <span className="bar-lbl">{p.name}</span>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round(p.uses / 89 * 100)}%` }} /></div>
                      <span className="bar-val">{p.uses}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dc full">
                <div className="dl">SLA compliance por departamento</div>
                <div style={{ marginTop: 10 }}>
                  {ANALYTICS.slaByDept.map((d, i) => (
                    <div key={i} className="bar-row">
                      <span className="bar-lbl">{d.dept}</span>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${d.compliance}%`, background: d.compliance >= 95 ? '#22c55e' : d.compliance >= 85 ? T.accent : '#ef4444' }} /></div>
                      <span className="bar-val">{d.compliance}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

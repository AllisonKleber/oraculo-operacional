'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { FIGURAS, QA_BASE, QA } from '../lib/knowledge'

const T = {
  bg: '#0d0d0f', sidebar: '#111114', surface: '#18181c', surfaceHover: '#1e1e23',
  border: '#2a2a32', borderLight: '#22222a', text: '#e8e8f0', textMuted: '#8888a0',
  textFaint: '#4a4a5a', accent: '#7c6af7', accentLight: '#a99df7', accentBg: '#1a1730',
  accentBorder: '#3d3580', successBg: '#0f2a1a', warningBg: '#2a1f0a',
  userBubble: '#1a1730', aiBubble: '#111114', inputBg: '#18181c',
}

interface User { name: string; matricula: string; tipo: 'proprio' | 'terceirizado'; role: 'usuario' | 'admin' }
interface Message { id: number; role: 'user' | 'ai'; content: string; time: string; typing?: boolean; figuras?: string[] }
interface UploadedDoc { id: string; name: string; code: string; uploadedBy: string; uploadedAt: string; size: string }

// ── PROCEDIMENTOS ──────────────────────────────────────
const PROCEDURES = [
  {
    id: '1', code: 'DIS-NOR-030', rev: '07', pages: 142,
    name: 'Fornecimento de Energia Elétrica em Tensão Secundária de Distribuição a Edificações Individuais',
    category: 'Distribuição', department: 'Engenharia',
    approver: 'Ricardo Prado Pina', approvalDate: '17/04/2026',
    objective: 'Estabelecer as condições para o fornecimento de energia elétrica para as unidades consumidoras individuais em tensão secundária de distribuição.',
    scope: 'Aplica-se às instalações consumidoras com carga instalada até 75 kW, a serem ligadas nas redes de energia elétrica de tensão secundária de distribuição.',
    source: 'DIS-NOR-030 REV.07 — Aprovado em 17/04/2026',
    sections: [
      { title: '6.1.1.1 Requisitos Gerais', content: 'Aplica-se às instalações novas, alteração de carga e reforma de instalações com as seguintes características:\n\na) Edificação individual formada por uma única unidade consumidora;\nb) Edificações sem área de uso comum, formadas por duas unidades consumidoras do grupo B contíguas, geminadas ou dispostas verticalmente;\nc) Lote rural sem área de uso comum, formadas por unidades consumidoras contíguas ou geminadas;\nd) Entre 3 e 5 unidades consumidoras monofásicas com carga máxima de 5 kW por unidade, em um mesmo terreno, com caixas de medição em muro ou mureta de alvenaria e entradas de serviço distintas — conforme Figura 44.' },
      { title: '6.2 Tensão de Fornecimento', content: 'A tensão de fornecimento é definida conforme a carga instalada e a disponibilidade da rede da distribuidora, observando as Normas ABNT e a REN ANEEL nº 1.000/2021.' },
      { title: '6.3 Documento de Responsabilidade Técnica (DRT)', content: 'A apresentação do DRT é obrigatória conforme as categorias do Quadro 1. Deve ser elaborado por profissional habilitado e registrado no CREA.' },
      { title: '6.4 Carga Instalada e Demanda Máxima', content: 'A carga instalada é a soma das potências nominais de todos os equipamentos. A demanda máxima é determinada pelos fatores de demanda nas tabelas da norma.' },
      { title: '6.5 Ponto de Conexão', content: 'Ponto da rede de distribuição onde se conecta o ramal de conexão. Deve estar na via pública ou no limite da propriedade conforme diretrizes da distribuidora.' },
      { title: '6.7 Ramal de Conexão', content: 'Trecho entre o ponto de conexão na rede e o ponto de entrega. Deve ser dimensionado conforme as tabelas de cabos da norma.' },
      { title: '6.9 Padrão de Entrada de Energia', content: 'Deve ser instalado no limite da propriedade, em local de fácil acesso. Deve atender às normas DIS-ETE-145 e DIS-ETE-146.' },
      { title: '6.21 Fornecimento Provisório', content: 'Destinado a obras de construção civil ou eventos temporários. Deve ser solicitado formalmente com prazo definido. Não pode ser convertido em fornecimento definitivo.' },
      { title: '6.25 Recarga de Veículos Elétricos', content: 'Pontos de recarga devem atender aos critérios técnicos da norma. A carga de recarga deve ser considerada no cálculo da demanda total.' },
    ],
  },
  {
    id: '2', code: 'DIS-NOR-053', rev: '06', pages: 353,
    name: 'Fornecimento de Energia Elétrica a Edificações com Múltiplas Unidades Consumidoras até 34,5 kV',
    category: 'Distribuição', department: 'Engenharia',
    approver: 'Ricardo Prado Pina', approvalDate: '09/09/2025',
    objective: 'Padronizar as entradas de serviço e estabelecer as condições para o fornecimento de energia elétrica a edificações de múltiplas unidades consumidoras do Grupo Neoenergia.',
    scope: 'Aplica-se a edificações com múltiplas unidades consumidoras atendidas em tensão secundária ou primária até 34,5 kV pelas distribuidoras do Grupo Neoenergia.',
    source: 'DIS-NOR-053 REV.06 — Aprovado em 09/09/2025',
    sections: [
      { title: '4. Responsabilidades', content: 'Compete aos órgãos de planejamento, engenharia, suprimento, projetos, construção, ligação, manutenção e operação do sistema elétrico cumprir e fazer cumprir este instrumento normativo.' },
      { title: '5. Distribuidoras do Grupo Neoenergia', content: 'Bahia: Neoenergia Coelba\nPernambuco: Neoenergia Pernambuco\nRio Grande do Norte: Neoenergia Cosern\nSão Paulo e Mato Grosso do Sul: Neoenergia Elektro\nBrasília: Neoenergia Brasília' },
      { title: '5. Cubículos e Conjuntos', content: 'Conjunto Modular de Policarbonato: para medição em baixa tensão.\nConjunto Metálico: para medição em média tensão.\nCubículo de Medição (M): destinado exclusivamente à medição de energia elétrica.' },
      { title: '5. Banco de Dutos', content: 'Sistema de dutos subterrâneos para instalação de cabos elétricos. Dimensionado conforme número de cabos, corrente e condições de instalação.' },
      { title: '5. Carga Perturbadora', content: 'Cargas que produzem perturbações na rede elétrica (harmônicos, flutuações de tensão, desequilíbrio de fases). O consumidor deve apresentar estudo de qualidade de energia quando possuir tais cargas.' },
    ],
  },
]

// ── MOTOR DE BUSCA ────────────────────────────────────
function searchQA(query: string, qaBase: QA[]): QA | null {
  const q = query.toLowerCase()
  for (const qa of qaBase) {
    if (qa.palavrasChave.some(kw => q.includes(kw.toLowerCase()))) return qa
  }
  return null
}

function searchProcedures(query: string) {
  const q = query.toLowerCase()
  const is053 = q.includes('053') || q.includes('múltiplas') || q.includes('condomínio') || q.includes('cubículo') || q.includes('34,5') || q.includes('neoenergia') || q.includes('coelba') || q.includes('cosern') || q.includes('banco de dutos') || q.includes('perturbadora')
  const is030 = q.includes('030') || q.includes('individual') || q.includes('75 kw') || q.includes('ramal de conexão') || q.includes('padrão de entrada') || q.includes('provisório') || q.includes('veículo elétrico') || q.includes('carga instalada') || q.includes('demanda') || q.includes('drt') || q.includes('responsabilidade técnica')
  return is053 ? PROCEDURES[1] : is030 ? PROCEDURES[0] : null
}

function buildAnswer(query: string, qaBase: QA[]): { text: string; figuras: string[] } {
  // 1. Prioridade: Q&A treinada
  const qa = searchQA(query, qaBase)
  if (qa) return { text: qa.resposta, figuras: qa.figuras }

  // 2. Fallback: busca nas seções
  const proc = searchProcedures(query)
  if (!proc) {
    return {
      text: `Não encontrei seção específica para essa consulta.\n\nAs normas disponíveis são:\n\n- **DIS-NOR-030 Rev.07** — Edificações Individuais (até 75 kW)\n- **DIS-NOR-053 Rev.06** — Múltiplas Unidades (até 34,5 kV)\n\nExemplos de consulta: "duas entradas de energia", "ramal de conexão", "cubículo de medição", "fornecimento provisório".`,
      figuras: []
    }
  }

  const q = query.toLowerCase()
  let best = proc.sections[0]
  const words = q.split(' ').filter(w => w.length > 3)
  for (const s of proc.sections) {
    const hits = words.filter(w => (s.title + ' ' + s.content).toLowerCase().includes(w)).length
    const bestHits = words.filter(w => (best.title + ' ' + best.content).toLowerCase().includes(w)).length
    if (hits > bestHits) best = s
  }

  // Detectar figuras citadas na seção
  const figMatches = (best.content + best.title).match(/Figura (\d+[a-z]?)/gi) || []
  const figNums = figMatches.map(f => f.replace(/Figura /i, '').trim()).filter(n => FIGURAS[n])

  const text = `## ${proc.name}\n\n**Código:** ${proc.code} Rev.${proc.rev}  \n**Aprovador:** ${proc.approver}  \n**Aprovação:** ${proc.approvalDate}\n\n---\n\n### ${best.title}\n\n${best.content}\n\n---\n\n> 📄 **Fonte:** ${proc.source}`
  return { text, figuras: figNums }
}

async function* streamText(text: string): AsyncGenerator<string> {
  const words = text.split(' ')
  let buf = ''
  for (let i = 0; i < words.length; i++) {
    buf += (i > 0 ? ' ' : '') + words[i]
    if (i % 4 === 3 || i === words.length - 1) { yield buf; buf = ''; await new Promise(r => setTimeout(r, 14 + Math.random() * 16)) }
  }
}

function renderMd(text: string): string {
  return text
    .replace(/^## (.+)$/gm, `<h2 style="font-size:15px;font-weight:500;color:#e8e8f0;margin:16px 0 8px">$1</h2>`)
    .replace(/^### (.+)$/gm, `<h3 style="font-size:11px;font-weight:500;color:#8888a0;margin:12px 0 6px;text-transform:uppercase;letter-spacing:0.06em">$1</h3>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="font-weight:500;color:#e8e8f0">$1</strong>`)
    .replace(/^---$/gm, `<hr style="border:none;border-top:1px solid #2a2a32;margin:12px 0">`)
    .replace(/^> 📄 \*\*(.+?):\*\* (.+)$/gm, `<div style="background:#1a1730;border-left:3px solid #7c6af7;border-radius:0 6px 6px 0;padding:8px 12px;margin:12px 0;font-size:12px;color:#8888a0"><strong style="color:#a99df7">$1:</strong> $2</div>`)
    .replace(/\n/g, '<br>')
}

const SUGGESTIONS = ['É possível ter duas entradas de energia?', 'O que é a DIS-NOR-030?', 'Campo de aplicação da NOR-053', 'O que é cubículo de medição?', 'Fornecimento provisório', 'Distribuidoras do Grupo Neoenergia']
const SAMPLE_CONVS = [{ id: 'c1', title: 'Duas entradas de energia' }, { id: 'c2', title: 'DIS-NOR-030 — Ramal de conexão' }, { id: 'c3', title: 'Cubículos NOR-053' }, { id: 'c4', title: 'Fornecimento provisório' }]

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{background:#0d0d0f}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2a32;border-radius:2px}
.root{font-family:'Sora',sans-serif;background:#0d0d0f;color:#e8e8f0;height:100vh;display:flex;overflow:hidden}
.sidebar{width:240px;background:#111114;border-right:1px solid #2a2a32;display:flex;flex-direction:column;flex-shrink:0;transition:width .2s}
.sidebar.closed{width:0;overflow:hidden;border:none}
.new-btn{margin:12px;padding:8px 12px;background:#1a1730;border:1px solid #3d3580;border-radius:8px;color:#a99df7;font-size:12px;font-family:'Sora',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s;width:calc(100% - 24px)}
.new-btn:hover{background:#7c6af7;color:#fff;border-color:#7c6af7}
.conv-item{padding:7px 8px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:8px;margin:1px 0;transition:background .1s}
.conv-item:hover,.conv-item.active{background:#1e1e23}
.topbar{height:48px;border-bottom:1px solid #2a2a32;display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0}
.tb-btn{width:30px;height:30px;border-radius:6px;background:transparent;border:1px solid #2a2a32;color:#8888a0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px}
.tb-btn:hover{background:#18181c;color:#e8e8f0}
.tab{padding:5px 10px;border-radius:6px;border:1px solid #2a2a32;background:transparent;color:#8888a0;font-size:11px;font-family:'Sora',sans-serif;cursor:pointer;transition:all .1s}
.tab.active{background:#1a1730;border-color:#3d3580;color:#a99df7}
.tab:hover:not(.active){background:#18181c;color:#e8e8f0}
.chat-area{flex:1;overflow-y:auto;padding:24px 16px 16px;display:flex;flex-direction:column;gap:20px}
.sugg{padding:10px 12px;background:#18181c;border:1px solid #2a2a32;border-radius:8px;color:#8888a0;font-size:11.5px;font-family:'Sora',sans-serif;cursor:pointer;text-align:left;transition:all .15s;line-height:1.4}
.sugg:hover{background:#1e1e23;color:#e8e8f0;border-color:#3d3580}
.bubble{padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.65}
.bubble.ai{background:#111114;border:1px solid #2a2a32;color:#e8e8f0;border-radius:4px 12px 12px 12px}
.bubble.user{background:#1a1730;border:1px solid #3d3580;color:#e8e8f0;border-radius:12px 4px 12px 12px}
.dots{display:flex;gap:3px;align-items:center;padding:4px 0}
.dot{width:5px;height:5px;background:#4a4a5a;border-radius:50%;animation:pulse 1.2s ease-in-out infinite}
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
@keyframes pulse{0%,80%,100%{opacity:.2;transform:scale(.9)}40%{opacity:1;transform:scale(1)}}
.msg-act{padding:3px 8px;background:transparent;border:1px solid #2a2a32;border-radius:4px;color:#4a4a5a;font-size:10px;font-family:'Sora',sans-serif;cursor:pointer;transition:all .1s}
.msg-act:hover{background:#18181c;color:#7c6af7;border-color:#3d3580}
.input-row{display:flex;gap:8px;align-items:flex-end;background:#18181c;border:1px solid #2a2a32;border-radius:10px;padding:8px 8px 8px 14px;transition:border-color .15s}
.input-row:focus-within{border-color:#3d3580}
.chat-input{flex:1;background:transparent;border:none;outline:none;color:#e8e8f0;font-family:'Sora',sans-serif;font-size:13px;resize:none;max-height:120px;line-height:1.5;padding:2px 0}
.chat-input::placeholder{color:#4a4a5a}
.send-btn{width:32px;height:32px;background:#7c6af7;border:none;border-radius:7px;color:#fff;cursor:pointer;font-size:14px;flex-shrink:0}
.send-btn:disabled{opacity:.3;cursor:default}.send-btn:hover:not(:disabled){opacity:.85}
.tag{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:10px;font-family:'IBM Plex Mono',monospace;font-weight:500}
.tag-d{background:#1a1730;color:#a99df7;border:1px solid #3d3580}
.tag-s{background:#0f2a1a;color:#4ade80;border:1px solid #0d3320}
.tag-w{background:#2a1f0a;color:#fbbf24;border:1px solid #3a2800}
.tag-p{background:#1a2030;color:#38bdf8;border:1px solid #0d2540}
.dc{background:#18181c;border:1px solid #2a2a32;border-radius:10px;padding:14px}
.dl{font-size:10px;color:#4a4a5a;text-transform:uppercase;letter-spacing:.08em;font-family:'IBM Plex Mono',monospace;margin-bottom:6px}
.bar-track{flex:1;height:5px;background:#2a2a32;border-radius:3px;overflow:hidden}
.bar-fill{height:100%;background:#7c6af7;border-radius:3px}
.proc-card{background:#18181c;border:1px solid #2a2a32;border-radius:10px;padding:14px;margin-bottom:8px;cursor:pointer;transition:border-color .15s}
.proc-card:hover{border-color:#3d3580}
.doc-card{background:#18181c;border:1px solid #2a2a32;border-radius:10px;padding:14px;margin-bottom:8px}
.upload-area{border:1px dashed #2a2a32;border-radius:10px;padding:24px;text-align:center;cursor:pointer;transition:all .15s;margin-bottom:16px}
.upload-area:hover{border-color:#3d3580;background:#1a1730}
.qa-card{background:#18181c;border:1px solid #2a2a32;border-radius:10px;padding:14px;margin-bottom:8px}
.qa-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
.qa-field label{font-size:11px;color:#8888a0}
.qa-field input,.qa-field textarea{background:#0d0d0f;border:1px solid #2a2a32;border-radius:7px;padding:8px 10px;color:#e8e8f0;font-family:'Sora',sans-serif;font-size:12px;outline:none;transition:border-color .15s}
.qa-field input:focus,.qa-field textarea:focus{border-color:#3d3580}
.qa-field textarea{resize:vertical;min-height:80px}
.fig-box{background:#111114;border:1px solid #2a2a32;border-radius:8px;padding:10px;margin-top:12px}
.fig-title{font-size:11px;color:#8888a0;margin-bottom:6px;font-family:'IBM Plex Mono',monospace}
.fig-img{width:100%;border-radius:6px;border:1px solid #2a2a32}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.field label{font-size:12px;color:#8888a0}
.field input,.field select{background:#18181c;border:1px solid #2a2a32;border-radius:8px;padding:9px 12px;color:#e8e8f0;font-family:'Sora',sans-serif;font-size:13px;outline:none;transition:border-color .15s;width:100%}
.field input:focus,.field select:focus{border-color:#3d3580}
.field select option{background:#18181c}
.login-btn{width:100%;padding:10px;background:#7c6af7;border:none;border-radius:8px;color:#fff;font-family:'Sora',sans-serif;font-size:13px;font-weight:500;cursor:pointer;margin-top:8px}
.login-btn:hover{opacity:.88}.login-btn:disabled{opacity:.4;cursor:default}
.logo-icon{width:28px;height:28px;background:#7c6af7;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;font-family:'IBM Plex Mono',monospace;font-weight:500;flex-shrink:0}
.avatar{width:28px;height:28px;border-radius:50%;background:#7c6af7;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:#fff;flex-shrink:0}
.save-btn{padding:7px 16px;background:#7c6af7;border:none;border-radius:7px;color:#fff;font-family:'Sora',sans-serif;font-size:12px;cursor:pointer}
.save-btn:hover{opacity:.88}
.cancel-btn{padding:7px 16px;background:transparent;border:1px solid #2a2a32;border-radius:7px;color:#8888a0;font-family:'Sora',sans-serif;font-size:12px;cursor:pointer}
.cancel-btn:hover{background:#18181c}
`

// ═══════════════════════════════════════════════════════
export default function Oraculo() {
  const [user, setUser] = useState<User | null>(null)
  const [view, setView] = useState<'chat' | 'procs' | 'dash' | 'docs' | 'treino'>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [activeConv, setActiveConv] = useState('c1')
  const [qaBase, setQaBase] = useState<QA[]>(QA_BASE)
  const [novoQA, setNovoQA] = useState({ pergunta: '', palavrasChave: '', resposta: '', artigo: '', norma: 'DIS-NOR-030' })
  const [adicionandoQA, setAdicionandoQA] = useState(false)
  const [docs, setDocs] = useState([
    { id: 'd1', name: 'DIS-NOR-030-REV07.pdf', code: 'DIS-NOR-030', uploadedBy: 'Admin', uploadedAt: '17/04/2026', size: '142 pág.' },
    { id: 'd2', name: 'DIS-NOR-053-REV06.pdf', code: 'DIS-NOR-053', uploadedBy: 'Admin', uploadedAt: '09/09/2025', size: '353 pág.' },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const nowStr = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return
    setInput('')
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: text, time: nowStr() }])
    setStreaming(true)
    const aiId = Date.now() + 1
    setMessages(prev => [...prev, { id: aiId, role: 'ai', content: '', time: nowStr(), typing: true, figuras: [] }])
    await new Promise(r => setTimeout(r, 500 + Math.random() * 350))
    const { text: response, figuras } = buildAnswer(text, qaBase)
    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, typing: false, figuras } : m))
    let acc = ''
    for await (const chunk of streamText(response)) {
      acc += (acc ? ' ' : '') + chunk
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: acc } : m))
    }
    setStreaming(false)
  }, [streaming, qaBase])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const salvarQA = () => {
    if (!novoQA.pergunta || !novoQA.resposta || !novoQA.palavrasChave) return
    const newEntry: QA = {
      id: `qa-${Date.now()}`,
      pergunta: novoQA.pergunta,
      palavrasChave: novoQA.palavrasChave.split(',').map(s => s.trim()).filter(Boolean),
      resposta: novoQA.resposta,
      artigo: novoQA.artigo,
      norma: novoQA.norma,
      figuras: []
    }
    setQaBase(prev => [newEntry, ...prev])
    setNovoQA({ pergunta: '', palavrasChave: '', resposta: '', artigo: '', norma: 'DIS-NOR-030' })
    setAdicionandoQA(false)
  }

  if (!user) return <LoginScreen onLogin={setUser} />

  const isAdmin = user.role === 'admin'
  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <style>{CSS}</style>
      <div className="root">
        {/* SIDEBAR */}
        <div className={`sidebar${sidebarOpen ? '' : ' closed'}`}>
          <div style={{ padding: 16, borderBottom: '1px solid #22222a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="logo-icon">∅</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8f0' }}>Oráculo</div>
                <div style={{ fontSize: 10, color: '#8888a0', fontFamily: "'IBM Plex Mono',monospace" }}>NORMAS TÉCNICAS</div>
              </div>
            </div>
          </div>
          <button className="new-btn" onClick={() => { setMessages([]); setView('chat') }}>
            <span style={{ fontSize: 16 }}>+</span> Nova consulta
          </button>
          <div style={{ padding: '14px 12px 4px', fontSize: 10, color: '#4a4a5a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontFamily: "'IBM Plex Mono',monospace" }}>Recentes</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
            {SAMPLE_CONVS.map(c => (
              <div key={c.id} className={`conv-item${activeConv === c.id ? ' active' : ''}`} onClick={() => { setActiveConv(c.id); setView('chat') }}>
                <span style={{ fontSize: 11, color: '#4a4a5a' }}>💬</span>
                <span style={{ fontSize: 12, color: '#8888a0', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{c.title}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid #22222a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
              <div className="avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#e8e8f0', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: '#8888a0' }}>{user.matricula} · {user.tipo === 'proprio' ? 'Próprio' : 'Terceirizado'}</div>
              </div>
              {isAdmin && <span className="tag tag-w" style={{ fontSize: 9 }}>ADM</span>}
            </div>
            <button onClick={() => setUser(null)} style={{ width: '100%', marginTop: 8, padding: 5, background: 'transparent', border: '1px solid #2a2a32', borderRadius: 6, color: '#4a4a5a', fontSize: 11, cursor: 'pointer', fontFamily: "'Sora',sans-serif" }}>Sair</button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="topbar">
            <button className="tb-btn" onClick={() => setSidebarOpen(o => !o)}>☰</button>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#e8e8f0' }}>
              {view === 'chat' ? 'Consulta normativa' : view === 'dash' ? 'Dashboard' : view === 'docs' ? 'Documentos' : view === 'treino' ? 'Treinamento da IA' : 'Base normativa'}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                ['chat', 'Chat'],
                ['procs', 'Normas'],
                ...(isAdmin ? [['docs', 'Documentos'], ['treino', 'Treinamento'], ['dash', 'Dashboard']] : [])
              ].map(([v, label]) => (
                <button key={v} className={`tab${view === v ? ' active' : ''}`} onClick={() => setView(v as typeof view)}>{label}</button>
              ))}
            </div>
          </div>

          {/* CHAT */}
          {view === 'chat' && (
            <>
              <div className="chat-area">
                {messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20, textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ width: 56, height: 56, background: '#1a1730', border: '1px solid #3d3580', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#7c6af7' }}>∅</div>
                    <div style={{ fontSize: 20, fontWeight: 500 }}>Oráculo Normativo</div>
                    <div style={{ fontSize: 13, color: '#8888a0', maxWidth: 380, lineHeight: 1.6 }}>
                      Consulte as normas técnicas DIS-NOR-030 e DIS-NOR-053. Figuras e diagramas são exibidos automaticamente nas respostas.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 520 }}>
                      {SUGGESTIONS.map((s, i) => <button key={i} className="sugg" onClick={() => sendMessage(s)}>{s}</button>)}
                    </div>
                  </div>
                ) : messages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, background: msg.role === 'ai' ? '#1a1730' : '#18181c', border: `1px solid ${msg.role === 'ai' ? '#3d3580' : '#2a2a32'}`, color: msg.role === 'ai' ? '#7c6af7' : '#8888a0', fontFamily: msg.role === 'ai' ? "'IBM Plex Mono',monospace" : 'inherit' }}>
                      {msg.role === 'ai' ? '∅' : initials}
                    </div>
                    <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div className={`bubble ${msg.role}`}>
                        {msg.typing
                          ? <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                          : msg.role === 'ai'
                            ? <div dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }} />
                            : msg.content}
                      </div>

                      {/* FIGURAS — exibidas após o texto da resposta */}
                      {msg.role === 'ai' && !msg.typing && msg.figuras && msg.figuras.length > 0 && (
                        msg.figuras.map(figNum => FIGURAS[figNum] && (
                          <div key={figNum} className="fig-box">
                            <div className="fig-title">
                              📐 {FIGURAS[figNum].titulo} — {FIGURAS[figNum].norma} p.{FIGURAS[figNum].pagina}
                            </div>
                            <img src={FIGURAS[figNum].src} alt={FIGURAS[figNum].titulo} className="fig-img" />
                          </div>
                        ))
                      )}

                      <div style={{ fontSize: 10, color: '#4a4a5a', fontFamily: "'IBM Plex Mono',monospace", padding: '0 4px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>{msg.time}</div>
                      {msg.role === 'ai' && !msg.typing && msg.content && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="msg-act" onClick={() => sendMessage('Quais os requisitos técnicos desta norma?')}>📋 Requisitos</button>
                          <button className="msg-act" onClick={() => sendMessage('Quais as definições desta norma?')}>📖 Definições</button>
                          <button className="msg-act" onClick={() => navigator.clipboard?.writeText(msg.content)}>⎘ Copiar</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #2a2a32', flexShrink: 0 }}>
                <div className="input-row">
                  <textarea className="chat-input" placeholder="Consulte uma norma técnica..." value={input}
                    onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={1} disabled={streaming} />
                  <button className="send-btn" onClick={() => sendMessage(input)} disabled={!input.trim() || streaming}>↑</button>
                </div>
              </div>
            </>
          )}

          {/* NORMAS */}
          {view === 'procs' && (
            <div style={{ padding: 16, overflowY: 'auto' }}>
              {PROCEDURES.map(p => (
                <div key={p.id} className="proc-card" onClick={() => { sendMessage(`O que é a ${p.code}?`); setView('chat') }}>
                  <div style={{ fontSize: 10, color: '#4a4a5a', fontFamily: "'IBM Plex Mono',monospace" }}>{p.code} · Rev.{p.rev} · {p.pages} págs.</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e8e8f0', margin: '4px 0 8px', lineHeight: 1.4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#8888a0', marginBottom: 8, lineHeight: 1.5 }}>{p.objective}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                    <span className="tag tag-d">{p.category}</span>
                    <span className="tag tag-s">Aprovado</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4a4a5a' }}>{p.approvalDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TREINAMENTO — admin only */}
          {view === 'treino' && isAdmin && (
            <div style={{ padding: 16, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e8e8f0' }}>Base de Q&A treinada</div>
                  <div style={{ fontSize: 11, color: '#8888a0', marginTop: 2 }}>{qaBase.length} pares pergunta/resposta · Prioridade máxima nas respostas</div>
                </div>
                <button className="save-btn" onClick={() => setAdicionandoQA(true)}>+ Adicionar Q&A</button>
              </div>

              {/* Formulário de novo Q&A */}
              {adicionandoQA && (
                <div className="qa-card" style={{ border: '1px solid #3d3580', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#a99df7', marginBottom: 12 }}>Novo par de treinamento</div>
                  <div className="qa-field">
                    <label>Pergunta do usuário *</label>
                    <input placeholder="Ex: É possível ter duas entradas de energia?" value={novoQA.pergunta} onChange={e => setNovoQA(p => ({ ...p, pergunta: e.target.value }))} />
                  </div>
                  <div className="qa-field">
                    <label>Palavras-chave (separadas por vírgula) *</label>
                    <input placeholder="Ex: duas entradas, duas medições, múltiplas entradas" value={novoQA.palavrasChave} onChange={e => setNovoQA(p => ({ ...p, palavrasChave: e.target.value }))} />
                  </div>
                  <div className="qa-field">
                    <label>Resposta correta (markdown) *</label>
                    <textarea placeholder="## Título&#10;&#10;Resposta completa com **destaques**..." value={novoQA.resposta} onChange={e => setNovoQA(p => ({ ...p, resposta: e.target.value }))} style={{ minHeight: 120 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="qa-field">
                      <label>Artigo de referência</label>
                      <input placeholder="Ex: DIS-NOR-030 §6.1.1.1" value={novoQA.artigo} onChange={e => setNovoQA(p => ({ ...p, artigo: e.target.value }))} />
                    </div>
                    <div className="qa-field">
                      <label>Norma</label>
                      <input placeholder="DIS-NOR-030" value={novoQA.norma} onChange={e => setNovoQA(p => ({ ...p, norma: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="cancel-btn" onClick={() => setAdicionandoQA(false)}>Cancelar</button>
                    <button className="save-btn" onClick={salvarQA} disabled={!novoQA.pergunta || !novoQA.resposta || !novoQA.palavrasChave}>Salvar Q&A</button>
                  </div>
                </div>
              )}

              {/* Lista de Q&As */}
              {qaBase.map(qa => (
                <div key={qa.id} className="qa-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8f0', flex: 1 }}>❓ {qa.pergunta}</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                      <span className="tag tag-p">{qa.norma}</span>
                      <button onClick={() => setQaBase(prev => prev.filter(q => q.id !== qa.id))}
                        style={{ padding: '2px 8px', background: 'transparent', border: '1px solid #3a0000', borderRadius: 4, color: '#f87171', fontSize: 10, cursor: 'pointer', fontFamily: "'Sora',sans-serif" }}>
                        Remover
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#8888a0', marginBottom: 6 }}>
                    <span style={{ color: '#4a4a5a' }}>Palavras-chave: </span>
                    {qa.palavrasChave.map((kw, i) => (
                      <span key={i} style={{ background: '#1a1730', border: '1px solid #3d3580', borderRadius: 3, padding: '1px 5px', fontSize: 10, color: '#a99df7', marginRight: 4, fontFamily: "'IBM Plex Mono',monospace" }}>{kw}</span>
                    ))}
                  </div>
                  {qa.artigo && <div style={{ fontSize: 11, color: '#4a4a5a' }}>📌 {qa.artigo}</div>}
                  {qa.figuras.length > 0 && <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 4 }}>📐 Figuras: {qa.figuras.join(', ')}</div>}
                </div>
              ))}
            </div>
          )}

          {/* DOCUMENTOS — admin only */}
          {view === 'docs' && isAdmin && (
            <div style={{ padding: 16, overflowY: 'auto' }}>
              <div className="upload-area" onClick={() => alert('Em produção: conecte ao backend para upload real de PDFs.')}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 13, color: '#8888a0' }}>Clique para adicionar nova norma</div>
                <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 4 }}>PDF · Máx. 50 MB</div>
              </div>
              {docs.map(doc => (
                <div key={doc.id} className="doc-card">
                  <div style={{ fontSize: 10, color: '#4a4a5a', fontFamily: "'IBM Plex Mono',monospace" }}>{doc.code}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8f0', margin: '4px 0 8px' }}>{doc.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="tag tag-s">Indexado</span>
                    <span style={{ fontSize: 11, color: '#4a4a5a' }}>{doc.size}</span>
                    <span style={{ fontSize: 11, color: '#4a4a5a', marginLeft: 'auto' }}>Por {doc.uploadedBy} · {doc.uploadedAt}</span>
                    <button onClick={() => setDocs(d => d.filter(x => x.id !== doc.id))}
                      style={{ padding: '2px 8px', background: 'transparent', border: '1px solid #3a0000', borderRadius: 4, color: '#f87171', fontSize: 10, cursor: 'pointer', fontFamily: "'Sora',sans-serif" }}>
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DASHBOARD — admin only */}
          {view === 'dash' && isAdmin && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 16, overflowY: 'auto', alignContent: 'start' }}>
              {[
                { label: 'Normas indexadas', value: '2', sub: 'DIS-NOR-030 · DIS-NOR-053' },
                { label: 'Q&As treinados', value: String(qaBase.length), sub: 'Prioridade nas respostas' },
                { label: 'Figuras mapeadas', value: String(Object.keys(FIGURAS).length), sub: 'Exibição automática' },
                { label: 'Consultas hoje', value: '38', sub: '↑ ativo' },
              ].map((m, i) => (
                <div key={i} className="dc">
                  <div className="dl">{m.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 500, fontFamily: "'IBM Plex Mono',monospace", color: '#e8e8f0' }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: '#8888a0', marginTop: 2 }}>{m.sub}</div>
                </div>
              ))}
              <div className="dc" style={{ gridColumn: '1/-1' }}>
                <div className="dl">Q&As ativos</div>
                <div style={{ marginTop: 8 }}>
                  {qaBase.slice(0, 5).map(qa => (
                    <div key={qa.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #22222a' }}>
                      <span className="tag tag-p" style={{ flexShrink: 0 }}>{qa.norma}</span>
                      <span style={{ fontSize: 12, color: '#8888a0', flex: 1, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{qa.pergunta}</span>
                      <span style={{ fontSize: 10, color: '#4a4a5a', fontFamily: "'IBM Plex Mono',monospace", flexShrink: 0 }}>{qa.palavrasChave.length} kw</span>
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

// ── LOGIN ─────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [name, setName] = useState('')
  const [matricula, setMatricula] = useState('')
  const [tipo, setTipo] = useState<'proprio' | 'terceirizado'>('proprio')
  const [isAdmin, setIsAdmin] = useState(false)
  const [senha, setSenha] = useState('')
  const [err, setErr] = useState('')

  const handle = () => {
    setErr('')
    if (!name.trim()) return setErr('Informe seu nome completo.')
    if (!matricula.trim()) return setErr('Informe sua matrícula.')
    if (isAdmin && senha !== 'admin123') return setErr('Senha de administrador incorreta.')
    onLogin({ name: name.trim(), matricula: matricula.trim(), tipo, role: isAdmin ? 'admin' : 'usuario' })
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#18181c', border: '1px solid #2a2a32', borderRadius: 16, padding: 32, width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 40, height: 40, background: '#7c6af7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontFamily: "'IBM Plex Mono',monospace", fontWeight: 500 }}>∅</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#e8e8f0' }}>Oráculo Normativo</div>
              <div style={{ fontSize: 11, color: '#8888a0' }}>Grupo Neoenergia · Normas Técnicas</div>
            </div>
          </div>
          <div className="field"><label>Nome completo *</label><input placeholder="Ex: João da Silva" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="field"><label>Matrícula *</label><input placeholder="Ex: 001234" value={matricula} onChange={e => setMatricula(e.target.value)} /></div>
          <div className="field">
            <label>Vínculo *</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as 'proprio' | 'terceirizado')}>
              <option value="proprio">Próprio (colaborador Neoenergia)</option>
              <option value="terceirizado">Terceirizado</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderTop: '1px solid #22222a', marginBottom: 12 }}>
            <input type="checkbox" id="adm" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} style={{ width: 14, height: 14, accentColor: '#7c6af7', cursor: 'pointer' }} />
            <label htmlFor="adm" style={{ fontSize: 12, color: '#8888a0', cursor: 'pointer' }}>Acessar como administrador</label>
          </div>
          {isAdmin && (
            <div className="field"><label>Senha de administrador *</label><input type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} /></div>
          )}
          {err && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>⚠ {err}</div>}
          <button className="login-btn" onClick={handle} disabled={!name || !matricula}>Entrar no Oráculo</button>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: '#4a4a5a' }}>Acesso restrito · Neoenergia Cosern · v2.0</div>
        </div>
      </div>
    </>
  )
}

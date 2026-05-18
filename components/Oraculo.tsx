'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { FIGURAS, QA_BASE, QA } from '../lib/knowledge'

// ── TIPOS ─────────────────────────────────────────────
interface User { name: string; matricula: string; tipo: 'proprio' | 'terceirizado'; role: 'usuario' | 'admin' }
interface Message { id: number; role: 'user' | 'ai'; content: string; time: string; typing?: boolean; figuras?: string[]; imagens?: string[]; semResposta?: boolean }
interface UnansweredQ { id: string; pergunta: string; user: string; matricula: string; tipo: string; timestamp: string; date: string }
interface DailyAccess { day: string; total: number; answered: number }

const T = {
  bg: '#0d0d0f', sidebar: '#111114', surface: '#18181c', surfaceHover: '#1e1e23',
  border: '#2a2a32', borderLight: '#22222a', text: '#e8e8f0', textMuted: '#8888a0',
  textFaint: '#4a4a5a', accent: '#7c6af7', accentLight: '#a99df7', accentBg: '#1a1730',
  accentBorder: '#3d3580', successBg: '#0f2a1a', warningBg: '#2a1f0a',
  userBubble: '#1a1730', aiBubble: '#111114', inputBg: '#18181c',
}

// ── DADOS DE DEMONSTRAÇÃO PARA GRÁFICOS ──────────────
const DEMO_DAILY: DailyAccess[] = [
  { day: '11/05', total: 12, answered: 10 },
  { day: '12/05', total: 18, answered: 15 },
  { day: '13/05', total: 9,  answered: 7  },
  { day: '14/05', total: 24, answered: 21 },
  { day: '15/05', total: 31, answered: 27 },
  { day: '16/05', total: 19, answered: 17 },
  { day: '17/05', total: 38, answered: 34 },
]
const DEMO_MONTHLY = [
  { mes: 'Jan', total: 120 }, { mes: 'Fev', total: 98 }, { mes: 'Mar', total: 145 },
  { mes: 'Abr', total: 187 }, { mes: 'Mai', total: 151 },
]

// ── PROCEDIMENTOS ─────────────────────────────────────
const PROCEDURES = [
  {
    id: '1', code: 'DIS-NOR-030', rev: '07', pages: 142,
    name: 'Fornecimento de Energia Elétrica em Tensão Secundária de Distribuição a Edificações Individuais',
    category: 'Distribuição', department: 'Engenharia',
    approver: 'Ricardo Prado Pina', approvalDate: '17/04/2026',
    objective: 'Estabelecer as condições para o fornecimento de energia elétrica para as unidades consumidoras individuais em tensão secundária de distribuição.',
    scope: 'Aplica-se às instalações consumidoras com carga instalada até 75 kW.',
    source: 'DIS-NOR-030 REV.07 — Aprovado em 17/04/2026',
    sections: [
      { title: '6.1.1.1 Requisitos Gerais', content: 'Aplica-se às instalações novas, alteração de carga e reforma de instalações com as seguintes características:\n\na) Edificação individual formada por uma única unidade consumidora;\nb) Edificações sem área de uso comum, formadas por duas unidades consumidoras do grupo B contíguas, geminadas ou dispostas verticalmente;\nc) Lote rural sem área de uso comum, formadas por unidades consumidoras contíguas ou geminadas;\nd) Entre 3 e 5 unidades consumidoras monofásicas com carga máxima de 5 kW por unidade, com caixas de medição em muro ou mureta de alvenaria e entradas de serviço distintas — conforme Figura 44.' },
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
]

const SAMPLE_CONVS = [
  { id: 'c1', title: 'Duas entradas de energia' },
  { id: 'c2', title: 'Ramal de conexão' },
  { id: 'c3', title: 'Fornecimento provisório' },
  { id: 'c4', title: 'Aterramento da instalação' },
]

// ── FUZZY SEARCH ──────────────────────────────────────
function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '')
}

// Distância de Levenshtein simplificada
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

function fuzzyMatch(query: string, target: string): number {
  const q = normalize(query)
  const t = normalize(target)
  if (t.includes(q)) return 1
  const qWords = q.split(' ').filter(w => w.length > 2)
  const tWords = t.split(' ')
  let score = 0
  for (const qw of qWords) {
    for (const tw of tWords) {
      const dist = levenshtein(qw, tw)
      const maxLen = Math.max(qw.length, tw.length)
      if (maxLen > 0) score += Math.max(0, 1 - dist / maxLen)
    }
  }
  return score / Math.max(qWords.length, 1)
}

function getSuggestions(query: string, qaList: QA[], limit = 3): QA[] {
  if (!query.trim()) return []
  return qaList
    .map(qa => ({ qa, score: fuzzyMatch(query, qa.pergunta + ' ' + qa.palavrasChave.join(' ')) }))
    .filter(x => x.score > 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.qa)
}

// ── MOTOR DE BUSCA ────────────────────────────────────
function searchQA(query: string, qaBase: QA[]): QA | null {
  const q = normalize(query)
  for (const qa of qaBase) {
    if (qa.palavrasChave.some(kw => q.includes(normalize(kw)))) return qa
  }
  return null
}

function searchAllQA(query: string, qaBase: QA[]): QA[] {
  const q = normalize(query)
  return qaBase.filter(qa => qa.palavrasChave.some(kw => q.includes(normalize(kw))))
}

function buildAnswer(query: string, qaBase: QA[]): { text: string; figuras: string[]; imagens: string[]; found: boolean } {
  const qa = searchQA(query, qaBase)
  if (qa) return { text: qa.resposta, figuras: qa.figuras, imagens: qa.imagens || [], found: true }

  const q = normalize(query)
  const proc = PROCEDURES[0]
  const is030 = ['030','individual','75 kw','ramal de conexao','padrao de entrada','provisorio','veiculo eletrico','carga instalada','demanda','drt','responsabilidade tecnica','aterramento','medicao'].some(k => q.includes(k))

  if (!is030) {
    return {
      text: `Não encontrei resposta para essa consulta na base normativa atual.\n\nBase disponível: **DIS-NOR-030 Rev.07** — Edificações Individuais (até 75 kW)\n\nSe sua dúvida não foi respondida, ela foi registrada para treinamento futuro.`,
      figuras: [], imagens: [], found: false
    }
  }

  let best = proc.sections[0]
  const words = q.split(' ').filter(w => w.length > 3)
  for (const s of proc.sections) {
    const hits = words.filter(w => normalize(s.title + ' ' + s.content).includes(w)).length
    const bestHits = words.filter(w => normalize(best.title + ' ' + best.content).includes(w)).length
    if (hits > bestHits) best = s
  }
  const figNums = (best.content + best.title).match(/Figura (\d+[a-z]?)/gi)?.map(f => f.replace(/Figura /i, '').trim()).filter(n => FIGURAS[n]) || []
  const text = `## ${proc.name}\n\n**Código:** ${proc.code} Rev.${proc.rev}  \n**Aprovação:** ${proc.approvalDate}\n\n---\n\n### ${best.title}\n\n${best.content}\n\n---\n\n> 📄 **Fonte:** ${proc.source}`
  return { text, figuras: figNums, imagens: [], found: true }
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

const SUGGESTIONS_DEFAULT = ['É possível ter duas entradas de energia?','Componentes da entrada de serviço','Fornecimento provisório','Afastamentos mínimos','Como funciona o aterramento?','Casas geminadas como ligar?']

// ── CSS ───────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{background:#0d0d0f}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2a32;border-radius:2px}
.root{font-family:'Sora',sans-serif;background:#0d0d0f;color:#e8e8f0;height:100vh;height:100dvh;display:flex;overflow:hidden;position:relative}
.sidebar{width:260px;background:#111114;border-right:1px solid #2a2a32;display:flex;flex-direction:column;flex-shrink:0;transition:width .25s,transform .25s;z-index:40}
.sidebar.closed{width:0;overflow:hidden;border:none}
@media(max-width:700px){
  .sidebar{position:absolute;top:0;left:0;height:100%;transform:translateX(-100%);width:260px!important;overflow:visible!important;border-right:1px solid #2a2a32!important}
  .sidebar.open-mobile{transform:translateX(0)}
  .sidebar-overlay{display:block!important}
}
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:39}
.new-btn{margin:10px 12px;padding:8px 12px;background:#1a1730;border:1px solid #3d3580;border-radius:8px;color:#a99df7;font-size:12px;font-family:'Sora',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s;width:calc(100% - 24px)}
.new-btn:hover{background:#7c6af7;color:#fff;border-color:#7c6af7}
.sb-search{margin:0 12px 8px;display:flex;align-items:center;gap:6px;background:#0d0d0f;border:1px solid #2a2a32;border-radius:7px;padding:6px 10px;transition:border-color .15s}
.sb-search:focus-within{border-color:#3d3580}
.sb-search input{flex:1;background:transparent;border:none;outline:none;color:#e8e8f0;font-family:'Sora',sans-serif;font-size:12px}
.sb-search input::placeholder{color:#4a4a5a}
.conv-item{padding:9px 8px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:8px;margin:1px 0;transition:all .1s;border:1px solid transparent}
.conv-item:hover,.conv-item.active{background:#1e1e23;border-color:#2a2a32}
.conv-item:hover .conv-arrow{opacity:1}
.conv-arrow{opacity:0;transition:opacity .1s;font-size:12px;color:#7c6af7;margin-left:auto;flex-shrink:0}
.topbar{height:48px;border-bottom:1px solid #2a2a32;display:flex;align-items:center;padding:0 16px;gap:10px;flex-shrink:0}
.tb-btn{width:30px;height:30px;border-radius:6px;background:transparent;border:1px solid #2a2a32;color:#8888a0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px}
.tb-btn:hover{background:#18181c;color:#e8e8f0}
.tab{padding:5px 9px;border-radius:6px;border:1px solid #2a2a32;background:transparent;color:#8888a0;font-size:11px;font-family:'Sora',sans-serif;cursor:pointer;transition:all .1s;white-space:nowrap}
.tab.active{background:#1a1730;border-color:#3d3580;color:#a99df7}
.tab:hover:not(.active){background:#18181c;color:#e8e8f0}
.chat-area{flex:1;overflow-y:auto;padding:20px 16px 12px;display:flex;flex-direction:column;gap:18px}
.sugg{padding:10px 12px;background:#18181c;border:1px solid #2a2a32;border-radius:8px;color:#8888a0;font-size:11.5px;font-family:'Sora',sans-serif;cursor:pointer;text-align:left;transition:all .15s;line-height:1.4}
.sugg:hover{background:#1e1e23;color:#e8e8f0;border-color:#3d3580}
.bubble{padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.65}
.bubble.ai{background:#111114;border:1px solid #2a2a32;color:#e8e8f0;border-radius:4px 12px 12px 12px}
.bubble.user{background:#1a1730;border:1px solid #3d3580;color:#e8e8f0;border-radius:12px 4px 12px 12px}
.bubble.no-answer{background:#1a1520;border:1px solid #3a1a2a;border-radius:4px 12px 12px 12px}
.dots{display:flex;gap:3px;align-items:center;padding:4px 0}
.dot{width:5px;height:5px;background:#4a4a5a;border-radius:50%;animation:pulse 1.2s ease-in-out infinite}
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
@keyframes pulse{0%,80%,100%{opacity:.2;transform:scale(.9)}40%{opacity:1;transform:scale(1)}}
.msg-act{padding:3px 8px;background:transparent;border:1px solid #2a2a32;border-radius:4px;color:#4a4a5a;font-size:10px;font-family:'Sora',sans-serif;cursor:pointer;transition:all .1s}
.msg-act:hover{background:#18181c;color:#7c6af7;border-color:#3d3580}
.input-row{display:flex;gap:8px;align-items:flex-end;background:#18181c;border:1px solid #2a2a32;border-radius:10px;padding:8px 8px 8px 14px;transition:border-color .15s}
.input-row:focus-within{border-color:#3d3580}
.chat-input{flex:1;background:transparent;border:none;outline:none;color:#e8e8f0;font-family:'Sora',sans-serif;font-size:13px;resize:none;max-height:100px;line-height:1.5;padding:2px 0}
.chat-input::placeholder{color:#4a4a5a}
.send-btn{width:32px;height:32px;background:#7c6af7;border:none;border-radius:7px;color:#fff;cursor:pointer;font-size:14px;flex-shrink:0}
.send-btn:disabled{opacity:.3;cursor:default}.send-btn:hover:not(:disabled){opacity:.85}
.tag{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:10px;font-family:'IBM Plex Mono',monospace;font-weight:500}
.tag-d{background:#1a1730;color:#a99df7;border:1px solid #3d3580}
.tag-s{background:#0f2a1a;color:#4ade80;border:1px solid #0d3320}
.tag-w{background:#2a1f0a;color:#fbbf24;border:1px solid #3a2800}
.tag-p{background:#1a2030;color:#38bdf8;border:1px solid #0d2540}
.tag-r{background:#1a0f10;color:#f87171;border:1px solid #3a1010}
.dc{background:#18181c;border:1px solid #2a2a32;border-radius:10px;padding:14px}
.dl{font-size:10px;color:#4a4a5a;text-transform:uppercase;letter-spacing:.08em;font-family:'IBM Plex Mono',monospace;margin-bottom:6px}
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
.fig-box{background:#111114;border:1px solid #2a2a32;border-radius:8px;padding:10px;margin-top:10px}
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
.suggest-box{background:#1a1520;border:1px solid #3a1a2a;border-radius:8px;padding:10px 12px;margin-top:8px}
.suggest-item{padding:6px 8px;border-radius:5px;cursor:pointer;font-size:12px;color:#a99df7;transition:background .1s}
.suggest-item:hover{background:#2a1a30}
.welcome-screen{display:flex;flex-direction:column;align-items:center;gap:14px;padding:16px;width:100%;max-width:520px;margin:auto}
@media(max-width:700px){
  .welcome-screen{gap:8px;padding:8px;margin:0 auto}
  .welcome-screen .sugg{font-size:11px;padding:7px 9px}
  .sugg-hide-mobile{display:none!important}
}
.chat-area{flex:1;overflow-y:auto;padding:14px 14px 10px;display:flex;flex-direction:column;gap:16px}
@media(min-width:701px){.chat-area{padding:20px 16px 12px;gap:18px}}
`

// ── SESSÃO ────────────────────────────────────────────
const SESSION_KEY = 'oraculo_last_user'
function saveSession(u: User) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)) } catch {} }
function loadSession(): User | null { try { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null } catch { return null } }
function clearSession() { try { localStorage.removeItem(SESSION_KEY) } catch {} }


// ═══════════════════════════════════════════════════════
export default function Oraculo() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700
  const [user, setUser] = useState<User | null>(null)
  const [savedUser, setSavedUser] = useState<User | null>(null)
  const [showReturning, setShowReturning] = useState(false)
  const [view, setView] = useState<'chat'|'procs'|'dash'|'docs'|'treino'>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [activeConv, setActiveConv] = useState('c1')
  const [qaBase, setQaBase] = useState<QA[]>(QA_BASE)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [novoQA, setNovoQA] = useState({ pergunta:'', palavrasChave:'', resposta:'', artigo:'', norma:'DIS-NOR-030' })
  const [novoQAImagens, setNovoQAImagens] = useState<string[]>([])
  const [adicionandoQA, setAdicionandoQA] = useState(false)
  const [unanswered, setUnanswered] = useState<UnansweredQ[]>([])
  const [dailyData, setDailyData] = useState<DailyAccess[]>(DEMO_DAILY)
  const [totalPerguntas, setTotalPerguntas] = useState(151)
  const [totalAcertos, setTotalAcertos] = useState(134)
  const [docs, setDocs] = useState([
    { id:'d1', name:'DIS-NOR-030-REV07.pdf', code:'DIS-NOR-030', uploadedBy:'Admin', uploadedAt:'17/04/2026', size:'142 pág.' },
  ])
  const imgInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const streamingRef = useRef(false)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  // Carregar treinamentos customizados do banco
  useEffect(() => {
    fetch('/api/qa')
      .then(r => r.json())
      .then((custom: QA[]) => {
        if (custom.length > 0) setQaBase(prev => [...custom, ...prev.filter(q => !custom.find(c => c.id === q.id))])
      })
      .catch(() => {})
  }, [])

  // Verificar sessão ao carregar
  useEffect(() => {
    const saved = loadSession()
    if (saved) { setSavedUser(saved); setShowReturning(true) }
  }, [])

  const handleLogin = (u: User) => { saveSession(u); setUser(u); setShowReturning(false); setSavedUser(u) }
  const handleLogout = () => { clearSession(); setUser(null); setSavedUser(null); setShowReturning(false) }

  // Fechar sidebar mobile ao mudar de view
  useEffect(() => { setMobileSidebar(false) }, [view])

  const nowStr = () => new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
  const todayStr = () => new Date().toLocaleDateString('pt-BR')

  // Busca fuzzy na sidebar
  const filteredQA = useMemo(() => {
    if (!sidebarSearch.trim()) return qaBase.slice(0, 6)
    return getSuggestions(sidebarSearch, qaBase, 8)
  }, [sidebarSearch, qaBase])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streamingRef.current) return
    streamingRef.current = true
    setInput('')
    setMessages(prev => [...prev, { id: Date.now(), role:'user', content:text, time:nowStr() }])
    setStreaming(true)
    const aiId = Date.now() + 1
    setMessages(prev => [...prev, { id:aiId, role:'ai', content:'', time:nowStr(), typing:true, figuras:[], imagens:[] }])
    await new Promise(r => setTimeout(r, 450 + Math.random() * 350))

    // Verificar múltiplos treinamentos com a mesma palavra-chave
    const allMatches = searchAllQA(text, qaBase)
    if (allMatches.length > 1) {
      setMessages(prev => prev.map(m => m.id === aiId ? {
        ...m, typing: false, figuras: [], imagens: [],
        content: `__DISAMBIGUATE__${JSON.stringify(allMatches.map(q => ({ id: q.id, pergunta: q.pergunta })))}`
      } : m))
      streamingRef.current = false
      setStreaming(false)
      return
    }

    const { text: response, figuras, imagens, found } = buildAnswer(text, qaBase)

    // Atualizar estatísticas
    setTotalPerguntas(p => p + 1)
    if (found) setTotalAcertos(a => a + 1)

    // Atualizar gráfico diário
    setDailyData(prev => {
      const today = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
      const last = prev[prev.length - 1]
      if (last && last.day === today) {
        return prev.map((d, i) => i === prev.length - 1 ? { ...d, total: d.total + 1, answered: found ? d.answered + 1 : d.answered } : d)
      }
      return [...prev.slice(-6), { day: today, total: 1, answered: found ? 1 : 0 }]
    })

    // Registrar pergunta sem resposta
    if (!found && user) {
      setUnanswered(prev => [{
        id: `uq-${Date.now()}`,
        pergunta: text,
        user: user.name,
        matricula: user.matricula,
        tipo: user.tipo === 'proprio' ? 'Próprio' : 'Terceirizado',
        timestamp: nowStr(),
        date: todayStr()
      }, ...prev])
    }

    // Buscar sugestões fuzzy se não encontrou resposta
    const suggestions = found ? [] : getSuggestions(text, qaBase, 3)

    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, typing:false, figuras, imagens, semResposta: !found } : m))
    let acc = ''
    for await (const chunk of streamText(response)) {
      acc += (acc ? ' ' : '') + chunk
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: acc } : m))
    }

    // Adicionar sugestões após resposta
    if (suggestions.length > 0) {
      setMessages(prev => [...prev, {
        id: Date.now() + 2, role:'ai',
        content: `__SUGESTOES__${JSON.stringify(suggestions.map(s => s.pergunta))}`,
        time: nowStr(), figuras:[], imagens:[]
      }])
    }
    streamingRef.current = false
    setStreaming(false)
  }, [qaBase, user])

  const sendDirectAnswer = useCallback(async (qa: QA) => {
    if (streamingRef.current) return
    streamingRef.current = true
    setMessages(prev => [...prev, { id: Date.now(), role:'user', content: qa.pergunta, time: nowStr() }])
    setStreaming(true)
    const aiId = Date.now() + 1
    setMessages(prev => [...prev, { id:aiId, role:'ai', content:'', time:nowStr(), typing:true, figuras:[], imagens:[] }])
    await new Promise(r => setTimeout(r, 300))
    setTotalPerguntas(p => p + 1)
    setTotalAcertos(a => a + 1)
    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, typing:false, figuras: qa.figuras, imagens: qa.imagens || [], semResposta: false } : m))
    let acc = ''
    for await (const chunk of streamText(qa.resposta)) {
      acc += (acc ? ' ' : '') + chunk
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: acc } : m))
    }
    streamingRef.current = false
    setStreaming(false)
  }, [])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const salvarQA = async () => {
    if (!novoQA.pergunta || !novoQA.resposta || !novoQA.palavrasChave) return
    const newEntry: QA = {
      id:`qa-${Date.now()}`, pergunta:novoQA.pergunta,
      palavrasChave: novoQA.palavrasChave.split(',').map(s=>s.trim()).filter(Boolean),
      resposta:novoQA.resposta, artigo:novoQA.artigo, norma:novoQA.norma,
      figuras:[], imagens:novoQAImagens
    }
    setQaBase(prev => [newEntry, ...prev])
    fetch('/api/qa', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(newEntry) }).catch(() => {})
    setNovoQA({ pergunta:'', palavrasChave:'', resposta:'', artigo:'', norma:'DIS-NOR-030' })
    setNovoQAImagens([])
    setAdicionandoQA(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files||[]).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setNovoQAImagens(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(file)
    })
    if (imgInputRef.current) imgInputRef.current.value = ''
  }

  const toggleSidebar = () => {
    if (window.innerWidth <= 700) setMobileSidebar(o => !o)
    else setSidebarOpen(o => !o)
  }

  // Tela de retorno (sessão salva)
  if (!user && showReturning && savedUser) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight:'100vh', background:'#0d0d0f', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#18181c', border:'1px solid #2a2a32', borderRadius:16, padding:32, width:'100%', maxWidth:400, textAlign:'center' }}>
            <div style={{ width:56, height:56, background:'#7c6af7', borderRadius:50, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff', fontFamily:"'IBM Plex Mono',monospace", fontWeight:500, margin:'0 auto 20px' }}>
              {savedUser.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div style={{ fontSize:16, fontWeight:500, color:'#e8e8f0', marginBottom:4 }}>Bem-vindo de volta!</div>
            <div style={{ fontSize:13, color:'#8888a0', marginBottom:6 }}>{savedUser.name}</div>
            <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:24 }}>
              <span className="tag tag-d">{savedUser.matricula}</span>
              <span className={`tag ${savedUser.tipo==='proprio'?'tag-s':'tag-w'}`}>{savedUser.tipo==='proprio'?'Próprio':'Terceirizado'}</span>
              {savedUser.role==='admin' && <span className="tag tag-w">ADM</span>}
            </div>
            <button onClick={() => handleLogin(savedUser)} style={{ width:'100%', padding:'11px', background:'#7c6af7', border:'none', borderRadius:8, color:'#fff', fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:500, cursor:'pointer', marginBottom:10 }}>
              Continuar como {savedUser.name.split(' ')[0]}
            </button>
            <button onClick={() => { setShowReturning(false); clearSession() }} style={{ width:'100%', padding:'9px', background:'transparent', border:'1px solid #2a2a32', borderRadius:8, color:'#8888a0', fontFamily:"'Sora',sans-serif", fontSize:12, cursor:'pointer' }}>
              Entrar com outro usuário
            </button>
            <div style={{ marginTop:16, fontSize:10, color:'#4a4a5a' }}>Acesso restrito · Neoenergia Cosern · v3.0</div>
          </div>
        </div>
      </>
    )
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />
  const isAdmin = user.role === 'admin'
  const initials = user.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()
  const acertoPct = totalPerguntas > 0 ? Math.round(totalAcertos / totalPerguntas * 100) : 0
  const maxDaily = Math.max(...dailyData.map(d => d.total), 1)
  const maxMonthly = Math.max(...DEMO_MONTHLY.map(d => d.total), 1)

  return (
    <>
      <style>{CSS}</style>
      <div className="root">

        {/* Overlay mobile */}
        {mobileSidebar && (
          <div className="sidebar-overlay" onClick={() => setMobileSidebar(false)} />
        )}

        {/* SIDEBAR */}
        <div className={`sidebar${sidebarOpen ? '' : ' closed'}${mobileSidebar ? ' open-mobile' : ''}`}>
          <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid #22222a', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div className="logo-icon">∅</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'#e8e8f0' }}>Oráculo</div>
                <div style={{ fontSize:10, color:'#8888a0', fontFamily:"'IBM Plex Mono',monospace" }}>NORMAS TÉCNICAS</div>
              </div>
              <button onClick={toggleSidebar} style={{ background:'transparent', border:'none', color:'#4a4a5a', cursor:'pointer', fontSize:16, padding:'2px 4px' }}>✕</button>
            </div>
          </div>

          <button className="new-btn" onClick={() => { setMessages([]); setView('chat') }}>
            <span style={{ fontSize:16 }}>+</span> Nova consulta
          </button>

          {/* BUSCA NA SIDEBAR */}
          <div className="sb-search">
            <span style={{ fontSize:13, color:'#4a4a5a' }}>🔍</span>
            <input
              placeholder="Buscar perguntas treinadas..."
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
            />
            {sidebarSearch && (
              <button onClick={() => setSidebarSearch('')} style={{ background:'transparent', border:'none', color:'#4a4a5a', cursor:'pointer', fontSize:12, padding:0 }}>✕</button>
            )}
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'4px 8px' }}>
            {sidebarSearch ? (
              <>
                <div style={{ padding:'6px 8px 2px', fontSize:10, color:'#4a4a5a', textTransform:'uppercase' as const, letterSpacing:'0.07em', fontFamily:"'IBM Plex Mono',monospace" }}>
                  {filteredQA.length} resultado(s)
                </div>
                {filteredQA.length === 0 ? (
                  <div style={{ padding:'12px 8px', fontSize:12, color:'#4a4a5a', textAlign:'center' as const }}>Nenhuma pergunta encontrada</div>
                ) : filteredQA.map(qa => (
                  <div key={qa.id} className="conv-item" onClick={() => { sendMessage(qa.pergunta); setMobileSidebar(false) }}>
                    <span style={{ fontSize:11, color:'#7c6af7', flexShrink:0 }}>❓</span>
                    <span style={{ fontSize:11, color:'#8888a0', whiteSpace:'nowrap' as const, overflow:'hidden', textOverflow:'ellipsis', flex:1 }}>{qa.pergunta}</span>
                    <span className="conv-arrow">›</span>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div style={{ padding:'8px 8px 2px', fontSize:10, color:'#4a4a5a', textTransform:'uppercase' as const, letterSpacing:'0.07em', fontFamily:"'IBM Plex Mono',monospace" }}>Recentes</div>
                {SAMPLE_CONVS.map(c => (
                  <div key={c.id} className={`conv-item${activeConv===c.id?' active':''}`} onClick={() => { setActiveConv(c.id); setView('chat'); setMobileSidebar(false) }}>
                    <span style={{ fontSize:11, color:'#4a4a5a' }}>💬</span>
                    <span style={{ fontSize:12, color:'#8888a0', whiteSpace:'nowrap' as const, overflow:'hidden', textOverflow:'ellipsis', flex:1 }}>{c.title}</span>
                    <span className="conv-arrow">›</span>
                  </div>
                ))}
                <div style={{ padding:'10px 8px 2px', fontSize:10, color:'#4a4a5a', textTransform:'uppercase' as const, letterSpacing:'0.07em', fontFamily:"'IBM Plex Mono',monospace" }}>Treinamentos ({qaBase.length})</div>
                {qaBase.slice(0,4).map(qa => (
                  <div key={qa.id} className="conv-item" onClick={() => { sendMessage(qa.pergunta); setMobileSidebar(false) }}>
                    <span style={{ fontSize:11, color:'#7c6af7', flexShrink:0 }}>❓</span>
                    <span style={{ fontSize:11, color:'#8888a0', whiteSpace:'nowrap' as const, overflow:'hidden', textOverflow:'ellipsis', flex:1 }}>{qa.pergunta}</span>
                    <span className="conv-arrow">›</span>
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={{ padding:12, borderTop:'1px solid #22222a', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px' }}>
              <div className="avatar">{initials}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#e8e8f0', whiteSpace:'nowrap' as const, overflow:'hidden', textOverflow:'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize:10, color:'#8888a0' }}>{user.matricula} · {user.tipo==='proprio'?'Próprio':'Terceirizado'}</div>
              </div>
              {isAdmin && <span className="tag tag-w" style={{ fontSize:9 }}>ADM</span>}
            </div>
            <button onClick={handleLogout} style={{ width:'100%', marginTop:8, padding:5, background:'transparent', border:'1px solid #2a2a32', borderRadius:6, color:'#4a4a5a', fontSize:11, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>Sair</button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <div className="topbar">
            <button className="tb-btn" onClick={toggleSidebar}>☰</button>
            <span style={{ flex:1, fontSize:13, fontWeight:500, color:'#e8e8f0', whiteSpace:'nowrap' as const, overflow:'hidden', textOverflow:'ellipsis' }}>
              {view==='chat'?'Consulta normativa':view==='dash'?'Dashboard':view==='docs'?'Documentos':view==='treino'?'Treinamento da IA':'Base normativa'}
            </span>
            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
              {[['chat','Chat'],['procs','Normas'],...(isAdmin?[['docs','Docs'],['treino','Treino'],['dash','Dashboard']]:[])].map(([v,label])=>(
                <button key={v} className={`tab${view===v?' active':''}`} onClick={()=>setView(v as typeof view)}>{label}</button>
              ))}
            </div>
          </div>

          {/* ── CHAT ── */}
          {view==='chat' && (
            <>
              <div className="chat-area" style={{ justifyContent: 'flex-start' }}>
                {messages.length===0 ? (
                  <div className="welcome-screen">
                    <div style={{ width:48, height:48, background:'#1a1730', border:'1px solid #3d3580', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#7c6af7' }}>∅</div>
                    <div style={{ fontSize:18, fontWeight:500 }}>Oráculo Normativo</div>
                    <div style={{ fontSize:12, color:'#8888a0', maxWidth:340, lineHeight:1.5, textAlign:'center' }}>
                      Oráculo é seu guia nas normas técnicas.<br/>Como posso te ajudar?
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, width:'100%' }}>
                      {SUGGESTIONS_DEFAULT.map((s,i)=>(
                        <button key={i} className={`sugg${i >= 4 ? ' sugg-hide-mobile' : ''}`} onClick={()=>sendMessage(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                ) : messages.map(msg => {
                  // Múltiplos treinamentos com mesma palavra-chave
                  if (msg.content.startsWith('__DISAMBIGUATE__')) {
                    const options: {id: string, pergunta: string}[] = JSON.parse(msg.content.replace('__DISAMBIGUATE__',''))
                    return (
                      <div key={msg.id} style={{ background:'#1a1730', border:'1px solid #3d3580', borderRadius:10, padding:'12px 14px', maxWidth:'85%' }}>
                        <div style={{ fontSize:12, color:'#a99df7', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                          <span>🔍</span> Encontrei <strong>{options.length}</strong> respostas relacionadas. Qual você quer saber?
                        </div>
                        {options.map((opt,i) => (
                          <div key={opt.id} onClick={() => { const qa = qaBase.find(q => q.id === opt.id); if (qa) sendDirectAnswer(qa) }}
                            style={{ padding:'8px 10px', marginBottom:4, borderRadius:6, background:'#18181c', border:'1px solid #2a2a32', cursor:'pointer', fontSize:12, color:'#e8e8f0', display:'flex', alignItems:'center', gap:8, transition:'all .15s' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor='#7c6af7')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor='#2a2a32')}>
                            <span style={{ color:'#7c6af7', fontWeight:500 }}>{i+1}.</span> {opt.pergunta}
                          </div>
                        ))}
                      </div>
                    )
                  }

                  // Mensagem de sugestões fuzzy
                  if (msg.content.startsWith('__SUGESTOES__')) {
                    const suggs: string[] = JSON.parse(msg.content.replace('__SUGESTOES__',''))
                    return (
                      <div key={msg.id} className="suggest-box">
                        <div style={{ fontSize:11, color:'#8888a0', marginBottom:6 }}>💡 Você quis dizer?</div>
                        {suggs.map((s,i) => (
                          <div key={i} className="suggest-item" onClick={() => sendMessage(s)}>→ {s}</div>
                        ))}
                      </div>
                    )
                  }
                  return (
                    <div key={msg.id} style={{ display:'flex', gap:10, flexDirection:msg.role==='user'?'row-reverse':'row' }}>
                      <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, background:msg.role==='ai'?'#1a1730':'#18181c', border:`1px solid ${msg.role==='ai'?'#3d3580':'#2a2a32'}`, color:msg.role==='ai'?'#7c6af7':'#8888a0', fontFamily:msg.role==='ai'?"'IBM Plex Mono',monospace":'inherit' }}>
                        {msg.role==='ai'?'∅':initials}
                      </div>
                      <div style={{ maxWidth:'82%', display:'flex', flexDirection:'column', gap:4 }}>
                        <div className={`bubble ${msg.role}${msg.semResposta?' no-answer':''}`}>
                          {msg.typing
                            ? <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                            : msg.role==='ai'
                              ? <div dangerouslySetInnerHTML={{ __html:renderMd(msg.content) }} />
                              : msg.content}
                        </div>
                        {msg.semResposta && (
                          <div style={{ fontSize:10, color:'#f87171', padding:'0 4px', display:'flex', alignItems:'center', gap:4 }}>
                            <span>⚠</span> Pergunta registrada para treinamento futuro
                          </div>
                        )}
                        {/* Figuras PDF */}
                        {msg.role==='ai' && !msg.typing && msg.figuras && msg.figuras.map(figNum => FIGURAS[figNum] && (
                          <div key={figNum} className="fig-box">
                            <div className="fig-title">📐 {FIGURAS[figNum].titulo} — p.{FIGURAS[figNum].pagina}</div>
                            <img src={FIGURAS[figNum].src} alt={FIGURAS[figNum].titulo} className="fig-img" />
                          </div>
                        ))}
                        {/* Imagens customizadas */}
                        {msg.role==='ai' && !msg.typing && msg.imagens && msg.imagens.map((src,i) => (
                          <div key={i} className="fig-box">
                            <div className="fig-title">🖼 Imagem de referência{(msg.imagens?.length||0)>1?` ${i+1}/${msg.imagens?.length}`:''}</div>
                            <img src={src} alt={`ref-${i}`} className="fig-img" />
                          </div>
                        ))}
                        <div style={{ fontSize:10, color:'#4a4a5a', fontFamily:"'IBM Plex Mono',monospace", padding:'0 4px', textAlign:msg.role==='user'?'right':'left' }}>{msg.time}</div>
                        {msg.role==='ai' && !msg.typing && msg.content && !msg.content.startsWith('__') && (
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="msg-act" onClick={() => sendMessage('Quais os requisitos desta norma?')}>📋 Requisitos</button>
                            <button className="msg-act" onClick={() => navigator.clipboard?.writeText(msg.content)}>⎘ Copiar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
              <div style={{ padding:'10px 16px 14px', borderTop:'1px solid #2a2a32', flexShrink:0 }}>
                <div className="input-row">
                  <textarea className="chat-input" placeholder="Consulte a DIS-NOR-030..." value={input}
                    onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} rows={1} disabled={streaming} />
                  <button className="send-btn" onClick={()=>sendMessage(input)} disabled={!input.trim()||streaming}>↑</button>
                </div>
              </div>
            </>
          )}

          {/* ── NORMAS ── */}
          {view==='procs' && (
            <div style={{ padding:16, overflowY:'auto' }}>
              {PROCEDURES.map(p => (
                <div key={p.id} className="doc-card">
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <div style={{ width:36, height:36, background:'#1a1730', border:'1px solid #3d3580', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>📋</div>
                    <div>
                      <div style={{ fontSize:10, color:'#4a4a5a', fontFamily:"'IBM Plex Mono',monospace" }}>{p.code} · Rev.{p.rev}</div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#e8e8f0', lineHeight:1.3 }}>{p.name}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#8888a0', lineHeight:1.6, marginBottom:10, padding:'10px 12px', background:'#0d0d0f', borderRadius:8, border:'1px solid #22222a' }}>
                    <strong style={{ color:'#e8e8f0', display:'block', marginBottom:4, fontSize:11 }}>Objetivo</strong>
                    {p.objective}
                    <br/><br/>
                    <strong style={{ color:'#e8e8f0', display:'block', marginBottom:4, fontSize:11 }}>Campo de aplicação</strong>
                    {p.scope}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const, alignItems:'center', marginBottom:12 }}>
                    <span className="tag tag-d">{p.category}</span>
                    <span className="tag tag-s">Aprovado</span>
                    <span style={{ fontSize:11, color:'#4a4a5a' }}>Aprovador: {p.approver}</span>
                    <span style={{ marginLeft:'auto', fontSize:11, color:'#4a4a5a' }}>{p.approvalDate}</span>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => { sendMessage(`Me explique a norma ${p.code}`); setView('chat') }}
                      style={{ flex:1, padding:'8px', background:'#1a1730', border:'1px solid #3d3580', borderRadius:7, color:'#a99df7', fontSize:12, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
                      💬 Consultar via chat
                    </button>
                    <button onClick={() => alert(`Download da ${p.code} Rev.${p.rev}\n\nEm produção, este botão abrirá o PDF para download direto.`)}
                      style={{ flex:1, padding:'8px', background:'#7c6af7', border:'none', borderRadius:7, color:'#fff', fontSize:12, cursor:'pointer', fontFamily:"'Sora',sans-serif", fontWeight:500 }}>
                      ⬇ Baixar PDF ({p.pages} págs.)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TREINAMENTO (admin) ── */}
          {view==='treino' && isAdmin && (
            <div style={{ padding:16, overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:500, color:'#e8e8f0' }}>Base de Q&A treinada</div>
                  <div style={{ fontSize:11, color:'#8888a0', marginTop:2 }}>{qaBase.length} pares · Prioridade máxima</div>
                </div>
                <button className="save-btn" onClick={() => setAdicionandoQA(true)}>+ Adicionar Q&A</button>
              </div>
              {adicionandoQA && (
                <div className="qa-card" style={{ border:'1px solid #3d3580', marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#a99df7', marginBottom:12 }}>Novo par de treinamento</div>
                  <div className="qa-field"><label>Pergunta *</label><input placeholder="Ex: É possível ter duas entradas?" value={novoQA.pergunta} onChange={e=>setNovoQA(p=>({...p,pergunta:e.target.value}))} /></div>
                  <div className="qa-field"><label>Palavras-chave (vírgula) *</label><input placeholder="Ex: duas entradas, múltiplas entradas" value={novoQA.palavrasChave} onChange={e=>setNovoQA(p=>({...p,palavrasChave:e.target.value}))} /></div>
                  <div className="qa-field"><label>Resposta (markdown) *</label><textarea placeholder="## Título&#10;Resposta..." value={novoQA.resposta} onChange={e=>setNovoQA(p=>({...p,resposta:e.target.value}))} style={{ minHeight:120 }} /></div>
                  <div className="qa-field">
                    <label>Imagens de referência (tabelas, quadros)</label>
                    <div style={{ border:'1px dashed #3d3580', borderRadius:8, padding:14, cursor:'pointer' }}
                      onClick={() => imgInputRef.current?.click()}
                      onDragOver={e=>e.preventDefault()}
                      onDrop={e=>{ e.preventDefault(); Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/')).forEach(f=>{ const r=new FileReader(); r.onload=ev=>setNovoQAImagens(p=>[...p,ev.target?.result as string]); r.readAsDataURL(f) }) }}>
                      {novoQAImagens.length===0 ? (
                        <div style={{ textAlign:'center' as const }}>
                          <div style={{ fontSize:20, marginBottom:4 }}>🖼</div>
                          <div style={{ fontSize:12, color:'#8888a0' }}>Clique ou arraste imagens aqui</div>
                          <div style={{ fontSize:10, color:'#4a4a5a', marginTop:2 }}>PNG, JPG · múltiplas permitidas</div>
                        </div>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column' as const, gap:8 }}>
                          {novoQAImagens.map((src,i)=>(
                            <div key={i} style={{ position:'relative' as const }}>
                              <img src={src} alt="" style={{ width:'100%', borderRadius:6, border:'1px solid #2a2a32' }} />
                              <button onClick={ev=>{ ev.stopPropagation(); setNovoQAImagens(p=>p.filter((_,idx)=>idx!==i)) }} style={{ position:'absolute' as const, top:6, right:6, width:22, height:22, borderRadius:'50%', background:'#0d0d0f', border:'1px solid #3a0000', color:'#f87171', fontSize:11, cursor:'pointer' }}>✕</button>
                            </div>
                          ))}
                          <div style={{ textAlign:'center' as const, fontSize:11, color:'#a99df7' }}>+ Adicionar mais</div>
                        </div>
                      )}
                    </div>
                    <input ref={imgInputRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleImageUpload} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div className="qa-field"><label>Artigo</label><input placeholder="DIS-NOR-030 §6.1.1.1" value={novoQA.artigo} onChange={e=>setNovoQA(p=>({...p,artigo:e.target.value}))} /></div>
                    <div className="qa-field"><label>Norma</label><input value={novoQA.norma} onChange={e=>setNovoQA(p=>({...p,norma:e.target.value}))} /></div>
                  </div>
                  <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                    <button className="cancel-btn" onClick={()=>setAdicionandoQA(false)}>Cancelar</button>
                    <button className="save-btn" onClick={salvarQA} disabled={!novoQA.pergunta||!novoQA.resposta||!novoQA.palavrasChave}>Salvar Q&A</button>
                  </div>
                </div>
              )}
              {qaBase.map(qa=>(
                <div key={qa.id} className="qa-card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#e8e8f0', flex:1 }}>❓ {qa.pergunta}</div>
                    <div style={{ display:'flex', gap:6, flexShrink:0, marginLeft:12 }}>
                      <span className="tag tag-p">{qa.norma}</span>
                      <button onClick={()=>{ setQaBase(prev=>prev.filter(q=>q.id!==qa.id)); fetch(`/api/qa/${qa.id}`,{method:'DELETE'}).catch(()=>{}) }} style={{ padding:'2px 8px', background:'transparent', border:'1px solid #3a0000', borderRadius:4, color:'#f87171', fontSize:10, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>Remover</button>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'#8888a0', marginBottom:6 }}>
                    <span style={{ color:'#4a4a5a' }}>Palavras-chave: </span>
                    {qa.palavrasChave.slice(0,4).map((kw,i)=>(
                      <span key={i} style={{ background:'#1a1730', border:'1px solid #3d3580', borderRadius:3, padding:'1px 5px', fontSize:10, color:'#a99df7', marginRight:4, fontFamily:"'IBM Plex Mono',monospace" }}>{kw}</span>
                    ))}
                    {qa.palavrasChave.length > 4 && <span style={{ fontSize:10, color:'#4a4a5a' }}>+{qa.palavrasChave.length-4}</span>}
                  </div>
                  {qa.artigo && <div style={{ fontSize:11, color:'#4a4a5a' }}>📌 {qa.artigo}</div>}
                  {qa.imagens && qa.imagens.length > 0 && (
                    <div style={{ marginTop:6, display:'flex', gap:4 }}>
                      {qa.imagens.map((src,i)=>(
                        <img key={i} src={src} alt="" style={{ height:40, borderRadius:4, border:'1px solid #2a2a32' }} />
                      ))}
                      <span style={{ fontSize:10, color:'#4a4a5a', alignSelf:'center' }}>🖼 {qa.imagens.length} img</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── DOCUMENTOS (admin) ── */}
          {view==='docs' && isAdmin && (
            <div style={{ padding:16, overflowY:'auto' }}>
              <div className="upload-area" onClick={()=>alert('Em produção: conecte ao backend para upload de PDFs.')}>
                <div style={{ fontSize:28, marginBottom:8 }}>📄</div>
                <div style={{ fontSize:13, color:'#8888a0' }}>Clique para adicionar nova norma</div>
                <div style={{ fontSize:11, color:'#4a4a5a', marginTop:4 }}>PDF · Máx. 50 MB</div>
              </div>
              {docs.map(doc=>(
                <div key={doc.id} className="doc-card">
                  <div style={{ fontSize:10, color:'#4a4a5a', fontFamily:"'IBM Plex Mono',monospace" }}>{doc.code}</div>
                  <div style={{ fontSize:13, fontWeight:500, color:'#e8e8f0', margin:'4px 0 8px' }}>{doc.name}</div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span className="tag tag-s">Indexado</span>
                    <span style={{ fontSize:11, color:'#4a4a5a' }}>{doc.size}</span>
                    <span style={{ fontSize:11, color:'#4a4a5a', marginLeft:'auto' }}>Por {doc.uploadedBy} · {doc.uploadedAt}</span>
                    <button onClick={()=>setDocs(d=>d.filter(x=>x.id!==doc.id))} style={{ padding:'2px 8px', background:'transparent', border:'1px solid #3a0000', borderRadius:4, color:'#f87171', fontSize:10, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>Remover</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── DASHBOARD (admin) ── */}
          {view==='dash' && isAdmin && (
            <div style={{ padding:16, overflowY:'auto', display:'flex', flexDirection:'column', gap:12 }}>

              {/* KPIs */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { label:'Total de perguntas', value:String(totalPerguntas), sub:'Desde o início' },
                  { label:'Acertos', value:`${totalAcertos}`, sub:`${acertoPct}% de precisão` },
                  { label:'Sem resposta', value:String(totalPerguntas-totalAcertos), sub:'Aguardando treinamento', danger:true },
                  { label:'Q&As treinados', value:String(qaBase.length), sub:'Base ativa' },
                ].map((m,i)=>(
                  <div key={i} className="dc">
                    <div className="dl">{m.label}</div>
                    <div style={{ fontSize:26, fontWeight:500, fontFamily:"'IBM Plex Mono',monospace", color:m.danger?'#f87171':'#e8e8f0' }}>{m.value}</div>
                    <div style={{ fontSize:11, color:'#8888a0', marginTop:2 }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Barra de precisão */}
              <div className="dc">
                <div className="dl">Taxa de acerto</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                  <div style={{ flex:1, height:10, background:'#2a2a32', borderRadius:5, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${acertoPct}%`, background: acertoPct>=80?'#22c55e':acertoPct>=60?'#7c6af7':'#f87171', borderRadius:5, transition:'width .6s' }} />
                  </div>
                  <span style={{ fontSize:14, fontWeight:500, fontFamily:"'IBM Plex Mono',monospace", color: acertoPct>=80?'#4ade80':acertoPct>=60?'#a99df7':'#f87171', flexShrink:0 }}>{acertoPct}%</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10, color:'#4a4a5a' }}>
                  <span>✅ {totalAcertos} respondidas</span>
                  <span>❌ {totalPerguntas-totalAcertos} sem resposta</span>
                </div>
              </div>

              {/* Gráfico acessos diários */}
              <div className="dc">
                <div className="dl">Acessos diários (últimos 7 dias)</div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:6, marginTop:12, height:80 }}>
                  {dailyData.map((d,i)=>(
                    <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                      <div style={{ width:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', height:64, gap:1 }}>
                        <div style={{ width:'100%', height:`${Math.round(d.answered/maxDaily*100)}%`, background:'#7c6af7', borderRadius:'3px 3px 0 0', minHeight:2 }} title={`Respondidas: ${d.answered}`} />
                        <div style={{ width:'100%', height:`${Math.round((d.total-d.answered)/maxDaily*100)}%`, background:'#3a1a2a', minHeight: d.total-d.answered>0?2:0 }} title={`Sem resposta: ${d.total-d.answered}`} />
                      </div>
                      <span style={{ fontSize:9, color:'#4a4a5a', fontFamily:"'IBM Plex Mono',monospace" }}>{d.day}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:12, marginTop:8, fontSize:10, color:'#4a4a5a' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, background:'#7c6af7', borderRadius:2, display:'inline-block' }}/> Respondidas</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, background:'#3a1a2a', border:'1px solid #5a2a3a', borderRadius:2, display:'inline-block' }}/> Sem resposta</span>
                </div>
              </div>

              {/* Gráfico mensal */}
              <div className="dc">
                <div className="dl">Acessos mensais</div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginTop:12, height:72 }}>
                  {DEMO_MONTHLY.map((d,i)=>(
                    <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                      <span style={{ fontSize:9, color:'#8888a0', fontFamily:"'IBM Plex Mono',monospace" }}>{d.total}</span>
                      <div style={{ width:'100%', height:`${Math.round(d.total/maxMonthly*52)}px`, background: i===DEMO_MONTHLY.length-1?'#7c6af7':'#3d3580', borderRadius:'3px 3px 0 0', minHeight:4 }} />
                      <span style={{ fontSize:9, color:'#4a4a5a' }}>{d.mes}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Perguntas sem resposta */}
              <div className="dc">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div className="dl" style={{ marginBottom:0 }}>Perguntas sem resposta ({unanswered.length})</div>
                  {unanswered.length>0 && <button onClick={()=>setUnanswered([])} style={{ padding:'2px 8px', background:'transparent', border:'1px solid #2a2a32', borderRadius:4, color:'#4a4a5a', fontSize:10, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>Limpar</button>}
                </div>
                {unanswered.length===0 ? (
                  <div style={{ textAlign:'center' as const, padding:'16px 0', fontSize:12, color:'#4a4a5a' }}>✅ Nenhuma pergunta sem resposta</div>
                ) : unanswered.map(q=>(
                  <div key={q.id} style={{ padding:'8px 0', borderBottom:'1px solid #22222a', display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>❓</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:'#e8e8f0', marginBottom:3 }}>{q.pergunta}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const, alignItems:'center' }}>
                        <span className={`tag ${q.tipo==='Próprio'?'tag-s':'tag-w'}`}>{q.tipo}</span>
                        <span style={{ fontSize:10, color:'#4a4a5a' }}>{q.user} · {q.matricula}</span>
                        <span style={{ fontSize:10, color:'#4a4a5a', marginLeft:'auto' }}>{q.date} {q.timestamp}</span>
                      </div>
                    </div>
                    <button
                      onClick={()=>{ setNovoQA(p=>({...p,pergunta:q.pergunta})); setAdicionandoQA(true); setView('treino') }}
                      style={{ padding:'3px 8px', background:'#1a1730', border:'1px solid #3d3580', borderRadius:4, color:'#a99df7', fontSize:10, cursor:'pointer', fontFamily:"'Sora',sans-serif", flexShrink:0 }}>
                      Treinar
                    </button>
                  </div>
                ))}
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
  const [tipo, setTipo] = useState<'proprio'|'terceirizado'>('proprio')
  const [isAdmin, setIsAdmin] = useState(false)
  const [senha, setSenha] = useState('')
  const [err, setErr] = useState('')

  const handle = () => {
    setErr('')
    if (!name.trim()) return setErr('Informe seu nome completo.')
    if (!matricula.trim()) return setErr('Informe sua matrícula.')
    if (isAdmin && senha !== 'admin123') return setErr('Senha de administrador incorreta.')
    onLogin({ name:name.trim(), matricula:matricula.trim(), tipo, role:isAdmin?'admin':'usuario' })
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:'100vh', background:'#0d0d0f', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <div style={{ background:'#18181c', border:'1px solid #2a2a32', borderRadius:16, padding:32, width:'100%', maxWidth:400 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
            <div style={{ width:40, height:40, background:'#7c6af7', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff', fontFamily:"'IBM Plex Mono',monospace", fontWeight:500 }}>∅</div>
            <div>
              <div style={{ fontSize:16, fontWeight:500, color:'#e8e8f0' }}>Oráculo Normativo</div>
              <div style={{ fontSize:11, color:'#8888a0' }}>Grupo Neoenergia · Normas Técnicas</div>
            </div>
          </div>
          <div className="field"><label>Nome completo *</label><input placeholder="Ex: João da Silva" value={name} onChange={e=>setName(e.target.value)} /></div>
          <div className="field"><label>Matrícula *</label><input placeholder="Ex: 001234" value={matricula} onChange={e=>setMatricula(e.target.value)} /></div>
          <div className="field">
            <label>Vínculo *</label>
            <select value={tipo} onChange={e=>setTipo(e.target.value as 'proprio'|'terceirizado')}>
              <option value="proprio">Próprio (colaborador Neoenergia)</option>
              <option value="terceirizado">Terceirizado</option>
            </select>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0', borderTop:'1px solid #22222a', marginBottom:12 }}>
            <input type="checkbox" id="adm" checked={isAdmin} onChange={e=>setIsAdmin(e.target.checked)} style={{ width:14, height:14, accentColor:'#7c6af7', cursor:'pointer' }} />
            <label htmlFor="adm" style={{ fontSize:12, color:'#8888a0', cursor:'pointer' }}>Acessar como administrador</label>
          </div>
          {isAdmin && (
            <div className="field"><label>Senha de administrador *</label><input type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} /></div>
          )}
          {err && <div style={{ color:'#f87171', fontSize:12, marginBottom:8 }}>⚠ {err}</div>}
          <button className="login-btn" onClick={handle} disabled={!name||!matricula}>Entrar no Oráculo</button>
          <div style={{ textAlign:'center', marginTop:14, fontSize:10, color:'#4a4a5a' }}>Acesso restrito · Neoenergia Cosern · v3.0</div>
        </div>
      </div>
    </>
  )
}

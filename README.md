# Oráculo — Procedimentos Operacionais

ChatGPT corporativo para consulta de procedimentos operacionais internos.

## Deploy em 5 minutos (GitHub + Vercel)

### 1. Crie o repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **"New repository"**
3. Nome: `oraculo-operacional`
4. Deixe **Public** ou Private
5. Clique em **"Create repository"**

### 2. Envie os arquivos para o GitHub

Opção A — Via interface web (mais simples):
1. No repositório criado, clique em **"uploading an existing file"**
2. Arraste todos os arquivos deste projeto
3. Clique em **"Commit changes"**

Opção B — Via terminal:
```bash
git init
git add .
git commit -m "feat: Oráculo Operacional v1.0"
git remote add origin https://github.com/SEU_USUARIO/oraculo-operacional.git
git push -u origin main
```

### 3. Deploy na Vercel (gratuito)

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub
2. Clique em **"Add New Project"**
3. Selecione o repositório `oraculo-operacional`
4. Clique em **"Deploy"**
5. Aguarde ~2 minutos

**Pronto!** Você receberá um link como:
```
https://oraculo-operacional.vercel.app
```

Qualquer novo `git push` atualiza o site automaticamente.

## Estrutura do projeto

```
oraculo/
├── app/
│   ├── layout.tsx      # Layout raiz Next.js
│   └── page.tsx        # Página principal
├── components/
│   └── Oraculo.tsx     # Componente principal (chat + dashboard)
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Tecnologias

- **Next.js 14** — App Router
- **React 18** — UI
- **TypeScript** — tipagem
- **Vercel** — hosting gratuito

## Funcionalidades

- Chat operacional com streaming de respostas
- Base de 4 procedimentos (TI, Compras, RH, Qualidade)
- Sidebar com histórico de conversas
- Aba de procedimentos com detalhes
- Dashboard analítico com KPIs e barras de SLA
- Design dark mode premium

## Próximos passos (backend real)

Para integrar com IA real, adicione em `components/Oraculo.tsx`:

```typescript
// Substitua buildResponse() por:
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ query: text, tenantId: 'sua-empresa' })
})
// Conecte ao backend FastAPI com RAG + Claude API
```

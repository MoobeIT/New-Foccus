# Módulo de Renderização

Este módulo implementa um sistema completo de renderização para gerar previews e PDFs finais dos projetos.

## Funcionalidades

- ✅ Engine de renderização com Puppeteer/Chromium headless
- ✅ Sistema de filas para processamento paralelo
- ✅ **Geração de previews HiDPI em tempo real (300 DPI)**
- ✅ **Sistema de cache inteligente para previews**
- ✅ **Templates HTML/CSS dinâmicos**
- ✅ **Thumbnails otimizados**
- ✅ **PDFs de produção PDF-X4 com marcas de corte**
- ✅ **Validação rigorosa para gráficas**
- ✅ **Job tickets JDF automáticos**
- ✅ Validação e processamento de PDFs
- ✅ Renderização 3D (mock implementado)
- ✅ **SLA garantido: 30s preview, 120s final**
- ✅ Health checks e monitoramento

## Arquitetura

### Componentes Principais

1. **RenderService** - Orquestrador principal
2. **PuppeteerService** - Engine de renderização HTML/CSS
3. **PdfService** - Processamento e validação de PDFs
4. **QueueService** - Gerenciamento de filas Bull/Redis
5. **RenderProcessor** - Worker para processar jobs

### Fluxo de Renderização

```
Preview (Síncrono):
HTML/CSS → Puppeteer → PNG/JPEG → Storage → URL

Final (Assíncrono):
HTML/CSS → Fila → Puppeteer → PDF → Validação → Storage → URL

3D (Assíncrono):
Projeto → Fila → Engine 3D → PNG → Storage → URL
```

## Endpoints

### POST /render/preview
Gera preview em tempo real (síncrono).

**Body:**
```json
{
  "projectId": "uuid",
  "html": "<div class='page'>...</div>",
  "css": ".page { width: 800px; height: 600px; }",
  "options": {
    "width": 800,
    "height": 600,
    "format": "png",
    "dpi": 300
  }
}
```

### POST /render/preview/hidpi
Gera preview HiDPI (300 DPI) com cache automático.

**Body:**
```json
{
  "projectId": "uuid",
  "page": {
    "id": "page-1",
    "width": 210,
    "height": 297,
    "elements": [...]
  },
  "version": 1,
  "options": {
    "dpi": 300,
    "format": "png",
    "useCache": true
  }
}
```

### POST /render/thumbnail
Gera thumbnail otimizado da página.

**Body:**
```json
{
  "projectId": "uuid",
  "page": {
    "id": "page-1",
    "width": 210,
    "height": 297,
    "elements": [...]
  },
  "version": 1,
  "maxSize": 300
}
```

### POST /render/production
Gera PDF final para produção com PDF-X4, CMYK e marcas de corte.

**Body:**
```json
{
  "projectId": "uuid",
  "pages": [
    {
      "id": "page-1",
      "width": 210,
      "height": 297,
      "elements": [...]
    }
  ],
  "productSpecs": {
    "type": "fotolivro",
    "format": "A4",
    "binding": "hardcover"
  },
  "options": {
    "dpi": 300,
    "colorProfile": "CMYK",
    "pdfStandard": "PDF_X4",
    "includeBleed": true,
    "bleedSize": 3,
    "includeCropMarks": true,
    "strictValidation": true
  },
  "async": true
}
```

**Response:**
```json
{
  "jobId": "preview-123",
  "status": "completed",
  "url": "https://storage.com/preview.png",
  "processingTime": 1250,
  "createdAt": "2024-01-01T10:00:00Z",
  "completedAt": "2024-01-01T10:00:01Z"
}
```

### POST /render/final
Gera PDF final para produção (assíncrono).

**Body:**
```json
{
  "projectId": "uuid",
  "html": "<div class='page'>...</div>",
  "css": ".page { width: 210mm; height: 297mm; }",
  "options": {
    "width": 210,
    "height": 297,
    "format": "pdf",
    "includeBleed": true,
    "includeCropMarks": true,
    "colorProfile": "CMYK"
  }
}
```

### POST /render/3d
Gera preview 3D do produto (assíncrono).

**Body:**
```json
{
  "projectId": "uuid",
  "productType": "fotolivro",
  "pages": [
    { "html": "...", "css": "..." }
  ]
}
```

### GET /render/status/:jobId
Consulta status de renderização.

### DELETE /render/cancel/:jobId
Cancela job de renderização.

### GET /render/stats
Estatísticas das filas.

### GET /render/health
Health check dos componentes.

### DELETE /render/cache/:projectId
Invalida cache de previews do projeto.

### DELETE /render/cache/:projectId/:pageId
Invalida cache de previews da página específica.

### GET /render/cache/stats
Estatísticas do cache de previews.

## Configuração

### Variáveis de Ambiente

```env
# Render
USE_MOCK_RENDER=false
RENDER_TIMEOUT=120000
PREVIEW_TIMEOUT=30000
RENDER_CONCURRENCY=2

# Queue (Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Storage
S3_BUCKET_RENDERS=renders
```

### Opções de Renderização

```typescript
interface RenderOptions {
  width: number;          // Largura em pixels
  height: number;         // Altura em pixels
  dpi?: number;          // DPI (padrão: 96)
  format?: 'png' | 'jpeg' | 'pdf';
  quality?: number;       // 1-100 para JPEG
  background?: string;    // Cor de fundo
  timeout?: number;       // Timeout em ms
}

interface PdfRenderOptions extends RenderOptions {
  includeBleed?: boolean;     // Adicionar sangria
  includeCropMarks?: boolean; // Adicionar marcas de corte
  colorProfile?: string;      // Perfil de cor
}
```

## Filas de Processamento

### render-preview
- **Uso:** Previews rápidos
- **Timeout:** 30s
- **Prioridade:** Normal
- **Workers:** 2-4

### render-final
- **Uso:** PDFs finais
- **Timeout:** 120s
- **Prioridade:** Alta
- **Workers:** 1-2

### render-3d
- **Uso:** Previews 3D
- **Timeout:** 60s
- **Prioridade:** Baixa
- **Workers:** 1

## Performance

### SLA Targets
- **Preview:** < 30 segundos
- **PDF Final:** < 120 segundos
- **3D Preview:** < 60 segundos

### Otimizações
- Cache de assets no browser
- Reutilização de instâncias Puppeteer
- Processamento paralelo com workers
- Compressão de imagens
- CDN para assets estáticos

## Monitoramento

### Métricas Importantes
- Tempo de renderização (p50, p95, p99)
- Taxa de sucesso/falha
- Tamanho da fila
- Uso de memória do Puppeteer
- Throughput (renders/minuto)

### Health Checks
- Puppeteer browser status
- Redis connection
- Storage availability
- Worker processes

## Desenvolvimento

### Modo Mock
Para desenvolvimento local sem Puppeteer:

```env
USE_MOCK_RENDER=true
```

### Testes
```bash
npm test render.service.spec.ts
npm test puppeteer.service.spec.ts
```

### Debug
```bash
# Logs detalhados
LOG_LEVEL=debug

# Puppeteer com interface gráfica
PUPPETEER_HEADLESS=false
```

## Estrutura de Arquivos

```
render/
├── controllers/
│   └── render.controller.ts
├── services/
│   ├── render.service.ts
│   ├── puppeteer.service.ts
│   ├── pdf.service.ts
│   └── queue.service.ts
├── processors/
│   └── render.processor.ts
├── tests/
│   └── render.service.spec.ts
└── render.module.ts
```

## Próximos Passos

- [ ] Implementar renderização 3D real com Three.js
- [ ] Integrar Ghostscript para validação PDF
- [ ] Adicionar suporte a fontes customizadas
- [ ] Implementar cache inteligente de renders
- [ ] Otimizar performance para alta concorrência
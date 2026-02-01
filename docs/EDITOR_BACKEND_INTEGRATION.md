# Integração do Editor com Backend

## Resumo das Implementações

### 1. Salvamento de Projetos no Servidor ✅

**Backend:**
- `POST /api/v1/editor/project/:id/save` - Salvar páginas do projeto
- `GET /api/v1/editor/project/:id` - Carregar projeto completo
- `POST /api/v1/editor/project/:id/version` - Criar versão de backup
- `GET /api/v1/editor/project/:id/versions` - Listar versões
- `POST /api/v1/editor/project/:id/restore/:version` - Restaurar versão

**Frontend:**
- Auto-save para backend a cada 60 segundos
- Fallback para localStorage quando offline
- Controle de versão para evitar conflitos
- Indicador visual de status de conexão

### 2. Upload de Fotos para Servidor ✅

**Backend:**
- `POST /api/v1/editor/upload` - Upload de foto individual
- Suporta JPEG, PNG, WebP
- Limite de 50MB por arquivo
- Extração automática de dimensões

**Frontend:**
- Upload automático para servidor quando conectado
- Fallback para base64 quando offline
- Progresso de upload para múltiplos arquivos

### 3. Validação de DPI/Qualidade ✅

**Backend:**
- `POST /api/v1/editor/validate-dpi` - Validar DPI de imagem
- `POST /api/v1/editor/validate-image` - Validação completa com upload

**Frontend:**
- Validação local em tempo real (sem chamada ao servidor)
- Classificação de qualidade: excellent, good, acceptable, low, very_low
- Warnings visuais para imagens de baixa resolução
- Cálculo baseado em: (pixels da imagem / tamanho do elemento em polegadas)

**Níveis de qualidade:**
- ≥300 DPI: Excelente (verde)
- ≥250 DPI: Bom (azul)
- ≥150 DPI: Aceitável (amarelo)
- ≥100 DPI: Baixo (vermelho) - aviso
- <100 DPI: Muito baixo (vermelho pulsante) - não recomendado

### 4. Cálculo Dinâmico da Lombada ✅

**Backend:**
- `POST /api/v1/editor/calculate-spine` - Calcular lombada
- `GET /api/v1/editor/spine-presets` - Presets por tipo de papel/capa

**Fórmula:**
```
lombada = (número_páginas × espessura_papel) + tolerância_encadernação
```

**Frontend:**
- Recálculo automático ao adicionar/remover páginas
- Lombada visual ajustada dinamicamente
- Valores padrão: papel 0.1mm, tolerância 2mm

## Arquivos Criados/Modificados

### Backend
- `src/projects/dto/save-pages.dto.ts` - DTOs para salvar páginas
- `src/projects/services/page-content.service.ts` - Serviço de conteúdo
- `src/projects/controllers/editor.controller.ts` - Controller do editor
- `src/projects/projects.module.ts` - Módulo atualizado

### Frontend
- `src/services/editorApi.ts` - API client para o editor
- `src/composables/useEditorIntegration.ts` - Composable de integração
- `src/composables/useEditorBackend.ts` - Composable alternativo
- `src/components/editor/DpiIndicator.vue` - Indicador de DPI
- `src/views/Editor.vue` - Editor atualizado

## Como Usar

### Carregar projeto do backend
```typescript
// Na URL: /editor?projectId=uuid-do-projeto
// Ou: /editor/uuid-do-projeto

// O editor detecta automaticamente e carrega do backend
```

### Criar novo projeto
```typescript
import { createProject } from '@/services/editorApi';

const project = await createProject({
  name: 'Meu Álbum',
  productId: 'uuid-do-produto',
  formatId: 'uuid-do-formato',
  paperId: 'uuid-do-papel',
  coverTypeId: 'uuid-da-capa',
  pageCount: 20,
});

// Redirecionar para editor
router.push(`/editor?projectId=${project.id}`);
```

### Validar DPI manualmente
```typescript
import { validateDpiLocal } from '@/services/editorApi';

const result = validateDpiLocal(
  imageWidth,    // pixels
  imageHeight,   // pixels
  elementWidthMm,  // mm
  elementHeightMm  // mm
);

console.log(result.dpi);      // 300
console.log(result.quality);  // 'excellent'
console.log(result.message);  // 'Excelente qualidade (300 DPI)'
console.log(result.canPrint); // true
```

### Calcular lombada
```typescript
import { calculateSpineLocal } from '@/services/editorApi';

const result = calculateSpineLocal(
  pageCount,       // número de páginas
  paperThickness,  // mm (default: 0.1)
  bindingTolerance // mm (default: 2)
);

console.log(result.spineWidth); // 4.5
console.log(result.formula);    // '(20 × 0.1mm) + 2mm = 4mm'
```

## Próximos Passos

1. **Geração de PDF no Backend** - Usar biblioteca profissional (PDFKit, Puppeteer)
2. **Compressão de Imagens** - Otimizar antes do upload
3. **Thumbnails Automáticos** - Gerar no backend após upload
4. **Colaboração** - Edição em tempo real com WebSockets
5. **Templates do Servidor** - Carregar layouts do banco de dados

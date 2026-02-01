# 🎨 Editor Profissional de Layouts

## ✅ Novo Editor Implementado!

Um editor profissional completo com dimensões reais, réguas, grade e elementos arrastáveis.

## 🎯 Recursos Principais

### 📏 Dimensões Reais
- Canvas com tamanho exato do formato selecionado
- Medidas em **milímetros (mm)**
- Conversão automática para pixels (96 DPI)
- Visualização em escala real

### 📐 Réguas e Medidas
- **Régua horizontal** (topo)
- **Régua vertical** (lateral)
- Marcações a cada 10mm
- Pode ser ativada/desativada

### 🎯 Grade (Grid)
- Grade visual a cada 5mm
- Facilita alinhamento
- Pode ser ativada/desativada
- **Snap to Grid** para posicionamento preciso

### 🔍 Zoom
- **Zoom In** (+): Aumentar visualização
- **Zoom Out** (-): Diminuir visualização
- **Reset**: Voltar para 100%
- Escala de 50% a 200%

### 🖱️ Elementos Arrastáveis
- **Arrastar**: Clique e arraste o elemento
- **Redimensionar**: Use os handles nos cantos
- **Posicionamento preciso**: Com snap to grid
- **Limites**: Elementos não saem do canvas

### ⚙️ Propriedades Editáveis
- **Posição X, Y** (em mm)
- **Largura e Altura** (em mm)
- **Obrigatório**: Usuário deve preencher
- **Bloqueado**: Usuário não pode mover

## 🚀 Como Usar

### Passo 1: Criar Novo Layout
1. Acesse `http://localhost:3000/admin`
2. Clique em **"🎨 Layouts"**
3. Clique em **"✨ Criar Novo Layout"**

### Passo 2: Configurar Informações
1. **Nome**: Ex: "Capa com Foto Grande"
2. **Formato**: Selecione (ex: Quadrado 20x20cm)
3. **Tipo de Página**: Capa, Página ou Contracapa

### Passo 3: Usar o Editor

#### Adicionar Elementos
- Clique em **"🖼️ Imagem"** para adicionar área de foto
- Clique em **"📝 Texto"** para adicionar área de texto
- Elementos aparecem no canvas

#### Posicionar Elementos
- **Arrastar**: Clique no elemento e arraste
- **Snap**: Elementos se alinham à grade automaticamente
- **Precisão**: Use as réguas como referência

#### Redimensionar Elementos
- **Selecione** o elemento (clique nele)
- **Handles** aparecem nos 4 cantos
- **Arraste** um handle para redimensionar
- **Proporções**: Livre (não mantém proporção)

#### Ajustar Propriedades
- **Selecione** o elemento
- **Painel de propriedades** aparece abaixo
- **Edite** valores numéricos diretamente
- **Checkboxes**: Obrigatório e Bloqueado

#### Remover Elementos
- **Selecione** o elemento
- Clique no **×** vermelho no canto superior direito

### Passo 4: Salvar
- Clique em **"✅ Criar Layout"**
- Layout é salvo com todas as configurações

## 📊 Informações do Canvas

### Dimensões Exibidas
- **Formato**: Nome do formato selecionado
- **Dimensões**: Largura × Altura em cm
- **Tipo**: Capa, Página ou Contracapa
- **Escala**: Zoom atual (%)

### Conversão de Unidades
- **1 cm = 10 mm**
- **1 mm ≈ 3.78 pixels** (96 DPI)
- **Formato 20×20cm = 200×200mm**

## 🎨 Exemplos Práticos

### Exemplo 1: Capa de Fotolivro 20×20cm

**Configuração:**
- Formato: Quadrado 20x20cm (200×200mm)
- Tipo: Capa

**Layout:**
1. Adicionar **Imagem**:
   - X: 10mm, Y: 10mm
   - Largura: 180mm, Altura: 140mm
   - Obrigatório: ✅

2. Adicionar **Texto**:
   - X: 10mm, Y: 160mm
   - Largura: 180mm, Altura: 30mm
   - Obrigatório: ❌

**Resultado**: Foto grande no topo + título embaixo

### Exemplo 2: Página Interna com 2 Fotos

**Configuração:**
- Formato: Quadrado 20x20cm
- Tipo: Página

**Layout:**
1. **Imagem 1**:
   - X: 10mm, Y: 10mm
   - Largura: 90mm, Altura: 180mm

2. **Imagem 2**:
   - X: 105mm, Y: 10mm
   - Largura: 85mm, Altura: 180mm

**Resultado**: 2 fotos lado a lado

### Exemplo 3: Contracapa com Texto

**Configuração:**
- Formato: Quadrado 20x20cm
- Tipo: Contracapa

**Layout:**
1. **Texto**:
   - X: 20mm, Y: 80mm
   - Largura: 160mm, Altura: 40mm
   - Bloqueado: ✅

**Resultado**: Área de texto centralizada e fixa

## 🛠️ Ferramentas do Editor

### Toolbar Superior
```
🖼️ Imagem | 📝 Texto | 🔍+ | 🔍- | ↺ 100% | ☑ Grade | ☑ Réguas | ☑ Snap
```

### Atalhos Visuais
- **Azul**: Elementos de imagem
- **Verde**: Elementos de texto
- **Borda sólida**: Elemento selecionado
- **Handles brancos**: Pontos de redimensionamento
- **× vermelho**: Botão remover

## 💡 Dicas Profissionais

### ✅ Boas Práticas

1. **Use a Grade**
   - Ative "Grade" para ver o grid
   - Ative "Snap" para alinhamento automático
   - Elementos ficam alinhados perfeitamente

2. **Use as Réguas**
   - Ative "Réguas" para ver medidas
   - Marcações a cada 10mm
   - Facilita posicionamento preciso

3. **Margens de Segurança**
   - Deixe 5-10mm de margem nas bordas
   - Evite elementos muito próximos da borda
   - Considere a área de corte

4. **Tamanhos Adequados**
   - Imagens: Mínimo 50×50mm
   - Textos: Mínimo 20mm de altura
   - Considere legibilidade

5. **Elementos Obrigatórios**
   - Marque fotos principais como obrigatórias
   - Deixe elementos decorativos como opcionais

### ⚠️ Evite

- ❌ Elementos muito pequenos (< 10mm)
- ❌ Elementos fora do canvas
- ❌ Sobreposição excessiva
- ❌ Muitos elementos (máx 5-6 por página)

## 🎯 Casos de Uso

### Fotolivro de Casamento
```
Capa:
- 1 foto grande (180×140mm)
- 1 texto título (180×30mm)

Páginas:
- Layout 1 foto (180×180mm)
- Layout 2 fotos (90×180mm cada)
- Layout 3 fotos (60×180mm cada)

Contracapa:
- 1 texto dedicatória (160×40mm)
```

### Calendário 2026
```
Capa:
- 1 foto panorâmica (280×150mm)
- 1 texto ano (280×40mm)

Páginas Mês:
- 1 foto tema (280×180mm)
- 1 área calendário (280×80mm)
```

### Cartão Postal
```
Frente:
- 1 foto panorâmica (140×90mm)

Verso:
- 1 área texto (70×90mm)
- 1 área endereço (70×90mm)
```

## 🔧 Solução de Problemas

### Não vejo o editor
- ✅ Selecione um formato primeiro
- ✅ Escolha o tipo de página

### Elementos não aparecem
- ✅ Clique em "Adicionar Imagem" ou "Adicionar Texto"
- ✅ Verifique se está dentro do canvas

### Não consigo arrastar
- ✅ Clique no elemento para selecioná-lo
- ✅ Verifique se não está bloqueado

### Não consigo redimensionar
- ✅ Selecione o elemento primeiro
- ✅ Use os handles brancos nos cantos

### Medidas não batem
- ✅ Verifique o formato selecionado
- ✅ Use as réguas como referência
- ✅ Valores são em milímetros (mm)

## 📊 Comparação: Antes vs Depois

### Antes (Editor Simples)
- ❌ Sem dimensões reais
- ❌ Valores em pixels abstratos
- ❌ Sem réguas ou grade
- ❌ Não arrastável
- ❌ Difícil posicionar

### Depois (Editor Profissional)
- ✅ Dimensões reais em mm
- ✅ Canvas com tamanho exato
- ✅ Réguas e grade visual
- ✅ Arrastar e redimensionar
- ✅ Snap to grid
- ✅ Zoom funcional
- ✅ Profissional e preciso

## 🎉 Pronto!

Agora você tem um editor profissional completo para criar layouts perfeitos!

**Acesse**: `http://localhost:3000/admin` → **Layouts** → **Criar Novo Layout**

---

**Última atualização**: 30 de Outubro de 2025

# 🚀 Guia Rápido - Sistema Hierárquico

## 📋 O que foi implementado?

Um sistema completo para criar produtos personalizados (fotolivros, calendários, cartões) com uma estrutura hierárquica:

**Tipo → Formato → Layout → Template**

## 🎯 Acesso Rápido

```
http://localhost:3000/admin
```

### Menu Lateral:
- 📦 **Tipos de Produto** - Ver tipos disponíveis
- 📐 **Formatos** - Criar tamanhos e dimensões
- 🎨 **Layouts** - Criar layouts de páginas
- ✨ **Templates** - Combinar tudo

## 🎨 Como Criar um Template Completo

### Passo 1: Verificar Tipos de Produto
1. Clique em **"Tipos de Produto"** no menu
2. Veja os tipos disponíveis:
   - 📖 Fotolivro (páginas + capa + lombada)
   - 📅 Calendário (páginas + capa)
   - 💌 Cartão (página única)

### Passo 2: Criar um Formato
1. Clique em **"Formatos"** no menu
2. Clique em **"➕ Novo Formato"**
3. Preencha:
   - Nome: "Quadrado 20x20cm"
   - Tipo de Produto: Fotolivro
   - Tipo: Quadrado
   - Largura: 20cm
   - Altura: 20cm
   - Páginas: 20 a 80
4. Clique em **"Criar Formato"**

### Passo 3: Criar Layouts
1. Clique em **"Layouts"** no menu
2. Clique em **"✨ Criar Novo Layout"**
3. Preencha:
   - Nome: "Capa com Foto Grande"
   - Formato: Quadrado 20x20cm
   - Tipo de Página: Capa
4. Adicione elementos:
   - Clique em **"🖼️ Adicionar Imagem"**
   - Ajuste posição e tamanho nas propriedades
   - Clique em **"📝 Adicionar Texto"** (opcional)
5. Clique em **"✅ Criar Layout"**

**Repita** para criar mais layouts (páginas internas, contracapa)

### Passo 4: Criar Template
1. Clique em **"Templates"** no menu
2. Clique em **"✨ Criar Novo Template"**
3. Preencha:
   - Nome: "Fotolivro Clássico"
   - Tipo de Produto: Fotolivro
   - Formato: Quadrado 20x20cm
   - Páginas: 20
   - Tipo de Capa: Dura
4. **Selecione os layouts** clicando nos cards
   - Veja o preview visual de cada layout
   - Clique para selecionar/desselecionar
   - Contador mostra quantos foram selecionados
5. Adicione tags (opcional): "casamento, família"
6. Clique em **"✅ Criar Template"**

## 🎨 Editor de Layouts - Recursos

### Adicionar Elementos
- **🖼️ Imagem**: Área onde o usuário colocará fotos
- **📝 Texto**: Área para títulos ou descrições

### Editar Elementos
1. Clique no elemento no canvas
2. Ajuste nas propriedades:
   - **X, Y**: Posição (em pixels)
   - **Largura, Altura**: Tamanho
   - **Obrigatório**: ☑️ Usuário deve preencher
   - **Bloqueado**: ☑️ Usuário não pode mover

### Remover Elementos
- Passe o mouse sobre o elemento
- Clique no **×** vermelho

## 🔍 Filtros e Buscas

### Layouts
- **Filtrar por Formato**: Mostra apenas layouts de um formato específico
- **Filtrar por Tipo**: Capa, Página ou Contracapa

### Templates
- Lista mostra todos os templates criados
- Badges indicam: tipo, formato, páginas
- Tags para categorização

## 💡 Dicas

### ✅ Boas Práticas
- Crie formatos antes de layouts
- Crie layouts antes de templates
- Use nomes descritivos
- Adicione tags para facilitar busca
- Marque elementos importantes como obrigatórios

### ⚠️ Atenção
- Layouts são vinculados a formatos específicos
- Ao mudar o formato no template, layouts anteriores são desmarcados
- Elementos obrigatórios devem ser preenchidos pelo usuário

## 🎯 Exemplos Práticos

### Exemplo 1: Fotolivro de Casamento
```
1. Formato: Quadrado 20x20cm
2. Layouts:
   - Capa: 1 foto grande + título
   - Página 1: 1 foto centralizada
   - Página 2: 2 fotos lado a lado
   - Página 3: 3 fotos em grid
3. Template: "Casamento Elegante"
   - 40 páginas
   - Capa dura
   - Tags: casamento, elegante
```

### Exemplo 2: Calendário 2026
```
1. Formato: Retangular 21x28cm
2. Layouts:
   - Capa: 1 foto + ano
   - Página Mês: 1 foto + calendário
3. Template: "Calendário 2026"
   - 12 páginas (meses)
   - Capa mole
   - Tags: calendário, 2026
```

### Exemplo 3: Cartão Postal
```
1. Formato: Paisagem 15x10cm
2. Layouts:
   - Frente: 1 foto panorâmica
   - Verso: Texto + endereço
3. Template: "Cartão Postal"
   - 1 página
   - Tags: cartão, postal
```

## 🐛 Solução de Problemas

### Não vejo layouts ao criar template
- ✅ Verifique se selecionou um formato
- ✅ Crie layouts para esse formato primeiro

### Não consigo adicionar elementos no layout
- ✅ Clique nos botões "Adicionar Imagem" ou "Adicionar Texto"
- ✅ Elementos aparecem no canvas

### Elemento não aparece no canvas
- ✅ Verifique se as coordenadas estão dentro do canvas (0-800 x 0-600)
- ✅ Ajuste posição nas propriedades

## 📊 Atalhos Visuais

### Ícones do Sistema
- 📦 = Tipo de Produto
- 📐 = Formato
- 🎨 = Layout
- ✨ = Template
- 🖼️ = Elemento Imagem
- 📝 = Elemento Texto
- ✅ = Ativo/Selecionado
- ❌ = Inativo/Cancelar
- ✏️ = Editar
- 🗑️ = Excluir
- ➕ = Adicionar/Criar
- 🔄 = Atualizar

### Cores dos Badges
- 🔵 Azul = Tipo/Categoria
- 🟢 Verde = Ativo/Sucesso
- 🔴 Vermelho = Inativo/Erro
- 🟡 Amarelo = Aviso

## 🎉 Pronto!

Agora você pode criar produtos personalizados completos com:
- ✅ Estrutura hierárquica organizada
- ✅ Editor visual intuitivo
- ✅ Preview em tempo real
- ✅ Gestão completa de templates

**Divirta-se criando! 🚀**

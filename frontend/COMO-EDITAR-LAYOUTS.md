# 📝 Como Editar Layouts

## ✅ Funcionalidade Implementada!

Agora você pode editar layouts existentes de forma completa.

## 🎯 Como Editar um Layout

### Passo 1: Acessar a Página de Layouts
```
http://localhost:3000/admin
```
Clique em **"🎨 Layouts"** no menu lateral

### Passo 2: Encontrar o Layout
- Use os filtros para encontrar o layout desejado:
  - **Filtrar por Formato**: Mostra apenas layouts de um formato específico
  - **Filtrar por Tipo**: Capa, Página ou Contracapa

### Passo 3: Clicar em Editar
- Clique no botão **"✏️ Editar"** no card do layout
- O formulário de edição será aberto automaticamente
- Todos os dados do layout serão carregados

### Passo 4: Fazer as Alterações

#### Informações Básicas
- **Nome**: Altere o nome do layout
- **Formato**: Mude o formato (se necessário)
- **Tipo de Página**: Altere entre Capa, Página ou Contracapa

#### Elementos
- **Adicionar novos elementos**: 
  - Clique em "🖼️ Adicionar Imagem" ou "📝 Adicionar Texto"
  
- **Editar elementos existentes**:
  - Clique no elemento no canvas para selecioná-lo
  - Ajuste as propriedades:
    - X, Y (posição)
    - Largura, Altura
    - Obrigatório
    - Bloqueado
  
- **Remover elementos**:
  - Passe o mouse sobre o elemento
  - Clique no **×** vermelho

### Passo 5: Salvar
- Clique em **"✅ Atualizar Layout"**
- Aguarde a confirmação de sucesso
- O layout será atualizado na lista

## 🎨 Exemplo Prático

### Editando "Capa Simples"

**Antes:**
- 1 imagem grande (700x500)
- 1 texto pequeno (600x100)

**Edição:**
1. Clicar em "✏️ Editar" no card "Capa Simples"
2. Formulário abre com os dados atuais
3. Clicar na imagem no canvas
4. Alterar largura de 700 para 750
5. Adicionar mais um elemento de texto
6. Clicar em "✅ Atualizar Layout"

**Depois:**
- 1 imagem maior (750x500)
- 2 textos

## ⚙️ Recursos da Edição

### ✅ O que você pode fazer:
- Alterar nome do layout
- Mudar formato vinculado
- Alterar tipo de página
- Adicionar novos elementos
- Editar elementos existentes
- Remover elementos
- Ajustar todas as propriedades

### 🔄 Fluxo de Edição
```
1. Clicar em "✏️ Editar"
   ↓
2. Formulário carrega com dados atuais
   ↓
3. Fazer alterações desejadas
   ↓
4. Clicar em "✅ Atualizar Layout"
   ↓
5. Layout atualizado com sucesso!
```

## 💡 Dicas

### ✅ Boas Práticas
- Sempre revise o preview antes de salvar
- Teste diferentes posições de elementos
- Use nomes descritivos
- Marque elementos importantes como obrigatórios

### ⚠️ Atenção
- Ao mudar o formato, verifique se as dimensões dos elementos ainda fazem sentido
- Elementos obrigatórios devem ser preenchidos pelos usuários
- Elementos bloqueados não podem ser movidos no editor do usuário

## 🎯 Casos de Uso

### Caso 1: Ajustar Tamanho de Imagem
```
Problema: Imagem muito pequena na capa
Solução:
1. Editar layout "Capa Simples"
2. Selecionar elemento de imagem
3. Aumentar largura e altura
4. Salvar
```

### Caso 2: Adicionar Mais Fotos
```
Problema: Layout tem apenas 1 foto, precisa de 2
Solução:
1. Editar layout "Página 1 Foto"
2. Clicar em "🖼️ Adicionar Imagem"
3. Posicionar ao lado da primeira
4. Ajustar tamanhos
5. Salvar
```

### Caso 3: Mudar Tipo de Página
```
Problema: Layout criado como "Página" mas deveria ser "Capa"
Solução:
1. Editar layout
2. Alterar "Tipo de Página" para "Capa"
3. Salvar
```

## 🔧 Solução de Problemas

### Não consigo ver o botão "Editar"
- ✅ Verifique se está na seção "Layouts" do admin
- ✅ Certifique-se de que há layouts criados

### Formulário não abre
- ✅ Recarregue a página
- ✅ Verifique o console do navegador (F12)

### Alterações não são salvas
- ✅ Verifique se preencheu todos os campos obrigatórios
- ✅ Certifique-se de que há pelo menos 1 elemento
- ✅ Clique em "Atualizar Layout" (não em "Limpar")

### Elementos desaparecem
- ✅ Verifique se as coordenadas estão dentro do canvas (0-800 x 0-600)
- ✅ Ajuste a posição nas propriedades

## 📊 Comparação: Antes vs Depois

### Antes (Sem Edição)
- ❌ Não podia editar layouts existentes
- ❌ Tinha que excluir e criar novamente
- ❌ Perdia configurações ao fazer mudanças

### Depois (Com Edição)
- ✅ Edita layouts existentes facilmente
- ✅ Mantém o ID e vinculações
- ✅ Preserva configurações não alteradas
- ✅ Atualização em tempo real

## 🎉 Pronto!

Agora você pode editar layouts de forma completa e intuitiva!

**Acesse**: `http://localhost:3000/admin` → **Layouts** → **✏️ Editar**

---

**Última atualização**: 30 de Outubro de 2025

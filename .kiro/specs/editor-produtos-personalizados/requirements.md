# Documento de Requisitos - Editor Online de Produtos Personalizados

## Introdução

O Editor Online de Produtos Personalizados é uma plataforma web completa para criação de fotoprodutos (fotolivros, calendários, quadros, brindes) com pré-visualização em alta qualidade e geração de arquivos prontos para produção. O sistema inclui frontend responsivo para desktop/mobile e backend com microserviços para renderização, precificação, pedidos, pré-flight e integração com fila de produção.

O objetivo é reduzir o atrito na criação de produtos personalizados, aumentar a taxa de conversão e automatizar todo o processo desde o design até o arquivo de produção e expedição.

## Glossário

- **Sistema_Editor**: A aplicação web frontend para criação e edição de produtos personalizados
- **Sistema_Backend**: Conjunto de microserviços que processam dados, renderização e integração
- **Sistema_Render**: Serviço responsável pela geração de previews e PDFs finais
- **Sistema_Preflight**: Serviço de validação técnica de arquivos antes da produção
- **Sistema_Pagamento**: Serviço de processamento de pagamentos brasileiros
- **Sistema_Producao**: Serviço de integração com equipamentos de impressão e acabamento
- **Fotoproduto**: Produto personalizado criado com fotos do usuário (fotolivro, calendário, etc.)
- **Job_Ticket**: Arquivo técnico com especificações para produção
- **Auto_Layout**: Funcionalidade de distribuição automática de fotos em páginas
- **Preview_3D**: Visualização tridimensional do produto final
- **Sangria**: Área extra além das margens de corte para impressão
- **DPI**: Dots per inch - resolução de imagem para impressão
- **Tenant**: Instância isolada para diferentes marcas/franquias

## Requisitos

### Requisito 1

**User Story:** Como consumidor final, eu quero criar produtos personalizados a partir das minhas fotos, para que eu possa ter lembranças físicas dos meus momentos especiais.

#### Critérios de Aceitação

1. QUANDO o usuário acessa o catálogo, O Sistema_Editor DEVE exibir produtos disponíveis com variantes de tamanho, papel e acabamento
2. QUANDO o usuário faz upload de fotos, O Sistema_Backend DEVE processar arquivos até 12MP com detecção de baixa resolução
3. QUANDO o usuário seleciona fotos, O Sistema_Editor DEVE organizar mídia em pastas com filtros por orientação e data
4. QUANDO o usuário solicita auto-layout, O Sistema_Editor DEVE distribuir fotos automaticamente preservando rostos detectados
5. QUANDO o usuário edita páginas, O Sistema_Editor DEVE validar sangria e DPI em tempo real

### Requisito 2

**User Story:** Como varejista, eu quero oferecer um catálogo white-label com minha marca, para que eu possa vender produtos personalizados aos meus clientes.

#### Critérios de Aceitação

1. QUANDO o tenant é configurado, O Sistema_Backend DEVE aplicar tema e marca personalizados
2. QUANDO produtos são cadastrados, O Sistema_Backend DEVE associar regras de precificação por tenant
3. QUANDO pedidos são processados, O Sistema_Backend DEVE gerar notas fiscais com dados do varejista
4. QUANDO relatórios são solicitados, O Sistema_Backend DEVE segregar dados por tenant

### Requisito 3

**User Story:** Como usuário, eu quero visualizar meu produto em 3D antes de comprar, para que eu possa ter certeza de como ficará o resultado final.

#### Critérios de Aceitação

1. QUANDO o usuário solicita preview 3D, O Sistema_Render DEVE gerar visualização com capa, lombada e encadernação
2. QUANDO o preview é carregado, O Sistema_Editor DEVE exibir resultado em menos de 30 segundos
3. QUANDO o usuário altera acabamento, O Sistema_Editor DEVE atualizar preview 3D automaticamente
4. IF o dispositivo não suporta WebGL, THEN O Sistema_Render DEVE fornecer fallback server-side

### Requisito 4

**User Story:** Como usuário, eu quero pagar meu pedido com métodos brasileiros, para que eu possa finalizar minha compra de forma conveniente.

#### Critérios de Aceitação

1. WHEN o usuário inicia checkout, O Sistema_Pagamento DEVE calcular preço com frete por CEP
2. WHEN o usuário escolhe PIX, O Sistema_Pagamento DEVE gerar QR code válido
3. WHEN pagamento é confirmado, O Sistema_Backend DEVE atualizar status do pedido via webhook
4. WHEN nota fiscal é solicitada, O Sistema_Backend DEVE gerar documento com CPF ou CNPJ

### Requisito 5

**User Story:** Como operador de produção, eu quero receber arquivos validados e prontos para impressão, para que eu possa produzir sem erros técnicos.

#### Critérios de Aceitação

1. WHEN projeto é finalizado, O Sistema_Render DEVE gerar PDF X-4 com marcas de corte e sangria
2. WHEN arquivo é gerado, O Sistema_Preflight DEVE validar perfis ICC, DPI e margens
3. IF validação falha, THEN O Sistema_Preflight DEVE gerar relatório com severidade dos problemas
4. WHEN validação passa, O Sistema_Producao DEVE criar job ticket JDF para imposição
5. WHEN produção inicia, O Sistema_Producao DEVE atualizar status do pedido

### Requisito 6

**User Story:** Como usuário, eu quero salvar meu progresso automaticamente, para que eu não perca meu trabalho em caso de problemas técnicos.

#### Critérios de Aceitação

1. WHILE o usuário edita projeto, O Sistema_Editor DEVE salvar alterações automaticamente a cada 30 segundos
2. WHEN conexão é perdida, O Sistema_Editor DEVE manter dados localmente até reconexão
3. WHEN usuário retorna, O Sistema_Editor DEVE recuperar último estado salvo
4. WHEN conflitos ocorrem, O Sistema_Editor DEVE permitir escolha entre versões

### Requisito 7

**User Story:** Como administrador, eu quero monitorar performance e erros do sistema, para que eu possa garantir qualidade de serviço.

#### Critérios de Aceitação

1. THE Sistema_Backend DEVE registrar métricas de tempo de render com percentil 95
2. THE Sistema_Backend DEVE alertar quando SLA de 30s para preview é violado
3. THE Sistema_Backend DEVE rastrear taxa de conversão por funil de vendas
4. THE Sistema_Backend DEVE manter logs estruturados para auditoria LGPD

### Requisito 8

**User Story:** Como usuário, eu quero que meus dados pessoais sejam protegidos, para que eu tenha privacidade e conformidade com LGPD.

#### Critérios de Aceitação

1. WHEN usuário se cadastra, O Sistema_Backend DEVE registrar consentimento para uso de dados
2. THE Sistema_Backend DEVE criptografar dados pessoais em trânsito e repouso
3. WHEN usuário solicita exclusão, O Sistema_Backend DEVE remover dados em até 30 dias
4. THE Sistema_Backend DEVE manter dados apenas pelo período necessário conforme política de retenção

### Requisito 9

**User Story:** Como usuário mobile, eu quero criar produtos no meu celular, para que eu possa usar fotos diretamente da galeria.

#### Critérios de Aceitação

1. WHEN usuário acessa via mobile, O Sistema_Editor DEVE adaptar interface para tela pequena
2. WHEN usuário faz upload, O Sistema_Editor DEVE permitir seleção múltipla da galeria
3. WHEN usuário edita, O Sistema_Editor DEVE fornecer gestos touch para manipulação
4. WHILE offline, O Sistema_Editor DEVE funcionar como PWA com cache local

### Requisito 10

**User Story:** Como cliente de suporte, eu quero acompanhar status dos meus pedidos, para que eu possa dar informações precisas aos clientes.

#### Critérios de Aceitação

1. WHEN pedido é criado, O Sistema_Backend DEVE enviar notificações por email e WhatsApp
2. WHEN status muda, O Sistema_Backend DEVE atualizar cliente automaticamente
3. WHEN problemas ocorrem, O Sistema_Backend DEVE permitir re-render de arquivos
4. THE Sistema_Backend DEVE integrar com CRM para histórico de atendimento
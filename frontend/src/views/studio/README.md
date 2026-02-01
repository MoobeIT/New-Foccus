# 📸 Área do Fotógrafo (Studio)

## Estrutura de Rotas

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/studio` | StudioDashboard | Dashboard principal |
| `/studio/projects` | StudioProjects | Lista de projetos |
| `/studio/projects/new` | Editor | Criar novo projeto |
| `/studio/projects/:id/edit` | Editor | Editar projeto |
| `/studio/clients` | StudioClients | Lista de clientes |
| `/studio/orders` | StudioOrders | Lista de pedidos |
| `/studio/settings` | StudioSettings | Configurações da conta |

## Controle de Acesso

- **Role necessária**: `photographer` ou `admin`
- **Guard**: `requirePhotographer`
- O admin pode acessar qualquer área do fotógrafo
- O fotógrafo só vê seus próprios dados (filtrado por `tenantId`)

## Fluxo Principal

```
1. Fotógrafo faz login
2. Redireciona para /studio
3. Cria projeto para cliente
4. Edita álbum no editor
5. Envia link de aprovação para cliente
6. Cliente aprova via /approval/:token
7. Pedido é gerado automaticamente
```

## Componentes

- `StudioDashboard.vue` - Visão geral com stats e projetos recentes
- `StudioProjects.vue` - CRUD de projetos com filtros
- `StudioClients.vue` - CRUD de clientes
- `StudioOrders.vue` - Visualização de pedidos
- `StudioSettings.vue` - Perfil, segurança, notificações, branding

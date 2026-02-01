# 🔌 Configuração de Portas

## Portas Padrão do Sistema

| Serviço | Porta | URL | Descrição |
|---------|-------|-----|-----------|
| **Backend API** | `8080` | http://localhost:8080 | API NestJS |
| **Frontend** | `5177` | http://localhost:5177 | Interface Vue.js |
| **Swagger Docs** | `8080` | http://localhost:8080/api/docs | Documentação da API |

## Como Iniciar

```bash
# Backend (na pasta Editor/backend)
npm run dev

# Frontend (na pasta Editor/frontend)  
npm run dev
```

## Configuração

### Backend (.env)
```
PORT=8080
API_BASE_URL="http://localhost:8080"
```

### Frontend (vite.config.ts)
```typescript
server: {
  port: 5173, // Vite tentará usar esta porta
  proxy: {
    '/api': {
      target: 'http://localhost:8080', // Aponta para o backend
      changeOrigin: true
    }
  }
}
```

## Contas de Teste

### Admin
- **Email**: `admin@fotolivros.com`
- **Senha**: `admin123`
- **Redireciona para**: `/admin`

### Fotógrafo
- **Email**: `fotografo@teste.com`
- **Senha**: `foto123`
- **Redireciona para**: `/studio`

## Troubleshooting

Se as portas estiverem ocupadas:
1. O Vite automaticamente tentará a próxima porta disponível
2. O backend usará sempre a porta 8080 (configurada no .env)
3. Se 8080 estiver ocupada, pare o processo que está usando ou mude no .env

## URLs de Acesso

- **Login**: http://localhost:5177/login
- **Admin**: http://localhost:5177/admin
- **Studio**: http://localhost:5177/studio
- **API Docs**: http://localhost:8080/api/docs
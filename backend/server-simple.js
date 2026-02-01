const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`);
  next();
});

// Mock database - Em produção, usar um banco de dados real
const users = [
  {
    id: '1',
    name: 'Administrador',
    email: 'admin@editorprodutos.com',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin',
    createdAt: new Date().toISOString()
  }
];

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware de autorização admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Privilégios de administrador requeridos.' });
  }
  next();
};

// Rotas básicas
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Editor de Fotolivros - API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    docs: '/api/docs',
    endpoints: {
      health: '/api/health',
      docs: '/api/docs',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        profile: 'GET /api/auth/profile',
        refresh: 'POST /api/auth/refresh',
      },
      products: 'GET /api/products',
      templates: {
        list: 'GET /api/templates',
        get: 'GET /api/templates/:id',
        create: 'POST /api/templates',
        update: 'PUT /api/templates/:id',
        delete: 'DELETE /api/templates/:id',
        duplicate: 'POST /api/templates/:id/duplicate',
      },
      assets: 'POST /api/assets/upload',
      admin: {
        users: 'GET /api/admin/users',
        dashboard: 'GET /api/admin/dashboard',
      },
    },
  });
});

// Documentação da API
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Editor de Fotolivros - API Documentation',
    version: '1.0.0',
    description: 'API para criação e venda de fotolivros personalizados',
    baseUrl: `http://localhost:${PORT}/api`,
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      description: 'Obtenha o token via POST /api/auth/login',
    },
    endpoints: [
      {
        group: 'Health',
        routes: [
          { method: 'GET', path: '/', description: 'Info da API' },
          { method: 'GET', path: '/api/health', description: 'Health check' },
        ],
      },
      {
        group: 'Autenticação',
        routes: [
          { method: 'POST', path: '/api/auth/login', description: 'Login', body: { email: 'string', password: 'string' } },
          { method: 'POST', path: '/api/auth/register', description: 'Registro', body: { name: 'string', email: 'string', password: 'string' } },
          { method: 'GET', path: '/api/auth/profile', description: 'Perfil do usuário', auth: true },
          { method: 'PUT', path: '/api/auth/profile', description: 'Atualizar perfil', auth: true },
          { method: 'POST', path: '/api/auth/refresh', description: 'Renovar token', auth: true },
          { method: 'POST', path: '/api/auth/change-password', description: 'Alterar senha', auth: true },
        ],
      },
      {
        group: 'Produtos',
        routes: [
          { method: 'GET', path: '/api/products', description: 'Listar produtos' },
        ],
      },
      {
        group: 'Templates',
        routes: [
          { method: 'GET', path: '/api/templates', description: 'Listar templates', query: { productType: 'string', templateType: 'string', category: 'string', search: 'string' } },
          { method: 'GET', path: '/api/templates/:id', description: 'Obter template' },
          { method: 'POST', path: '/api/templates', description: 'Criar template', auth: true },
          { method: 'PUT', path: '/api/templates/:id', description: 'Atualizar template', auth: true },
          { method: 'DELETE', path: '/api/templates/:id', description: 'Deletar template', auth: true, admin: true },
          { method: 'POST', path: '/api/templates/:id/duplicate', description: 'Duplicar template', auth: true },
        ],
      },
      {
        group: 'Assets',
        routes: [
          { method: 'POST', path: '/api/assets/upload', description: 'Upload de imagem', auth: true },
        ],
      },
      {
        group: 'Admin',
        routes: [
          { method: 'GET', path: '/api/admin/users', description: 'Listar usuários', auth: true, admin: true },
          { method: 'PUT', path: '/api/admin/users/:id/role', description: 'Alterar role', auth: true, admin: true },
          { method: 'DELETE', path: '/api/admin/users/:id', description: 'Deletar usuário', auth: true, admin: true },
          { method: 'GET', path: '/api/admin/dashboard', description: 'Dashboard', auth: true, admin: true },
        ],
      },
    ],
    testCredentials: {
      email: 'admin@editorprodutos.com',
      password: 'password',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Editor Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ===== ROTAS DE AUTENTICAÇÃO =====

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retornar dados do usuário (sem senha)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Verificar se usuário já existe
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email já está em uso' });
    }

    // Validar senha
    if (password.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const newUser = {
      id: (users.length + 1).toString(),
      name,
      email,
      password: hashedPassword,
      role: 'user', // Usuários normais por padrão
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    // Gerar token
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email, 
        role: newUser.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retornar dados do usuário (sem senha)
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Refresh token
app.post('/api/auth/refresh', authenticateToken, (req, res) => {
  try {
    // Buscar usuário atual
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Gerar novo token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Perfil do usuário
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar perfil
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const { name } = req.body;
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Atualizar dados
    if (name) users[userIndex].name = name;
    users[userIndex].updatedAt = new Date().toISOString();

    const { password: _, ...userWithoutPassword } = users[userIndex];
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar senha
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha atual
    const validPassword = await bcrypt.compare(currentPassword, users[userIndex].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Validar nova senha
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex].password = hashedPassword;
    users[userIndex].updatedAt = new Date().toISOString();

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS PROTEGIDAS =====

// Rota de teste para produtos (pública)
app.get('/api/products', (req, res) => {
  res.json({
    products: [
      {
        id: '1',
        name: 'Fotolivro A4',
        description: 'Fotolivro personalizado formato A4',
        price: 49.90,
        variants: [
          { id: '1-1', name: '20 páginas', price: 49.90 },
          { id: '1-2', name: '40 páginas', price: 79.90 }
        ]
      },
      {
        id: '2',
        name: 'Calendário 2024',
        description: 'Calendário personalizado de mesa',
        price: 29.90,
        variants: [
          { id: '2-1', name: 'Mesa', price: 29.90 },
          { id: '2-2', name: 'Parede', price: 39.90 }
        ]
      }
    ]
  });
});

// Mock database para templates
const templates = [
  // Templates de Fotolivro - Capas
  {
    id: 'fb-capa-1',
    name: 'Capa Clássica Elegante',
    productType: 'fotolivro',
    templateType: 'cover',
    category: 'elegante',
    preview: '/templates/fotolivro/capa-classica.jpg',
    thumbnail: '/templates/fotolivro/thumbs/capa-classica-thumb.jpg',
    dimensions: { width: 210, height: 297, unit: 'mm' }, // A4
    spine: { width: 5, minPages: 20, maxPages: 100 },
    margins: { top: 10, right: 10, bottom: 10, left: 10, spine: 5 },
    safeArea: { top: 5, right: 5, bottom: 5, left: 5 },
    elements: [
      { type: 'image', id: 'main-photo', x: 20, y: 20, width: 170, height: 120, required: true },
      { type: 'text', id: 'title', x: 20, y: 150, width: 170, height: 30, fontSize: 24, fontFamily: 'serif' },
      { type: 'text', id: 'subtitle', x: 20, y: 180, width: 170, height: 20, fontSize: 14, fontFamily: 'serif' }
    ],
    colors: ['#2c3e50', '#34495e', '#7f8c8d'],
    fonts: ['Playfair Display', 'Lora', 'Crimson Text'],
    tags: ['elegante', 'clássico', 'casamento', 'família']
  },
  {
    id: 'fb-capa-2',
    name: 'Capa Moderna Minimalista',
    productType: 'fotolivro',
    templateType: 'cover',
    category: 'moderno',
    preview: '/templates/fotolivro/capa-moderna.jpg',
    thumbnail: '/templates/fotolivro/thumbs/capa-moderna-thumb.jpg',
    dimensions: { width: 210, height: 297, unit: 'mm' },
    spine: { width: 5, minPages: 20, maxPages: 100 },
    margins: { top: 15, right: 15, bottom: 15, left: 15, spine: 5 },
    safeArea: { top: 5, right: 5, bottom: 5, left: 5 },
    elements: [
      { type: 'image', id: 'hero-photo', x: 0, y: 0, width: 210, height: 200, required: true },
      { type: 'text', id: 'title', x: 30, y: 220, width: 150, height: 40, fontSize: 28, fontFamily: 'sans-serif' }
    ],
    colors: ['#ffffff', '#000000', '#f39c12'],
    fonts: ['Montserrat', 'Open Sans', 'Roboto'],
    tags: ['moderno', 'minimalista', 'clean', 'profissional']
  },
  
  // Templates de Fotolivro - Páginas
  {
    id: 'fb-page-1',
    name: 'Página Dupla Clássica',
    productType: 'fotolivro',
    templateType: 'page',
    category: 'elegante',
    preview: '/templates/fotolivro/pagina-classica.jpg',
    thumbnail: '/templates/fotolivro/thumbs/pagina-classica-thumb.jpg',
    dimensions: { width: 420, height: 297, unit: 'mm' }, // Página dupla A4
    margins: { top: 10, right: 10, bottom: 10, left: 10, center: 10 },
    safeArea: { top: 5, right: 5, bottom: 5, left: 5 },
    elements: [
      { type: 'image', id: 'photo-1', x: 20, y: 20, width: 180, height: 120, required: true },
      { type: 'image', id: 'photo-2', x: 220, y: 20, width: 180, height: 120, required: false },
      { type: 'text', id: 'caption-1', x: 20, y: 150, width: 180, height: 30, fontSize: 12, fontFamily: 'serif' },
      { type: 'text', id: 'caption-2', x: 220, y: 150, width: 180, height: 30, fontSize: 12, fontFamily: 'serif' }
    ],
    colors: ['#2c3e50', '#ecf0f1'],
    fonts: ['Playfair Display', 'Lora'],
    tags: ['clássico', 'duas-fotos', 'legendas']
  },
  {
    id: 'fb-page-2',
    name: 'Página Mosaico Moderno',
    productType: 'fotolivro',
    templateType: 'page',
    category: 'moderno',
    preview: '/templates/fotolivro/pagina-mosaico.jpg',
    thumbnail: '/templates/fotolivro/thumbs/pagina-mosaico-thumb.jpg',
    dimensions: { width: 420, height: 297, unit: 'mm' },
    margins: { top: 10, right: 10, bottom: 10, left: 10, center: 10 },
    safeArea: { top: 5, right: 5, bottom: 5, left: 5 },
    elements: [
      { type: 'image', id: 'photo-1', x: 20, y: 20, width: 120, height: 80, required: true },
      { type: 'image', id: 'photo-2', x: 150, y: 20, width: 120, height: 80, required: true },
      { type: 'image', id: 'photo-3', x: 280, y: 20, width: 120, height: 80, required: true },
      { type: 'image', id: 'photo-4', x: 20, y: 110, width: 180, height: 120, required: false },
      { type: 'image', id: 'photo-5', x: 220, y: 110, width: 180, height: 120, required: false }
    ],
    colors: ['#ffffff', '#2c3e50'],
    fonts: ['Montserrat', 'Open Sans'],
    tags: ['moderno', 'mosaico', 'múltiplas-fotos']
  },
  
  // Templates de Calendário
  {
    id: 'cal-1',
    name: 'Calendário Mesa Clássico',
    productType: 'calendario',
    templateType: 'page',
    category: 'mesa',
    preview: '/templates/calendario/mesa-classico.jpg',
    thumbnail: '/templates/calendario/thumbs/mesa-classico-thumb.jpg',
    dimensions: { width: 210, height: 148, unit: 'mm' }, // A5 landscape
    margins: { top: 10, right: 10, bottom: 40, left: 10 },
    safeArea: { top: 5, right: 5, bottom: 5, left: 5 },
    elements: [
      { type: 'image', id: 'monthly-photo', x: 10, y: 10, width: 190, height: 80, required: true },
      { type: 'calendar', id: 'calendar-grid', x: 10, y: 100, width: 190, height: 38, fontSize: 10 }
    ],
    colors: ['#34495e', '#ecf0f1'],
    fonts: ['Roboto', 'Open Sans'],
    tags: ['mesa', 'mensal', 'clássico']
  },
  
  // Templates de Cartão
  {
    id: 'card-1',
    name: 'Cartão Aniversário Elegante',
    productType: 'cartao',
    templateType: 'card',
    category: 'aniversario',
    preview: '/templates/cartao/aniversario-elegante.jpg',
    thumbnail: '/templates/cartao/thumbs/aniversario-elegante-thumb.jpg',
    dimensions: { width: 148, height: 105, unit: 'mm' }, // A6
    margins: { top: 5, right: 5, bottom: 5, left: 5 },
    safeArea: { top: 3, right: 3, bottom: 3, left: 3 },
    elements: [
      { type: 'image', id: 'background', x: 0, y: 0, width: 148, height: 105, required: false },
      { type: 'text', id: 'greeting', x: 20, y: 30, width: 108, height: 25, fontSize: 18, fontFamily: 'serif' },
      { type: 'text', id: 'message', x: 20, y: 60, width: 108, height: 30, fontSize: 12, fontFamily: 'serif' }
    ],
    colors: ['#e74c3c', '#f39c12', '#2c3e50'],
    fonts: ['Dancing Script', 'Playfair Display'],
    tags: ['aniversário', 'elegante', 'celebração']
  },
  
  // Templates de Poster
  {
    id: 'poster-1',
    name: 'Poster Fotográfico A3',
    productType: 'poster',
    templateType: 'single',
    category: 'fotografico',
    preview: '/templates/poster/fotografico-a3.jpg',
    thumbnail: '/templates/poster/thumbs/fotografico-a3-thumb.jpg',
    dimensions: { width: 297, height: 420, unit: 'mm' }, // A3
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    safeArea: { top: 10, right: 10, bottom: 10, left: 10 },
    elements: [
      { type: 'image', id: 'main-photo', x: 20, y: 20, width: 257, height: 340, required: true },
      { type: 'text', id: 'caption', x: 20, y: 370, width: 257, height: 30, fontSize: 14, fontFamily: 'sans-serif' }
    ],
    colors: ['#ffffff', '#2c3e50'],
    fonts: ['Roboto', 'Open Sans'],
    tags: ['poster', 'fotográfico', 'A3']
  }
];

// Rota para listar templates
app.get('/api/templates', (req, res) => {
  const { productType, templateType, category, search } = req.query;
  
  let filteredTemplates = [...templates];
  
  // Filtrar por tipo de produto
  if (productType) {
    filteredTemplates = filteredTemplates.filter(t => t.productType === productType);
  }
  
  // Filtrar por tipo de template (cover, page, etc.)
  if (templateType) {
    filteredTemplates = filteredTemplates.filter(t => t.templateType === templateType);
  }
  
  // Filtrar por categoria
  if (category) {
    filteredTemplates = filteredTemplates.filter(t => t.category === category);
  }
  
  // Busca por texto
  if (search) {
    const searchLower = search.toLowerCase();
    filteredTemplates = filteredTemplates.filter(t => 
      t.name.toLowerCase().includes(searchLower) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }
  
  res.json({
    templates: filteredTemplates,
    total: filteredTemplates.length,
    filters: {
      productTypes: [...new Set(templates.map(t => t.productType))],
      templateTypes: [...new Set(templates.map(t => t.templateType))],
      categories: [...new Set(templates.map(t => t.category))]
    }
  });
});

// Rota para obter template específico
app.get('/api/templates/:id', (req, res) => {
  const template = templates.find(t => t.id === req.params.id);
  
  if (!template) {
    return res.status(404).json({ error: 'Template não encontrado' });
  }
  
  res.json(template);
});

// Criar novo template (requer autenticação)
app.post('/api/templates', authenticateToken, (req, res) => {
  console.log('🎯 POST /api/templates chamado');
  console.log('📝 Body:', req.body);
  try {
    const templateData = req.body;
    
    // Validações básicas
    if (!templateData.name || !templateData.productType || !templateData.templateType) {
      return res.status(400).json({ error: 'Nome, tipo de produto e tipo de template são obrigatórios' });
    }
    
    const newTemplate = {
      id: `template-${Date.now()}`,
      ...templateData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.id,
      status: 'active'
    };
    
    templates.push(newTemplate);
    
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Erro ao criar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar template (requer autenticação)
app.put('/api/templates/:id', authenticateToken, (req, res) => {
  try {
    const templateId = req.params.id;
    const templateData = req.body;
    
    const templateIndex = templates.findIndex(t => t.id === templateId);
    if (templateIndex === -1) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    // Atualizar template
    templates[templateIndex] = {
      ...templates[templateIndex],
      ...templateData,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id
    };
    
    res.json(templates[templateIndex]);
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar template (apenas admin)
app.delete('/api/templates/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const templateId = req.params.id;
    
    const templateIndex = templates.findIndex(t => t.id === templateId);
    if (templateIndex === -1) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    templates.splice(templateIndex, 1);
    
    res.json({ message: 'Template deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Duplicar template (requer autenticação)
app.post('/api/templates/:id/duplicate', authenticateToken, (req, res) => {
  try {
    const templateId = req.params.id;
    
    const originalTemplate = templates.find(t => t.id === templateId);
    if (!originalTemplate) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    const duplicatedTemplate = {
      ...originalTemplate,
      id: `template-${Date.now()}`,
      name: `${originalTemplate.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.id
    };
    
    templates.push(duplicatedTemplate);
    
    res.status(201).json(duplicatedTemplate);
  } catch (error) {
    console.error('Erro ao duplicar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de upload (requer autenticação)
app.post('/api/assets/upload', authenticateToken, (req, res) => {
  res.json({
    success: true,
    assets: [
      {
        id: 'mock-asset-1',
        filename: 'uploaded-image.jpg',
        url: '/uploads/mock-image.jpg',
        thumbnails: {
          small: '/uploads/thumbs/mock-image-small.jpg',
          medium: '/uploads/thumbs/mock-image-medium.jpg'
        }
      }
    ]
  });
});

// ===== ROTAS ADMINISTRATIVAS =====

// Listar usuários (apenas admin)
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json({ users: usersWithoutPasswords });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar role do usuário (apenas admin)
app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role inválida' });
    }

    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    users[userIndex].role = role;
    users[userIndex].updatedAt = new Date().toISOString();

    const { password: _, ...userWithoutPassword } = users[userIndex];
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao atualizar role:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar usuário (apenas admin)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir deletar o próprio usuário
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Não é possível deletar sua própria conta' });
    }

    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    users.splice(userIndex, 1);
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard admin (apenas admin)
app.get('/api/admin/dashboard', authenticateToken, requireAdmin, (req, res) => {
  try {
    const stats = {
      totalUsers: users.length,
      adminUsers: users.filter(u => u.role === 'admin').length,
      regularUsers: users.filter(u => u.role === 'user').length,
      recentUsers: users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(({ password, ...user }) => user)
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Algo deu errado!',
    message: err.message
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`📚 API disponível em http://localhost:${PORT}/api`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});
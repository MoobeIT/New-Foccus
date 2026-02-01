-- Dados iniciais para desenvolvimento
-- Inserir tenant padrão
INSERT INTO tenants (id, name, slug, theme_config, settings) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  'Editor Demo',
  'demo',
  '{
    "primaryColor": "#3B82F6",
    "secondaryColor": "#10B981",
    "logo": "/assets/logo-demo.png",
    "favicon": "/assets/favicon-demo.ico"
  }',
  '{
    "allowRegistration": true,
    "maxProjectsPerUser": 50,
    "maxAssetsPerUser": 1000,
    "supportedLanguages": ["pt-BR", "en-US"]
  }'
);

-- Inserir usuário administrador
INSERT INTO users (id, tenant_id, email, password_hash, name, role, email_verified) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'admin@editor.com',
  '$2b$10$rQZ8vQZ8vQZ8vQZ8vQZ8vO', -- senha: admin123 (deve ser alterada em produção)
  'Administrador',
  'admin',
  true
);

-- Inserir produtos de exemplo
INSERT INTO products (id, tenant_id, name, type, description, specs, rules) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Fotolivro Capa Dura',
  'photobook',
  'Fotolivro premium com capa dura e papel fotográfico',
  '{
    "bindingType": "hardcover",
    "paperType": "photo",
    "printType": "digital",
    "colorProfile": "sRGB"
  }',
  '{
    "minPages": 20,
    "maxPages": 200,
    "pageIncrement": 2,
    "bleedMm": 3,
    "safeAreaMm": 5,
    "minDpi": 300,
    "maxFileSize": "50MB"
  }'
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Calendário de Mesa',
  'calendar',
  'Calendário personalizado para mesa com suporte',
  '{
    "calendarType": "desk",
    "paperType": "couche",
    "printType": "offset",
    "colorProfile": "CMYK"
  }',
  '{
    "pages": 13,
    "bleedMm": 3,
    "safeAreaMm": 5,
    "minDpi": 300,
    "maxFileSize": "30MB"
  }'
);

-- Inserir variantes de produtos
INSERT INTO product_variants (id, product_id, name, sku, size_mm, paper, finish, min_pages, max_pages, base_price) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Fotolivro 20x20cm',
  'FB-20X20-HD',
  '{"width": 200, "height": 200}',
  'Papel Fotográfico 180g',
  'Capa Dura',
  20,
  200,
  89.90
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Fotolivro 30x30cm',
  'FB-30X30-HD',
  '{"width": 300, "height": 300}',
  'Papel Fotográfico 180g',
  'Capa Dura',
  20,
  200,
  129.90
),
(
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'Calendário A4',
  'CAL-A4-MESA',
  '{"width": 210, "height": 297}',
  'Couché 150g',
  'Verniz UV',
  13,
  13,
  49.90
);

-- Inserir templates básicos
INSERT INTO templates (id, tenant_id, product_type, name, description, layout_json) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'photobook',
  'Template Clássico',
  'Layout clássico com uma foto por página',
  '{
    "type": "single_photo",
    "elements": [
      {
        "type": "photo",
        "frame": {"x": 15, "y": 15, "width": 170, "height": 170},
        "fit": "cover"
      }
    ],
    "guides": {"bleed": 3, "safeArea": 5}
  }'
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'photobook',
  'Template Mosaico',
  'Layout com múltiplas fotos em mosaico',
  '{
    "type": "mosaic",
    "elements": [
      {
        "type": "photo",
        "frame": {"x": 15, "y": 15, "width": 80, "height": 80},
        "fit": "cover"
      },
      {
        "type": "photo", 
        "frame": {"x": 105, "y": 15, "width": 80, "height": 80},
        "fit": "cover"
      },
      {
        "type": "photo",
        "frame": {"x": 15, "y": 105, "width": 170, "height": 80},
        "fit": "cover"
      }
    ],
    "guides": {"bleed": 3, "safeArea": 5}
  }'
);

-- Inserir dados de exemplo para desenvolvimento
INSERT INTO user_consents (user_id, consent_type, granted, version) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  'data_processing',
  true,
  '1.0'
),
(
  '00000000-0000-0000-0000-000000000001',
  'marketing',
  false,
  '1.0'
);
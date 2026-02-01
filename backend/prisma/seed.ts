import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Editor Fotolivros',
      slug: 'default',
      themeConfig: JSON.stringify({
        primaryColor: '#3b82f6',
        logo: '/logo.png',
      }),
      settings: JSON.stringify({
        currency: 'BRL',
        locale: 'pt-BR',
      }),
    },
  });
  console.log('✅ Tenant created:', tenant.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@fotolivros.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@fotolivros.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'admin',
      emailVerified: true,
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // Create photographer user
  const photographerPassword = await bcrypt.hash('foto123', 10);
  const photographer = await prisma.user.upsert({
    where: { email: 'fotografo@teste.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'fotografo@teste.com',
      name: 'Fotógrafo Teste',
      password: photographerPassword,
      role: 'photographer',
      emailVerified: true,
    },
  });
  console.log('✅ Photographer user created:', photographer.email);


  // Create Photobook Products
  const products = [
    {
      id: 'album-casamento',
      name: 'Álbum Casamento Premium',
      slug: 'album-casamento',
      type: 'photobook',
      category: 'casamento',
      description: 'O álbum perfeito para eternizar o dia mais especial. Capa dura premium, papel fotográfico 230g e acabamento impecável.',
      shortDescription: 'Capa dura, papel 230g, acabamento premium',
      basePrice: 299.0,
      basePagesIncluded: 20,
      pricePerExtraPage: 12.0,
      pricePerExtraSpread: 20.0,
      minPages: 20,
      maxPages: 60,
      pageIncrement: 2,
      features: JSON.stringify([
        'Capa dura com acabamento premium e laminação',
        'Papel fotográfico 230g de alta gramatura',
        'Impressão em alta definição com cores vibrantes',
        'Encadernação layflat - abertura 180° perfeita',
        'Caixa protetora de luxo inclusa',
        'Personalização completa de cores e materiais',
      ]),
      specs: JSON.stringify([
        { icon: '📐', label: 'Tamanhos', value: '20x20, 25x25, 30x30, 35x25 cm' },
        { icon: '📄', label: 'Páginas', value: '20 a 60 páginas' },
        { icon: '🎨', label: 'Papel', value: 'Fotográfico 230g fosco ou brilho' },
        { icon: '📚', label: 'Encadernação', value: 'Layflat (abertura 180°)' },
        { icon: '✨', label: 'Acabamento', value: 'Laminação fosca ou brilho' },
        { icon: '📦', label: 'Embalagem', value: 'Caixa cartonada protetora' },
      ]),
      hasCase: true,
      casePrice: 89.0,
      caseDescription: 'Estojo em madeira maciça com acabamento aveludado',
      badge: 'Mais Vendido',
      tags: JSON.stringify(['casamento', 'premium', 'álbum', 'noivos']),
      sortOrder: 1,
      isActive: true,
      isPublished: true,
    },
    {
      id: 'album-ensaio',
      name: 'Álbum Ensaio Fotográfico',
      slug: 'album-ensaio',
      type: 'photobook',
      category: 'ensaio',
      description: 'Formato quadrado ideal para books e ensaios fotográficos. Design moderno e elegante para valorizar seu trabalho.',
      shortDescription: 'Formato quadrado, ideal para books',
      basePrice: 199.0,
      basePagesIncluded: 16,
      pricePerExtraPage: 10.0,
      pricePerExtraSpread: 18.0,
      minPages: 16,
      maxPages: 40,
      pageIncrement: 2,
      features: JSON.stringify([
        'Formato quadrado moderno e elegante',
        'Ideal para books, ensaios e 15 anos',
        'Papel fotográfico de alta qualidade',
        'Várias opções de capa personalizáveis',
      ]),
      specs: JSON.stringify([
        { icon: '📐', label: 'Tamanhos', value: '20x20, 25x25, 30x30 cm' },
        { icon: '📄', label: 'Páginas', value: '16 a 40 páginas' },
        { icon: '🎨', label: 'Papel', value: 'Fotográfico 200g' },
        { icon: '📚', label: 'Encadernação', value: 'Layflat ou wire-o' },
      ]),
      hasCase: false,
      casePrice: 0,
      badge: null,
      tags: JSON.stringify(['ensaio', 'book', 'fotografia']),
      sortOrder: 2,
      isActive: true,
      isPublished: true,
    },
    {
      id: 'album-newborn',
      name: 'Álbum Newborn',
      slug: 'album-newborn',
      type: 'photobook',
      category: 'newborn',
      description: 'Álbum delicado para registrar os primeiros momentos do bebê. Acabamento suave e cores pastéis.',
      shortDescription: 'Delicado para recém-nascidos',
      basePrice: 149.0,
      basePagesIncluded: 12,
      pricePerExtraPage: 8.0,
      pricePerExtraSpread: 14.0,
      minPages: 12,
      maxPages: 30,
      pageIncrement: 2,
      features: JSON.stringify([
        'Design delicado para bebês',
        'Cores suaves e pastéis',
        'Papel de alta qualidade',
        'Capa personalizada com nome',
      ]),
      specs: JSON.stringify([
        { icon: '📐', label: 'Tamanhos', value: '15x15, 20x20 cm' },
        { icon: '📄', label: 'Páginas', value: '12 a 30 páginas' },
        { icon: '🎨', label: 'Papel', value: 'Fotográfico 180g' },
      ]),
      hasCase: true,
      casePrice: 49.0,
      caseDescription: 'Caixa cartonada com laço',
      badge: null,
      tags: JSON.stringify(['newborn', 'bebê', 'nascimento']),
      sortOrder: 3,
      isActive: true,
      isPublished: true,
    },
    {
      id: 'estojo-madeira-luxo',
      name: 'Estojo Madeira Luxo',
      slug: 'estojo-madeira-luxo',
      type: 'case',
      category: 'estojo',
      description: 'Estojo em madeira maciça com acabamento aveludado interno. Perfeito para presentear.',
      shortDescription: 'Madeira maciça com acabamento aveludado',
      basePrice: 189.0,
      basePagesIncluded: 0,
      pricePerExtraPage: 0,
      pricePerExtraSpread: 0,
      minPages: 0,
      maxPages: 0,
      pageIncrement: 1,
      features: JSON.stringify([
        'Madeira maciça de reflorestamento',
        'Acabamento interno aveludado',
        'Gravação a laser personalizada',
        'Fechamento magnético',
      ]),
      specs: JSON.stringify([
        { icon: '📐', label: 'Tamanhos', value: 'Para álbuns 20x20 a 30x30 cm' },
        { icon: '🪵', label: 'Material', value: 'Madeira maciça' },
        { icon: '✨', label: 'Acabamento', value: 'Verniz fosco' },
      ]),
      hasCase: false,
      casePrice: 0,
      badge: 'Premium',
      tags: JSON.stringify(['estojo', 'madeira', 'luxo', 'presente']),
      sortOrder: 10,
      isActive: true,
      isPublished: true,
    },
    {
      id: 'caixa-cartonada',
      name: 'Caixa Cartonada Premium',
      slug: 'caixa-cartonada',
      type: 'case',
      category: 'estojo',
      description: 'Caixa cartonada com revestimento especial. Elegante e acessível.',
      shortDescription: 'Revestimento especial, elegante',
      basePrice: 79.0,
      basePagesIncluded: 0,
      pricePerExtraPage: 0,
      pricePerExtraSpread: 0,
      minPages: 0,
      maxPages: 0,
      pageIncrement: 1,
      features: JSON.stringify([
        'Cartonagem de alta qualidade',
        'Revestimento em papel especial',
        'Interior forrado',
        'Personalização com hot stamping',
      ]),
      specs: JSON.stringify([
        { icon: '📐', label: 'Tamanhos', value: 'Para álbuns 20x20 a 30x30 cm' },
        { icon: '📦', label: 'Material', value: 'Cartonagem revestida' },
      ]),
      hasCase: false,
      casePrice: 0,
      badge: null,
      tags: JSON.stringify(['caixa', 'cartonada', 'embalagem']),
      sortOrder: 11,
      isActive: true,
      isPublished: true,
    },
  ];

  for (const productData of products) {
    const { id, ...data } = productData;
    await prisma.product.upsert({
      where: { id },
      update: data,
      create: {
        id,
        tenantId: tenant.id,
        ...data,
        publishedAt: data.isPublished ? new Date() : null,
      },
    });
  }
  console.log('✅ Products created:', products.length);

  // Get the main photobook for format association
  const photobook = await prisma.product.findUnique({ where: { id: 'album-casamento' } });

  // Create Formats
  const formats = [
    {
      id: 'format-20x20',
      name: 'Quadrado 20x20cm',
      width: 200,
      height: 200,
      orientation: 'square',
      minPages: 20,
      maxPages: 100,
      pageIncrement: 2,
      bleed: 3,
      safeMargin: 5,
      gutterMargin: 10,
      priceMultiplier: 1.0,
    },
    {
      id: 'format-30x30',
      name: 'Quadrado 30x30cm',
      width: 300,
      height: 300,
      orientation: 'square',
      minPages: 20,
      maxPages: 80,
      pageIncrement: 2,
      bleed: 3,
      safeMargin: 5,
      gutterMargin: 12,
      priceMultiplier: 1.5,
    },
    {
      id: 'format-20x30',
      name: 'Retrato 20x30cm',
      width: 200,
      height: 300,
      orientation: 'portrait',
      minPages: 20,
      maxPages: 120,
      pageIncrement: 2,
      bleed: 3,
      safeMargin: 5,
      gutterMargin: 10,
      priceMultiplier: 1.3,
    },
    {
      id: 'format-30x20',
      name: 'Paisagem 30x20cm',
      width: 300,
      height: 200,
      orientation: 'landscape',
      minPages: 20,
      maxPages: 100,
      pageIncrement: 2,
      bleed: 3,
      safeMargin: 5,
      gutterMargin: 10,
      priceMultiplier: 1.3,
    },
    {
      id: 'format-a4',
      name: 'A4 (21x29.7cm)',
      width: 210,
      height: 297,
      orientation: 'portrait',
      minPages: 20,
      maxPages: 200,
      pageIncrement: 2,
      bleed: 3,
      safeMargin: 5,
      gutterMargin: 12,
      priceMultiplier: 1.4,
    },
  ];

  for (const format of formats) {
    await prisma.format.upsert({
      where: { id: format.id },
      update: {},
      create: {
        ...format,
        tenantId: tenant.id,
        productId: photobook.id,
      },
    });
  }
  console.log('✅ Formats created:', formats.length);


  // Create Papers
  const papers = [
    {
      id: 'paper-photo-glossy-230',
      name: 'Fotográfico Brilhante 230g',
      type: 'photo',
      weight: 230,
      thickness: 0.25, // mm per sheet
      finish: 'glossy',
      lamination: 'none',
      pricePerPage: 0.80,
    },
    {
      id: 'paper-photo-matte-230',
      name: 'Fotográfico Fosco 230g',
      type: 'photo',
      weight: 230,
      thickness: 0.25,
      finish: 'matte',
      lamination: 'none',
      pricePerPage: 0.85,
    },
    {
      id: 'paper-photo-satin-250',
      name: 'Fotográfico Acetinado 250g',
      type: 'photo',
      weight: 250,
      thickness: 0.28,
      finish: 'satin',
      lamination: 'none',
      pricePerPage: 0.95,
    },
    {
      id: 'paper-coated-170',
      name: 'Couché Brilho 170g',
      type: 'coated',
      weight: 170,
      thickness: 0.15,
      finish: 'glossy',
      lamination: 'none',
      pricePerPage: 0.50,
    },
    {
      id: 'paper-coated-matte-170',
      name: 'Couché Fosco 170g',
      type: 'coated',
      weight: 170,
      thickness: 0.15,
      finish: 'matte',
      lamination: 'none',
      pricePerPage: 0.55,
    },
    {
      id: 'paper-premium-300',
      name: 'Premium Laminado 300g',
      type: 'photo',
      weight: 300,
      thickness: 0.35,
      finish: 'glossy',
      lamination: 'matte',
      pricePerPage: 1.50,
    },
  ];

  for (const paper of papers) {
    await prisma.paper.upsert({
      where: { id: paper.id },
      update: {},
      create: {
        ...paper,
        tenantId: tenant.id,
      },
    });
  }
  console.log('✅ Papers created:', papers.length);

  // Create Format-Paper compatibility
  const formatPaperRelations = [
    // All papers compatible with all formats for simplicity
    // In production, you might have specific restrictions
  ];

  // Link all papers to all formats
  const allFormats = await prisma.format.findMany({ where: { tenantId: tenant.id } });
  const allPapers = await prisma.paper.findMany({ where: { tenantId: tenant.id } });

  for (const format of allFormats) {
    for (const paper of allPapers) {
      await prisma.formatPaper.upsert({
        where: {
          formatId_paperId: {
            formatId: format.id,
            paperId: paper.id,
          },
        },
        update: {},
        create: {
          formatId: format.id,
          paperId: paper.id,
        },
      });
    }
  }
  console.log('✅ Format-Paper relations created');


  // Create Cover Types
  const coverTypes = [
    {
      id: 'cover-soft',
      name: 'Capa Flexível',
      type: 'soft',
      bindingTolerance: 0,
      price: 5.0,
    },
    {
      id: 'cover-hard',
      name: 'Capa Dura',
      type: 'hard',
      bindingTolerance: 2.0, // 2mm extra for hard cover binding
      price: 15.0,
    },
    {
      id: 'cover-premium',
      name: 'Capa Premium (Couro Sintético)',
      type: 'premium',
      bindingTolerance: 3.0,
      price: 35.0,
    },
  ];

  for (const coverType of coverTypes) {
    await prisma.coverType.upsert({
      where: { id: coverType.id },
      update: {},
      create: {
        ...coverType,
        tenantId: tenant.id,
      },
    });
  }
  console.log('✅ Cover types created:', coverTypes.length);

  // Create Product-Paper associations
  const productPaperAssociations = [
    { productId: 'album-casamento', paperId: 'paper-photo-glossy-230', isDefault: true, priceAdjustment: 0 },
    { productId: 'album-casamento', paperId: 'paper-photo-matte-230', isDefault: false, priceAdjustment: 5 },
    { productId: 'album-casamento', paperId: 'paper-premium-300', isDefault: false, priceAdjustment: 25 },
    { productId: 'album-ensaio', paperId: 'paper-photo-glossy-230', isDefault: true, priceAdjustment: 0 },
    { productId: 'album-ensaio', paperId: 'paper-photo-matte-230', isDefault: false, priceAdjustment: 5 },
    { productId: 'album-newborn', paperId: 'paper-photo-matte-230', isDefault: true, priceAdjustment: 0 },
    { productId: 'album-newborn', paperId: 'paper-photo-satin-250', isDefault: false, priceAdjustment: 10 },
  ];

  for (const assoc of productPaperAssociations) {
    await prisma.productPaper.upsert({
      where: {
        productId_paperId: {
          productId: assoc.productId,
          paperId: assoc.paperId,
        },
      },
      update: { isDefault: assoc.isDefault, priceAdjustment: assoc.priceAdjustment },
      create: assoc,
    });
  }
  console.log('✅ Product-Paper associations created:', productPaperAssociations.length);

  // Create Product-CoverType associations
  const productCoverAssociations = [
    { productId: 'album-casamento', coverTypeId: 'cover-hard', isDefault: true, priceAdjustment: 0 },
    { productId: 'album-casamento', coverTypeId: 'cover-premium', isDefault: false, priceAdjustment: 0 },
    { productId: 'album-ensaio', coverTypeId: 'cover-soft', isDefault: true, priceAdjustment: 0 },
    { productId: 'album-ensaio', coverTypeId: 'cover-hard', isDefault: false, priceAdjustment: 0 },
    { productId: 'album-newborn', coverTypeId: 'cover-soft', isDefault: true, priceAdjustment: 0 },
    { productId: 'album-newborn', coverTypeId: 'cover-hard', isDefault: false, priceAdjustment: 0 },
  ];

  for (const assoc of productCoverAssociations) {
    await prisma.productCoverType.upsert({
      where: {
        productId_coverTypeId: {
          productId: assoc.productId,
          coverTypeId: assoc.coverTypeId,
        },
      },
      update: { isDefault: assoc.isDefault, priceAdjustment: assoc.priceAdjustment },
      create: assoc,
    });
  }
  console.log('✅ Product-CoverType associations created:', productCoverAssociations.length);

  // Create sample templates
  const templates = [
    {
      id: 'template-cover-classic',
      name: 'Capa Clássica',
      productType: 'photobook',
      templateType: 'cover',
      category: 'classic',
      description: 'Capa elegante com foto central e título',
      elements: JSON.stringify([
        { id: 'main-photo', type: 'image', x: 20, y: 20, width: 160, height: 120, required: true },
        { id: 'title', type: 'text', x: 20, y: 150, width: 160, height: 30, fontSize: 24 },
      ]),
    },
    {
      id: 'template-page-single',
      name: 'Página Única',
      productType: 'photobook',
      templateType: 'page',
      category: 'simple',
      description: 'Layout com uma foto centralizada',
      elements: JSON.stringify([
        { id: 'photo-1', type: 'image', x: 20, y: 20, width: 160, height: 200, required: true },
      ]),
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: {},
      create: {
        ...template,
        tenantId: tenant.id,
        isSystem: true,
      },
    });
  }
  console.log('✅ Templates created:', templates.length);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

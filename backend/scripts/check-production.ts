import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Verificar projetos em produção
  const productionProjects = await prisma.project.findMany({
    where: {
      status: { in: ['production', 'PRODUCTION'] }
    },
  });
  
  console.log(`🏭 Projetos em produção: ${productionProjects.length}\n`);
  
  // Atualizar projetos sem paymentStatus
  for (const p of productionProjects) {
    let settings: any = {};
    try {
      settings = typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings || {};
    } catch { settings = {}; }
    
    if (!settings.paymentStatus) {
      console.log(`⚡ Atualizando ${p.name}...`);
      
      const newSettings = {
        ...settings,
        paymentStatus: 'pending',
        productionStatus: 'waiting',
        totalPrice: 389.90,
      };
      
      await prisma.project.update({
        where: { id: p.id },
        data: {
          settings: JSON.stringify(newSettings)
        }
      });
      
      console.log(`   ✅ Atualizado!`);
    }
  }
  
  console.log('\n✅ Concluído!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

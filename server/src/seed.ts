import { PrismaClient } from '@prisma/client';
import { createSampleListings } from './sampleListings';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create categories
  const categories = [
    { name: 'Electronics', description: 'Phones, computers, gadgets, and more', icon: 'device-phone-mobile' },
    { name: 'Furniture', description: 'Tables, chairs, sofas, and home decor', icon: 'home' },
    { name: 'Vehicles', description: 'Cars, trucks, motorcycles, and parts', icon: 'truck' },
    { name: 'Clothing', description: 'Men\'s, women\'s, and children\'s clothing', icon: 'shopping-bag' },
    { name: 'Sports & Recreation', description: 'Exercise equipment, outdoor gear, and sports items', icon: 'sport' },
    { name: 'Home & Garden', description: 'Tools, appliances, and garden supplies', icon: 'home-modern' },
    { name: 'Books & Media', description: 'Books, movies, music, and games', icon: 'book-open' },
    { name: 'Toys & Games', description: 'Children\'s toys, board games, and puzzles', icon: 'puzzle-piece' },
    { name: 'Jewelry & Accessories', description: 'Watches, jewelry, and fashion accessories', icon: 'sparkles' },
    { name: 'Miscellaneous', description: 'Everything else', icon: 'ellipsis-horizontal' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category
    });
    console.log(`✅ Created/updated category: ${category.name}`);
  }

  // Create sample listings
  await createSampleListings();

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const sampleListings = [
  // Promoted Listings
  {
    title: "2020 MacBook Pro 13-inch - Like New",
    description: "Perfect condition MacBook Pro with M1 chip. Used for light office work, comes with original charger and box.",
    price: 1200,
    condition: "Excellent",
    location: "Tuscaloosa, AL",
    zipCode: "35401",
    isPromoted: true,
    promotedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    categoryName: "Electronics"
  },
  {
    title: "2019 Honda Civic - Low Miles",
    description: "Well-maintained Honda Civic with only 25,000 miles. Single owner, all service records available.",
    price: 18500,
    condition: "Very Good",
    location: "Birmingham, AL",
    zipCode: "35203",
    isPromoted: true,
    promotedUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    categoryName: "Vehicles"
  },
  {
    title: "Vintage Gibson Les Paul Guitar",
    description: "Beautiful 1970s Gibson Les Paul in cherry sunburst. Recently serviced and plays beautifully.",
    price: 2500,
    condition: "Good",
    location: "Tuscaloosa, AL",
    zipCode: "35406",
    isPromoted: true,
    promotedUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    categoryName: "Collectibles"
  },

  // Featured Listings
  {
    title: "Modern Sectional Sofa - Gray",
    description: "Large L-shaped sectional sofa in excellent condition. Perfect for family room or living room.",
    price: 450,
    condition: "Very Good",
    location: "Birmingham, AL",
    zipCode: "35209",
    isFeatured: true,
    categoryName: "Home & Garden"
  },
  {
    title: "iPhone 13 Pro Max 256GB",
    description: "Unlocked iPhone 13 Pro Max in space gray. Battery health 95%, comes with case and screen protector.",
    price: 750,
    condition: "Excellent",
    location: "Tuscaloosa, AL",
    zipCode: "35401",
    isFeatured: true,
    categoryName: "Electronics"
  },
  {
    title: "Professional Camera Lens Set",
    description: "Canon EF 24-70mm f/2.8L and 70-200mm f/2.8L lenses. Professional quality, used for wedding photography.",
    price: 1800,
    condition: "Very Good",
    location: "Birmingham, AL",
    zipCode: "35223",
    isFeatured: true,
    categoryName: "Electronics"
  },

  // Featured Listings (additional)
  {
    title: "Vintage Record Player - Working",
    description: "Classic turntable in excellent working condition. Perfect for vinyl enthusiasts.",
    price: 150,
    condition: "Very Good",
    location: "Birmingham, AL",
    zipCode: "35205",
    isFeatured: true,
    categoryName: "Electronics"
  },
  {
    title: "Leather Office Chair - Ergonomic",
    description: "High-quality leather office chair with lumbar support. Barely used, like new condition.",
    price: 200,
    condition: "Excellent",
    location: "Tuscaloosa, AL",
    zipCode: "35401",
    isFeatured: true,
    categoryName: "Home & Garden"
  },

  // Popular Listings
  {
    title: "Dining Table Set - 6 Chairs",
    description: "Solid wood dining table with 6 matching chairs. Perfect for family dinners and entertaining.",
    price: 300,
    condition: "Good",
    location: "Tuscaloosa, AL",
    zipCode: "35405",
    viewCount: 45,
    categoryName: "Home & Garden"
  },
  {
    title: "Mountain Bike - Trek 29er",
    description: "Trek mountain bike with 29-inch wheels. Great for trails and commuting. Recently tuned up.",
    price: 400,
    condition: "Very Good",
    location: "Birmingham, AL",
    zipCode: "35216",
    viewCount: 38,
    categoryName: "Sports & Outdoors"
  },
  {
    title: "Designer Handbag - Coach",
    description: "Authentic Coach handbag in brown leather. Classic style, perfect condition.",
    price: 150,
    condition: "Excellent",
    location: "Tuscaloosa, AL",
    zipCode: "35401",
    viewCount: 52,
    categoryName: "Fashion"
  },
  {
    title: "Gaming PC Setup",
    description: "Custom gaming PC with RTX 3070, Ryzen 7, 32GB RAM. Includes monitor, keyboard, and mouse.",
    price: 1200,
    condition: "Very Good",
    location: "Birmingham, AL",
    zipCode: "35242",
    viewCount: 67,
    categoryName: "Electronics"
  },
  {
    title: "Patio Furniture Set",
    description: "Complete outdoor patio set with table and 4 chairs. Weather-resistant materials.",
    price: 200,
    condition: "Good",
    location: "Tuscaloosa, AL",
    zipCode: "35406",
    viewCount: 29,
    categoryName: "Home & Garden"
  },
  {
    title: "Vintage Vinyl Record Collection",
    description: "Collection of 50+ vintage vinyl records from 60s-80s. Classic rock, jazz, and blues.",
    price: 300,
    condition: "Good",
    location: "Birmingham, AL",
    zipCode: "35205",
    viewCount: 41,
    categoryName: "Collectibles"
  }
];

export async function createSampleListings() {
  try {
    // Get categories
    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map(cat => [cat.name, cat.id]));

    // Create a test user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: 'hashedpassword', // In real app, this would be properly hashed
        firstName: 'John',
        lastName: 'Doe',
        phone: '205-555-0123',
        location: 'Tuscaloosa, AL',
        zipCode: '35401'
      }
    });

    // Create sample listings
    for (const listing of sampleListings) {
      const categoryId = categoryMap.get(listing.categoryName);
      if (!categoryId) continue;

      await prisma.listing.create({
        data: {
          title: listing.title,
          description: listing.description,
          price: listing.price,
          condition: listing.condition,
          location: listing.location,
          zipCode: listing.zipCode,
          isPromoted: listing.isPromoted || false,
          isFeatured: listing.isFeatured || false,
          promotedUntil: listing.promotedUntil || null,
          viewCount: listing.viewCount || Math.floor(Math.random() * 50),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          userId: testUser.id,
          categoryId: categoryId
        }
      });
    }

    console.log('✅ Sample listings created successfully!');
  } catch (error) {
    console.error('❌ Error creating sample listings:', error);
  }
}

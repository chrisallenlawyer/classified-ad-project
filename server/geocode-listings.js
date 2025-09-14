const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Common US zipcode coordinates (manually added for testing)
const commonZipcodes = {
  // Alabama zipcodes (from the database)
  '35401': { lat: 33.2098, lng: -87.5692 }, // Tuscaloosa, AL
  '35203': { lat: 33.5207, lng: -86.8025 }, // Birmingham, AL
  '35209': { lat: 33.5207, lng: -86.8025 }, // Birmingham, AL
  '35223': { lat: 33.5207, lng: -86.8025 }, // Birmingham, AL
  '35405': { lat: 33.2098, lng: -87.5692 }, // Tuscaloosa, AL
  '35242': { lat: 33.5207, lng: -86.8025 }, // Birmingham, AL
  '35406': { lat: 33.2098, lng: -87.5692 }, // Tuscaloosa, AL
  '35205': { lat: 33.5207, lng: -86.8025 }, // Birmingham, AL
  
  // Major US cities
  '10001': { lat: 40.7505, lng: -73.9934 }, // New York, NY
  '90210': { lat: 34.0901, lng: -118.4065 }, // Beverly Hills, CA
  '60601': { lat: 41.8781, lng: -87.6298 }, // Chicago, IL
  '33101': { lat: 25.7617, lng: -80.1918 }, // Miami, FL
  '75201': { lat: 32.7767, lng: -96.7970 }, // Dallas, TX
  '98101': { lat: 47.6062, lng: -122.3321 }, // Seattle, WA
  '02101': { lat: 42.3601, lng: -71.0589 }, // Boston, MA
  '30301': { lat: 33.7490, lng: -84.3880 }, // Atlanta, GA
  '85001': { lat: 33.4484, lng: -112.0740 }, // Phoenix, AZ
  '80201': { lat: 39.7392, lng: -104.9903 }, // Denver, CO
  '94101': { lat: 37.7749, lng: -122.4194 }, // San Francisco, CA
  '97201': { lat: 45.5152, lng: -122.6784 }, // Portland, OR
  '55401': { lat: 44.9778, lng: -93.2650 }, // Minneapolis, MN
  '70112': { lat: 29.9511, lng: -90.0715 }, // New Orleans, LA
  '84101': { lat: 40.7608, lng: -111.8910 }, // Salt Lake City, UT
  '37201': { lat: 36.1627, lng: -86.7816 }, // Nashville, TN
  '28201': { lat: 35.2271, lng: -80.8431 }, // Charlotte, NC
};

async function geocodeListings() {
  try {
    console.log('🔍 Finding listings without coordinates...');
    
    // Get all listings without coordinates
    const listings = await prisma.listing.findMany({
      where: {
        OR: [
          { latitude: null },
          { longitude: null }
        ]
      },
      select: {
        id: true,
        zipCode: true,
        title: true
      }
    });

    console.log(`📊 Found ${listings.length} listings without coordinates`);

    if (listings.length === 0) {
      console.log('✅ All listings already have coordinates!');
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const listing of listings) {
      if (!listing.zipCode) {
        console.log(`⏭️  Skipping listing ${listing.id} (${listing.title}) - no zip code`);
        skipped++;
        continue;
      }

      // Check if we have coordinates for this zipcode
      const coords = commonZipcodes[listing.zipCode];
      
      if (coords) {
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            latitude: coords.lat,
            longitude: coords.lng
          }
        });
        
        console.log(`✅ Updated listing ${listing.id} (${listing.title}) with coordinates for ${listing.zipCode}`);
        updated++;
      } else {
        console.log(`⏭️  Skipping listing ${listing.id} (${listing.title}) - no coordinates for zipcode ${listing.zipCode}`);
        skipped++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Updated: ${updated} listings`);
    console.log(`   Skipped: ${skipped} listings`);
    console.log(`   Total: ${listings.length} listings`);

    // Verify the results
    const totalWithCoords = await prisma.listing.count({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } }
        ]
      }
    });

    console.log(`\n🎯 Final result: ${totalWithCoords} listings now have coordinates`);

  } catch (error) {
    console.error('❌ Error geocoding listings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

geocodeListings();

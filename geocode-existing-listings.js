// Script to geocode existing listings
// Run this with: node geocode-existing-listings.js

import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

// Geocoding function
async function geocodeZipcode(zipcode) {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zipcode}`)
    if (!response.ok) return null
    
    const data = await response.json()
    const place = data.places[0]
    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude)
    }
  } catch (error) {
    console.error(`Error geocoding ${zipcode}:`, error)
    return null
  }
}

// Main function
async function geocodeExistingListings() {
  console.log('🚀 Starting geocoding process...')
  
  // Get all listings that need geocoding
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, zip_code, title')
    .eq('is_active', true)
    .is('latitude', null)
    .not('zip_code', 'is', null)
    .neq('zip_code', '')
  
  if (error) {
    console.error('Error fetching listings:', error)
    return
  }
  
  console.log(`📊 Found ${listings.length} listings to geocode`)
  
  // Group by zipcode to minimize API calls
  const zipcodeGroups = {}
  listings.forEach(listing => {
    if (!zipcodeGroups[listing.zip_code]) {
      zipcodeGroups[listing.zip_code] = []
    }
    zipcodeGroups[listing.zip_code].push(listing)
  })
  
  console.log(`🗺️  Found ${Object.keys(zipcodeGroups).length} unique zipcodes`)
  
  let successCount = 0
  let errorCount = 0
  
  // Process each zipcode
  for (const [zipcode, listingsForZipcode] of Object.entries(zipcodeGroups)) {
    console.log(`\n📍 Processing zipcode ${zipcode} (${listingsForZipcode.length} listings)`)
    
    // Geocode the zipcode
    const coordinates = await geocodeZipcode(zipcode)
    
    if (coordinates) {
      console.log(`✅ Geocoded ${zipcode}: ${coordinates.lat}, ${coordinates.lng}`)
      
      // Update all listings with this zipcode
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          latitude: coordinates.lat,
          longitude: coordinates.lng
        })
        .eq('zip_code', zipcode)
        .is('latitude', null)
      
      if (updateError) {
        console.error(`❌ Error updating listings for ${zipcode}:`, updateError)
        errorCount += listingsForZipcode.length
      } else {
        console.log(`✅ Updated ${listingsForZipcode.length} listings for ${zipcode}`)
        successCount += listingsForZipcode.length
      }
    } else {
      console.log(`❌ Failed to geocode ${zipcode}`)
      errorCount += listingsForZipcode.length
    }
    
    // Add delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`\n🎉 Geocoding complete!`)
  console.log(`✅ Successfully geocoded: ${successCount} listings`)
  console.log(`❌ Failed to geocode: ${errorCount} listings`)
  
  // Show final stats
  const { data: finalStats } = await supabase
    .from('listings')
    .select('id')
    .eq('is_active', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
  
  console.log(`📊 Total listings with coordinates: ${finalStats?.length || 0}`)
}

// Run the script
geocodeExistingListings().catch(console.error)

import { supabase } from '../lib/supabase'

export interface Category {
  id: string
  name: string
  description: string | null
  icon: string | null
  is_active: boolean
  is_vehicle: boolean
  created_at: string
  updated_at: string
}

export interface Listing {
  id: string
  title: string
  description: string
  price: number
  condition: string
  location: string
  zip_code: string
  contact_email: string | null
  contact_phone: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
  is_sold: boolean
  is_featured: boolean
  is_promoted: boolean
  promoted_until: string | null
  expires_at: string
  view_count: number
  created_at: string
  updated_at: string
  user_id: string
  category_id: string
  category?: Category
  images?: ListingImage[]
  user?: {
    id: string
    email: string
    user_metadata: {
      first_name?: string
      last_name?: string
    }
  }
}

export interface ListingImage {
  id: string
  listing_id: string
  filename: string
  original_name: string
  mime_type: string
  size: number
  path: string
  is_primary: boolean
  created_at: string
}

export interface CreateListingData {
  title: string
  description: string
  price: number
  condition: string
  location: string
  zip_code: string
  category_id: string
  contact_email?: string
  contact_phone?: string
  latitude?: number
  longitude?: number
  expires_at?: string
  images?: UploadedImage[]
  listing_type?: 'free' | 'featured' | 'vehicle'
  listing_fee?: number
}

export interface UploadedImage {
  imageUrl: string
  filename: string
  originalName: string
  size: number
  mimeType: string
}

// Categories API
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching categories:', error)
    throw error
  }

  return data || []
}

export const createCategory = async (categoryData: { name: string; description?: string; icon?: string; is_vehicle?: boolean }): Promise<Category> => {
  console.log('Creating category with data:', categoryData);
  
  const { data, error } = await supabase
    .from('categories')
    .insert([categoryData])
    .select()
    .single()

  if (error) {
    console.error('Error creating category:', error)
    throw error
  }

  console.log('Category created successfully:', data);
  return data
}

export const updateCategory = async (id: string, categoryData: { name?: string; description?: string; icon?: string; is_vehicle?: boolean; is_active?: boolean }): Promise<Category> => {
  console.log('Updating category with ID:', id);
  console.log('Raw category data keys:', Object.keys(categoryData));
  console.log('Raw category data values:', Object.values(categoryData));
  console.log('Raw category data:', JSON.stringify(categoryData, null, 2));
  
  // Clean the data - remove undefined values
  const cleanData: any = {};
  Object.keys(categoryData).forEach(key => {
    const value = (categoryData as any)[key];
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });
  
  console.log('Cleaned category data keys:', Object.keys(cleanData));
  console.log('Cleaned category data values:', Object.values(cleanData));
  console.log('Cleaned category data:', JSON.stringify(cleanData, null, 2));
  
  // First check if the category exists
  const { data: existingCategory, error: checkError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', id)
    .single();
    
  if (checkError) {
    console.error('Category does not exist:', { id, checkError });
    throw new Error(`Category with ID ${id} does not exist`);
  }
  
  console.log('Found existing category:', existingCategory);
  
  const { data, error } = await supabase
    .from('categories')
    .update(cleanData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Detailed error updating category:', {
      error,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      categoryId: id,
      categoryData,
      fullError: JSON.stringify(error, null, 2)
    });
    
    // Provide more helpful error message
    if (error.code === '23505') {
      throw new Error(`Category name "${categoryData.name}" already exists. Please choose a different name.`);
    } else if (error.message.includes('column') && error.message.includes('does not exist')) {
      throw new Error('Database schema issue: Missing columns. Please contact support.');
    }
    
    throw error
  }

  console.log('Category updated successfully:', data);
  return data
}

export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting category:', error)
    throw error
  }
}

// Geocoding API function
export const geocodeZipcode = async (zipcode: string): Promise<{lat: number, lng: number} | null> => {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zipcode}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    const place = data.places[0];
    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude)
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Distance calculation function (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in miles
};

// Listings API
export const getListings = async (options: {
  limit?: number
  offset?: number
  category_id?: string
  search?: string
  featured?: boolean
  promoted?: boolean
  min_price?: number
  max_price?: number
  zip_code?: string
  radius?: number
  condition?: string
  sort?: 'created_at' | 'price' | 'view_count' | 'title'
  order?: 'asc' | 'desc'
} = {}): Promise<Listing[]> => {
  let query = supabase
    .from('listings')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_active', true)
    .eq('is_sold', false)
    .gte('expires_at', new Date().toISOString())

  // Apply filters
  if (options.category_id) {
    query = query.eq('category_id', options.category_id)
  }

  if (options.featured) {
    query = query.eq('is_featured', true)
  }

  if (options.promoted) {
    query = query.eq('is_promoted', true)
  }

  if (options.min_price !== undefined) {
    query = query.gte('price', options.min_price)
  }
  if (options.max_price !== undefined) {
    query = query.lte('price', options.max_price)
  }
  if (options.condition) {
    query = query.eq('condition', options.condition)
  }
  if (options.search) {
    const searchTerm = `%${options.search}%`
    query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm}`)
  }
  // Note: We'll handle zipcode + radius filtering after the query
  // since Supabase doesn't support complex distance calculations

  // Apply sorting
  const sortField = options.sort || 'created_at'
  const sortOrder = options.order || 'desc'
  query = query.order(sortField, { ascending: sortOrder === 'asc' })

  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit)
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data: listings, error } = await query

  if (error) {
    console.error('Error fetching listings:', error)
    throw error
  }

  if (!listings || listings.length === 0) {
    return []
  }

  // The images are now stored in the images JSONB column
  // Convert the JSONB array to the expected format
  let listingsWithImages = listings.map(listing => ({
    ...listing,
    images: (listing.images || [])
      .filter((imageUrl: any) => imageUrl && typeof imageUrl === 'string')
      .map((imageUrl: string, index: number) => ({
        id: `${listing.id}-${index}`,
        listing_id: listing.id,
        filename: imageUrl.split('/').pop() || '',
        original_name: imageUrl.split('/').pop() || '',
        mime_type: 'image/jpeg', // Default, could be improved
        size: 0, // Default, could be improved
        path: imageUrl,
        is_primary: index === 0,
        created_at: listing.created_at
      }))
  }))

  // Handle zipcode + radius filtering
  if (options.zip_code && options.radius) {
    const coordinates = await geocodeZipcode(options.zip_code)
    if (coordinates) {
      listingsWithImages = listingsWithImages.filter(listing => {
        if (!listing.latitude || !listing.longitude) return false
        
        const distance = calculateDistance(
          coordinates.lat, coordinates.lng,
          listing.latitude, listing.longitude
        )
        
        return distance <= options.radius!
      })
    }
  }

  return listingsWithImages
}

export const getFeaturedListings = async (limit: number = 6): Promise<Listing[]> => {
  return getListings({ featured: true, limit, sort: 'created_at', order: 'desc' })
}

export const getNewestListings = async (limit: number = 6): Promise<Listing[]> => {
  return getListings({ limit, sort: 'created_at', order: 'desc' })
}

export const getPopularListings = async (limit: number = 6): Promise<Listing[]> => {
  return getListings({ limit, sort: 'view_count', order: 'desc' })
}

export const getPromotedListings = async (limit: number = 6): Promise<Listing[]> => {
  return getListings({ promoted: true, limit, sort: 'created_at', order: 'desc' })
}

export const getListingById = async (id: string): Promise<Listing | null> => {
  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching listing:', error)
    throw error
  }

  // The images are now stored in the images JSONB column
  // Convert the JSONB array to the expected format
  const images = (listing.images || [])
    .filter((imageUrl: any) => imageUrl && typeof imageUrl === 'string')
    .map((imageUrl: string, index: number) => ({
      id: `${listing.id}-${index}`,
      listing_id: listing.id,
      filename: imageUrl.split('/').pop() || '',
      original_name: imageUrl.split('/').pop() || '',
      mime_type: 'image/jpeg', // Default, could be improved
      size: 0, // Default, could be improved
      path: imageUrl,
      is_primary: index === 0,
      created_at: listing.created_at
    }))

  // Add seller information using contact_email from listing
  const listingWithSeller = {
    ...listing,
    images: images,
    user: {
      id: listing.user_id,
      email: listing.contact_email || '',
      user_metadata: {
        first_name: 'Seller', // We'll enhance this later with real user data
        last_name: ''
      }
    }
  };

  console.log('📧 Listing fetched with seller info:', {
    listingId: listingWithSeller.id,
    sellerEmail: listingWithSeller.user.email,
    sellerId: listingWithSeller.user.id,
    contactEmail: listing.contact_email
  });

  return listingWithSeller;
}

export const createListing = async (listingData: CreateListingData, user?: any): Promise<Listing> => {
  // If no user is passed, try to get it from auth
  let currentUser = user
  if (!currentUser) {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Auth error:', authError)
      throw new Error('Failed to get user authentication')
    }
    currentUser = authUser
  }
  
  if (!currentUser) {
    throw new Error('User must be authenticated to create a listing')
  }

  // Set default expiration date (30 days from now)
  const expiresAt = listingData.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Geocode zipcode to get coordinates
  let coordinates = null
  if (listingData.zip_code) {
    coordinates = await geocodeZipcode(listingData.zip_code)
  }

  const insertData = {
    ...listingData,
    user_id: currentUser.id,
    expires_at: expiresAt,
    listing_type: listingData.listing_type || 'free',
    listing_fee: listingData.listing_fee || 0,
    is_featured: listingData.is_featured || false,
    is_promoted: listingData.is_promoted || false,
    latitude: coordinates?.lat || null,
    longitude: coordinates?.lng || null
  }

  console.log('Inserting listing data:', insertData)

  // Add empty images array to satisfy schema cache
  const insertDataWithImages = {
    ...insertData,
    images: []
  }

  console.log('Inserting listing data with images:', insertDataWithImages)

  const { data, error } = await supabase
    .from('listings')
    .insert([insertDataWithImages])
    .select(`
      id, title, description, price, condition, location, zip_code, latitude, longitude,
      is_active, is_sold, is_featured, is_promoted, promoted_until, expires_at, view_count,
      created_at, updated_at, user_id, category_id, contact_email, contact_phone, images
    `)
    .single()

  if (error) {
    console.error('Error creating listing:', error)
    throw error
  }

  // If images are provided, create them in the images table and update the listing
  if (listingData.images && listingData.images.length > 0) {
    const imageInserts = listingData.images.map((image, index) => ({
      listing_id: data.id,
      filename: image.filename,
      original_name: image.originalName,
      mime_type: image.mimeType,
      size: image.size,
      path: image.imageUrl,
      is_primary: index === 0
    }))

    const { error: imageError } = await supabase
      .from('images')
      .insert(imageInserts)

    if (imageError) {
      console.error('Error creating images:', imageError)
      // Don't throw here, the listing was created successfully
    } else {
      // Update the listing with image URLs in the images JSONB column
      const imageUrls = listingData.images.map(img => img.imageUrl)
      console.log('Updating listing with image URLs:', imageUrls)
      
      const { error: updateError } = await supabase
        .from('listings')
        .update({ images: imageUrls })
        .eq('id', data.id)

      if (updateError) {
        console.error('Error updating listing with image URLs:', updateError)
      } else {
        console.log('Successfully updated listing with image URLs')
      }
    }
  }

  // Usage tracking is now handled by database triggers

  return data
}

export const updateListing = async (id: string, listingData: Partial<CreateListingData>): Promise<Listing> => {
  const { data, error } = await supabase
    .from('listings')
    .update(listingData)
    .eq('id', id)
    .select(`
      *,
      category:categories(*)
    `)
    .single()

  if (error) {
    console.error('Error updating listing:', error)
    throw error
  }

  // If images are provided, update them
  if (listingData.images && listingData.images.length > 0) {
    // First, delete existing images
    await supabase
      .from('images')
      .delete()
      .eq('listing_id', id)

    // Then insert new images
    const imageInserts = listingData.images.map((image, index) => ({
      listing_id: id,
      filename: image.filename,
      original_name: image.originalName,
      mime_type: image.mimeType,
      size: image.size,
      path: image.imageUrl,
      is_primary: index === 0
    }))

    const { error: imageError } = await supabase
      .from('images')
      .insert(imageInserts)

    if (imageError) {
      console.error('Error updating images:', imageError)
    } else {
      // Also update the JSONB images column in the listings table
      const imageUrls = listingData.images.map(img => img.imageUrl)
      const { error: jsonbError } = await supabase
        .from('listings')
        .update({ images: imageUrls })
        .eq('id', id)

      if (jsonbError) {
        console.error('Error updating JSONB images column:', jsonbError)
      }
    }
  }

  return data
}

export const deleteListing = async (id: string): Promise<void> => {
  // First get the listing to know its type before deleting
  const { data: listing, error: fetchError } = await supabase
    .from('listings')
    .select('user_id, listing_type')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching listing for deletion:', fetchError)
    throw fetchError
  }

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting listing:', error)
    throw error
  }

  // Manually update usage tracking after successful listing deletion
  if (listing) {
    await updateUserUsage(listing.user_id, listing.listing_type || 'free', 'decrement')
  }
}

export const incrementListingViews = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('increment_view_count', { listing_id: id })
    
    if (error) {
      console.error('Error incrementing views:', error)
      // Don't throw the error to prevent breaking the page load
    }
  } catch (error) {
    console.error('Error incrementing views:', error)
    // Don't throw the error to prevent breaking the page load
  }
}

// Image upload functions using Supabase Storage
export const uploadImage = async (file: File): Promise<UploadedImage> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`
  const filePath = `listings/${fileName}`

  const { data, error } = await supabase.storage
    .from('images')
    .upload(filePath, file)

  if (error) {
    console.error('Error uploading image:', error)
    throw error
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(filePath)

  return {
    imageUrl: publicUrl,
    filename: fileName,
    originalName: file.name,
    size: file.size,
    mimeType: file.type
  }
}

export const uploadMultipleImages = async (files: File[]): Promise<UploadedImage[]> => {
  const uploadPromises = files.map(file => uploadImage(file))
  return Promise.all(uploadPromises)
}

// Favorites API
export const addToFavorites = async (listingId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to add favorites')
  }

  const { error } = await supabase
    .from('favorites')
    .insert([{
      user_id: user.id,
      listing_id: listingId
    }])

  if (error) {
    console.error('Error adding to favorites:', error)
    throw error
  }
}

export const removeFromFavorites = async (listingId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to remove favorites')
  }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('listing_id', listingId)

  if (error) {
    console.error('Error removing from favorites:', error)
    throw error
  }
}

export const getUserFavorites = async (): Promise<Listing[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to view favorites')
  }

  const { data, error } = await supabase
    .from('favorites')
    .select(`
      listing:listings!inner(
        *,
        category:categories(*)
      )
    `)
    .eq('user_id', user.id)
    .gte('listing.expires_at', new Date().toISOString())

  if (error) {
    console.error('Error fetching favorites:', error)
    throw error
  }

  const listings = data?.map(item => item.listing).filter(Boolean) || []
  
  if (listings.length === 0) {
    return []
  }

  // Fetch images for all favorite listings
  const listingIds = listings.map(listing => listing.id)
  const { data: images, error: imagesError } = await supabase
    .from('images')
    .select('*')
    .in('listing_id', listingIds)

  if (imagesError) {
    console.error('Error fetching images for favorites:', imagesError)
    // Don't throw, just continue without images
  }

  // Combine listings with their images
  return listings.map(listing => ({
    ...listing,
    images: images?.filter(img => img.listing_id === listing.id) || []
  }))
}

// User's own listings
export const getUserListings = async (): Promise<Listing[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('User not authenticated')
  }
  
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user listings:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // Fetch images for all user listings
  const listingIds = data.map(listing => listing.id)
  const { data: images, error: imagesError } = await supabase
    .from('images')
    .select('*')
    .in('listing_id', listingIds)

  if (imagesError) {
    console.error('Error fetching images for user listings:', imagesError)
    // Don't throw, just continue without images
  }

  // Combine listings with their images
  return data.map(listing => ({
    ...listing,
    images: images?.filter(img => img.listing_id === listing.id) || []
  }))
}

// Messaging API
export interface Message {
  id: string
  content: string
  is_read: boolean
  created_at: string
  sender_id: string
  receiver_id: string
  listing_id: string
  message_type?: 'listing' | 'support'
  support_category?: string
  admin_assigned_to?: string
  isIncoming?: boolean
  isOutgoing?: boolean
  sender?: {
    id: string
    email: string
    user_metadata: {
      first_name?: string
      last_name?: string
    }
  }
  receiver?: {
    id: string
    email: string
    user_metadata: {
      first_name?: string
      last_name?: string
    }
  }
  listing?: {
    id: string
    title: string
    price: number
  }
}

export interface Conversation {
  id: string
  listingId: string
  otherUserId: string
  messageType: 'listing' | 'support'
  supportCategory?: string
  listing: {
    id: string
    title: string
    price: number
    images: string[]
    category?: {
      name: string
    }
  } | null
  otherUser: {
    id: string
    name: string
    email: string
  }
  messages: Message[]
  lastMessage: Message
  lastActivity: Date
  unreadCount: number
}

export interface SendMessageData {
  listingId?: string
  content: string
  receiverId?: string
  messageType?: 'listing' | 'support'
  supportCategory?: string
}

export const sendMessage = async (messageData: SendMessageData): Promise<Message> => {
  console.log('🚀 sendMessage called with:', messageData)
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    console.error('Auth error:', authError)
    throw new Error('Authentication error: ' + authError.message)
  }
  
  if (!user) {
    console.error('No user found')
    throw new Error('User must be authenticated to send messages')
  }

  console.log('✅ User authenticated:', user.id)

  // First, get the listing to find the seller
  console.log('🔍 Fetching listing:', messageData.listingId)
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('user_id, title, price')
    .eq('id', messageData.listingId)
    .single()

  if (listingError) {
    console.error('Listing fetch error:', listingError)
    throw new Error('Failed to fetch listing: ' + listingError.message)
  }
  
  if (!listing) {
    console.error('Listing not found')
    throw new Error('Listing not found')
  }

  console.log('✅ Listing found:', listing)

  // Insert message without foreign key relationships
  console.log('💬 Inserting message...')
  
  // Determine the correct receiver:
  // - If receiverId is provided (for replies), use that
  // - Otherwise, use the listing owner (for initial messages)
  const receiverId = messageData.receiverId || listing.user_id
  
  console.log('🎯 Determining message recipient:', {
    providedReceiverId: messageData.receiverId,
    listingOwnerId: listing.user_id,
    finalReceiverId: receiverId,
    currentUserId: user.id
  })
  
  const messagePayload = {
    content: messageData.content,
    sender_id: user.id,
    receiver_id: receiverId,
    listing_id: messageData.listingId
  }
  
  console.log('Message payload:', messagePayload)
  
  const { data: message, error } = await supabase
    .from('messages')
    .insert([messagePayload])
    .select('*')
    .single()

  if (error) {
    console.error('❌ Error sending message:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw new Error('Failed to send message: ' + error.message)
  }

  console.log('✅ Message sent successfully:', message)

  // Determine who should receive the email notification (use the same logic as message recipient)
  const emailRecipientId = receiverId;
  
  // Send real email notification to the message recipient
  try {
    // Import email service dynamically to avoid circular imports
    const { sendMessageNotification } = await import('./emailService');
    
    console.log('📧 Determining email recipient:', {
      providedReceiverId: messageData.receiverId,
      listingOwnerId: listing.user_id,
      finalRecipientId: emailRecipientId
    });
    
    // Get recipient's information
    const { data: allUsers, error: usersError } = await supabase.rpc('get_all_users');
    
    if (!usersError && allUsers) {
      const recipientUser = allUsers.find((u: any) => u.id === emailRecipientId);

      if (recipientUser) {
        const recipientName = recipientUser.raw_user_meta_data?.first_name 
          ? `${recipientUser.raw_user_meta_data.first_name} ${recipientUser.raw_user_meta_data?.last_name || ''}`.trim()
          : 'User';

        const senderName = user.user_metadata?.first_name && user.user_metadata?.last_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user.email || 'Someone';

        console.log('📧 Sending email notification to recipient:', {
          recipientEmail: recipientUser.email,
          recipientName,
          senderName,
          listingTitle: listing.title,
          messagePreview: messageData.content.substring(0, 100)
        });

        await sendMessageNotification(
          recipientUser.email,
          recipientName,
          senderName,
          listing.title,
          messageData.content,
          messageData.listingId
        );
        
        console.log('📧 Email notification sent successfully to recipient');
      } else {
        console.warn('📧 Could not find recipient user data for email notification');
      }
    } else {
      console.warn('📧 Could not fetch users for email notification:', usersError);
    }
  } catch (emailError) {
    console.error('📧 Failed to send email notification:', emailError);
    // Don't block message sending if email fails
  }

  const result = {
    ...message,
    sender: {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata || {}
    },
    receiver: {
      id: receiverId,
      email: 'recipient@example.com', // This will be updated with real data later
      user_metadata: {}
    },
    listing: {
      id: listing.id,
      title: listing.title,
      price: listing.price
    }
  }
  
  console.log('✅ Returning message result:', result)
  return result
}

export const getUserMessages = async (): Promise<Message[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to view messages')
  }

  // Get all messages where user is either sender or receiver (for full conversation threads)
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching messages:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // Get listing info for each message
  const listingIds = [...new Set(data.map(msg => msg.listing_id))]
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, price, category_id')
    .in('id', listingIds)

  // Get category info for listings
  const categoryIds = [...new Set(listings?.map(l => l.category_id).filter(Boolean) || [])]
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .in('id', categoryIds)

  // Combine the data and mark message direction
  return data.map(message => {
    const listing = listings?.find(l => l.id === message.listing_id)
    const category = categories?.find(c => c.id === listing?.category_id)
    const isIncoming = message.receiver_id === user.id
    const isOutgoing = message.sender_id === user.id
    
    return {
      ...message,
      isIncoming,
      isOutgoing,
      sender: {
        id: message.sender_id,
        email: isOutgoing ? (user.email || '') : 'sender@example.com',
        user_metadata: isOutgoing ? (user.user_metadata || {}) : {}
      },
      receiver: {
        id: message.receiver_id,
        email: isIncoming ? (user.email || '') : 'receiver@example.com',
        user_metadata: isIncoming ? (user.user_metadata || {}) : {}
      },
      listing: listing ? {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        category: category ? { name: category.name } : undefined
      } : undefined
    }
  })
}

export const getIncomingMessages = async (): Promise<Message[]> => {
  // Get all messages and filter for incoming ones
  const allMessages = await getUserMessages()
  return allMessages.filter(message => message.isIncoming)
}

export const getSentMessages = async (): Promise<Message[]> => {
  // Get all messages and filter for sent ones
  const allMessages = await getUserMessages()
  return allMessages.filter(message => message.isOutgoing)
}

// New conversation-based API functions
export const getConversations = async (): Promise<Conversation[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to view conversations')
  }

  // Get all messages for the user
  const allMessages = await getUserMessages()
  
  if (!allMessages.length) {
    return []
  }

  // Group messages by conversation (listing + other person)
  const conversationMap = new Map<string, Message[]>()
  
  allMessages.forEach(message => {
    const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id
    const conversationKey = `${message.listing_id}|${otherUserId}`
    
    if (!conversationMap.has(conversationKey)) {
      conversationMap.set(conversationKey, [])
    }
    conversationMap.get(conversationKey)!.push(message)
  })

  // Convert to Conversation objects
  const conversations: Conversation[] = []
  
  for (const [conversationKey, messages] of conversationMap.entries()) {
    const [listingId, otherUserId] = conversationKey.split('|')
    const sortedMessages = messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const lastMessage = sortedMessages[sortedMessages.length - 1]
    
    // Get listing info
    const listing = lastMessage.listing
    if (!listing) continue
    
    // Get other user info
    const otherUser = lastMessage.sender_id === user.id ? lastMessage.receiver : lastMessage.sender
    if (!otherUser) continue
    
    // Count unread messages (messages received by current user that are unread)
    const unreadCount = sortedMessages.filter(msg => 
      msg.receiver_id === user.id && !msg.is_read
    ).length

    const conversation: Conversation = {
      id: conversationKey,
      listingId,
      otherUserId,
      listing: {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        images: [], // Will be populated if needed
        category: listing.category
      },
      otherUser: {
        id: otherUser.id,
        name: otherUser.user_metadata?.first_name 
          ? `${otherUser.user_metadata.first_name} ${otherUser.user_metadata.last_name || ''}`.trim()
          : otherUser.email || 'User',
        email: otherUser.email || ''
      },
      messages: sortedMessages,
      lastMessage,
      lastActivity: new Date(lastMessage.created_at),
      unreadCount
    }
    
    conversations.push(conversation)
  }

  // Sort by last activity (most recent first)
  return conversations.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
}

export const getConversationById = async (conversationId: string): Promise<Conversation | null> => {
  const conversations = await getConversations()
  return conversations.find(conv => conv.id === conversationId) || null
}

export const deleteConversation = async (conversationId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to delete conversations')
  }

  console.log('🗑️ Attempting to delete conversation:', conversationId)
  
  // Parse conversation ID to get listing and other user
  // Handle both old format (UUID-UUID with hyphens) and new format (UUID|UUID)
  let listingId: string, otherUserId: string
  
  if (conversationId.includes('|')) {
    // New format: UUID|UUID
    [listingId, otherUserId] = conversationId.split('|')
  } else {
    // Old format: UUID-UUID (need to parse carefully)
    const parts = conversationId.split('-')
    if (parts.length === 10) {
      // Two complete UUIDs joined by hyphens
      listingId = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}`
      otherUserId = `${parts[5]}-${parts[6]}-${parts[7]}-${parts[8]}-${parts[9]}`
    } else {
      throw new Error('Invalid conversation ID format - unexpected number of parts: ' + parts.length)
    }
  }
  
  console.log('🔍 Parsed conversation ID:', { listingId, otherUserId, currentUserId: user.id })
  
  // Validate that we have valid UUIDs
  if (!listingId || !otherUserId) {
    throw new Error('Invalid conversation ID format')
  }

  // Delete all messages in this conversation involving current user
  // Use a more specific query to avoid UUID parsing issues
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('listing_id', listingId)
    .in('sender_id', [user.id, otherUserId])
    .in('receiver_id', [user.id, otherUserId])

  if (error) {
    console.error('❌ Error deleting conversation:', error)
    throw new Error('Failed to delete conversation: ' + error.message)
  }

  console.log('✅ Conversation deleted successfully:', conversationId)
}

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId)

  if (error) {
    console.error('Error marking message as read:', error)
    throw error
  }
}

export const getUnreadMessageCount = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return 0
  }

  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false)
    .is('deleted_at', null)

  if (error) {
    console.error('Error fetching unread message count:', error)
    return 0
  }

  return count || 0
}

// Deleted Messages API
export const getDeletedMessages = async (): Promise<Message[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to view deleted messages')
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) {
    console.error('Error fetching deleted messages:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // Get listing info for each message
  const listingIds = [...new Set(data.map(msg => msg.listing_id))]
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, price, category_id')
    .in('id', listingIds)

  // Get category info for listings
  const categoryIds = [...new Set(listings?.map(l => l.category_id).filter(Boolean) || [])]
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .in('id', categoryIds)

  // Combine the data
  return data.map(message => {
    const listing = listings?.find(l => l.id === message.listing_id)
    const category = categories?.find(c => c.id === listing?.category_id)
    
    return {
      ...message,
      sender: {
        id: message.sender_id,
        email: 'sender@example.com',
        user_metadata: {}
      },
      receiver: {
        id: message.receiver_id,
        email: 'receiver@example.com',
        user_metadata: {}
      },
      listing: listing ? {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        category: category ? { name: category.name } : undefined
      } : undefined
    }
  })
}

export const deleteMessage = async (messageId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to delete messages')
  }

  // First verify the user owns this message
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('sender_id, receiver_id')
    .eq('id', messageId)
    .single()

  if (fetchError) {
    console.error('Error fetching message for deletion:', fetchError)
    throw new Error('Message not found')
  }

  if (message.sender_id !== user.id && message.receiver_id !== user.id) {
    throw new Error('You can only delete your own messages')
  }

  // Soft delete by setting deleted_at timestamp
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)

  if (error) {
    console.error('Error deleting message:', error)
    throw error
  }
}

export const restoreMessage = async (messageId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to restore messages')
  }

  // First verify the user owns this message
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('sender_id, receiver_id')
    .eq('id', messageId)
    .single()

  if (fetchError) {
    console.error('Error fetching message for restoration:', fetchError)
    throw new Error('Message not found')
  }

  if (message.sender_id !== user.id && message.receiver_id !== user.id) {
    throw new Error('You can only restore your own messages')
  }

  // Restore by setting deleted_at to null
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: null })
    .eq('id', messageId)

  if (error) {
    console.error('Error restoring message:', error)
    throw error
  }
}

export const permanentDeleteMessage = async (messageId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to permanently delete messages')
  }

  // First verify the user owns this message
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('sender_id, receiver_id')
    .eq('id', messageId)
    .single()

  if (fetchError) {
    console.error('Error fetching message for permanent deletion:', fetchError)
    throw new Error('Message not found')
  }

  if (message.sender_id !== user.id && message.receiver_id !== user.id) {
    throw new Error('You can only permanently delete your own messages')
  }

  // Permanently delete the message
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)

  if (error) {
    console.error('Error permanently deleting message:', error)
    throw error
  }
}

// Create listing with images (now just calls createListing)
export const createListingWithImages = async (listingData: CreateListingData, user?: any): Promise<Listing> => {
  return createListing(listingData, user)
}

// Update listing with images (now just calls updateListing)
export const updateListingWithImages = async (listingId: string, listingData: CreateListingData): Promise<Listing> => {
  return updateListing(listingId, listingData)
}

// Manual usage tracking function
export const updateUserUsage = async (userId: string, listingType: string, operation: 'increment' | 'decrement'): Promise<void> => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    const listingTypeVal = listingType || 'free'
    
    console.log(`[updateUserUsage] ${operation} ${listingTypeVal} for user ${userId} in ${currentMonth}`)
    
    // Update user usage tracking
    
    // Get current usage record
    const { data: existingUsage, error: fetchError } = await supabase
      .from('user_listing_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching usage data:', fetchError)
      return
    }

    const increment = operation === 'increment' ? 1 : -1
    const freeIncrement = listingTypeVal === 'free' ? increment : 0
    const featuredIncrement = listingTypeVal === 'featured' ? increment : 0
    const vehicleIncrement = listingTypeVal === 'vehicle' ? increment : 0

    if (existingUsage) {
      // Calculate new values
      const newFreeListings = Math.max(0, existingUsage.free_listings_used + freeIncrement)
      const newFeaturedListings = Math.max(0, existingUsage.featured_listings_used + featuredIncrement)
      const newVehicleListings = Math.max(0, existingUsage.vehicle_listings_used + vehicleIncrement)
      const newTotalListings = Math.max(0, existingUsage.total_listings_created + increment)
      
      // Update existing usage record
      const { error: updateError } = await supabase
        .from('user_listing_usage')
        .update({
          free_listings_used: newFreeListings,
          featured_listings_used: newFeaturedListings,
          vehicle_listings_used: newVehicleListings,
          total_listings_created: newTotalListings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('month_year', currentMonth)

      if (updateError) {
        console.error('Error updating usage:', updateError)
      }
    } else if (operation === 'increment') {
      // Create new usage record (only on increment)
      const { error: insertError } = await supabase
        .from('user_listing_usage')
        .insert({
          user_id: userId,
          month_year: currentMonth,
          free_listings_used: freeIncrement,
          featured_listings_used: featuredIncrement,
          vehicle_listings_used: vehicleIncrement,
          total_listings_created: increment
        })

      if (insertError) {
        console.error('Error creating usage record:', insertError)
      }
    }
  } catch (error) {
    console.error('Error in updateUserUsage:', error)
  }
}

// Admin API functions
export const getUsers = async (): Promise<any[]> => {
  try {
    // Use the database function to get all users
    const { data, error } = await supabase
      .rpc('get_all_users');

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error in getUsers:', error);
    return [];
  }
}

export const updateUserRole = async (userId: string, isAdmin: boolean): Promise<void> => {
  try {
    const { error } = await supabase
      .rpc('update_user_admin_status', {
        target_user_id: userId,
        is_admin: isAdmin
      });

    if (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    throw error;
  }
}

export const isUserAdmin = (user: any): boolean => {
  if (!user) return false;
  
  // Check user_metadata first (newer format)
  if (user.user_metadata?.isAdmin === true) return true;
  if (user.user_metadata?.role === 'admin') return true;
  
  // Check raw_user_meta_data (older format)
  if (user.raw_user_meta_data?.isAdmin === true) return true;
  if (user.raw_user_meta_data?.role === 'admin') return true;
  
  return false;
}

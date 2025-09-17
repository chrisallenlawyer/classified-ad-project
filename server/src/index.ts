import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import emailRoutes from './routes/email';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}, express.static(uploadsDir));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Email routes
app.use('/api/email', emailRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Local Classifieds API is running',
    timestamp: new Date().toISOString()
  });
});

// Basic routes
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Admin category management routes
app.get('/api/admin/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching admin categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || '',
        icon: icon || '📦'
      }
    });

    res.json(category);
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Category name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
});

app.put('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, isActive } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
        icon,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.json(category);
  } catch (error: any) {
    console.error('Error updating category:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Category name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update category' });
    }
  }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has listings
    const listingsCount = await prisma.listing.count({
      where: { categoryId: id }
    });

    if (listingsCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category with ${listingsCount} listings. Please reassign or delete listings first.` 
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Listings routes
app.get('/api/listings', async (req, res) => {
  try {
    console.log('📥 Received request for listings:', req.query);
    console.log('🌐 Request origin:', req.headers.origin);
    console.log('🔗 Request headers:', req.headers);
    
    const { 
      featured, 
      promoted, 
      sort = 'createdAt', 
      limit = 20, 
      category,
      search 
    } = req.query;

    const where: any = {
      isActive: true,
      isSold: false
    };

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (promoted === 'true') {
      where.isPromoted = true;
      where.promotedUntil = {
        gte: new Date()
      };
    }

    if (category) {
      where.categoryId = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const orderBy: any = {};
    if (sort === 'views') {
      orderBy.viewCount = 'desc';
    } else if (sort === 'price') {
      orderBy.price = 'asc';
    } else if (sort === 'createdAt') {
      orderBy.createdAt = 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    console.log('🔍 Database query where clause:', where);
    console.log('📊 Database query orderBy:', orderBy);

    const listings = await prisma.listing.findMany({
      where,
      orderBy,
      take: parseInt(limit as string),
      include: {
        images: true,
        category: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log('✅ Found listings:', listings.length);
    res.json(listings);
  } catch (error: any) {
    console.error('❌ Error fetching listings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch listings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single listing endpoint
app.get('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        images: true,
        category: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    console.log('📝 Listing data being sent:', {
      id: listing.id,
      title: listing.title,
      userId: listing.userId,
      user: listing.user
    });

    res.json(listing);
  } catch (error: any) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// Create listing endpoint
app.post('/api/listings', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      price, 
      condition, 
      location, 
      zip_code, 
      category_id, 
      user_id,
      images = []
    } = req.body;

    console.log('📝 Create listing request:', { title, description, price, condition, location, zip_code, category_id, user_id, imagesCount: images.length });
    console.log('📝 Raw request body:', req.body);

    if (!title || !description || !price || !condition || !location || !zip_code || !category_id || !user_id) {
      console.log('❌ Missing required fields:', { 
        title: !!title, 
        description: !!description, 
        price: !!price, 
        condition: !!condition, 
        location: !!location, 
        zip_code: !!zip_code, 
        category_id: !!category_id, 
        user_id: !!user_id 
      });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // First, ensure the user exists in the local database
    let user = await prisma.user.findUnique({
      where: { id: user_id }
    });

    if (!user) {
      // Create the user if they don't exist
      console.log('📝 Creating new user in local database:', user_id);
      user = await prisma.user.create({
        data: {
          id: user_id,
          email: 'user@example.com', // We'll get this from Supabase later
          firstName: 'User',
          lastName: 'Name',
          password: 'supabase_user' // Placeholder password for Supabase users
        }
      });
    }

    // Check if category exists, create if it doesn't
    let category = await prisma.category.findUnique({
      where: { id: category_id }
    });

    if (!category) {
      console.log('📝 Creating new category in local database:', category_id);
      category = await prisma.category.create({
        data: {
          id: category_id,
          name: 'General', // Default name
          description: 'General category'
        }
      });
    }

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        condition,
        location,
        zipCode: zip_code,
        categoryId: category_id,
        userId: user_id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        images: {
          create: images.map((image: any, index: number) => ({
            filename: image.filename,
            originalName: image.originalName,
            mimeType: image.mimeType,
            size: image.size,
            path: image.imageUrl,
            isPrimary: index === 0 // First image is primary
          }))
        }
      },
      include: {
        images: true,
        category: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log('✅ Listing created successfully:', listing.id);
    res.json(listing);
  } catch (error: any) {
    console.error('Error creating listing:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// Get user listings endpoint
app.get('/api/user/listings', async (req, res) => {
  try {
    // Get user ID from query parameter for now
    const { userId } = req.query;
    
    console.log('📝 User listings request for userId:', userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const listings = await prisma.listing.findMany({
      where: { userId: userId as string },
      include: {
        images: true,
        category: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📝 Found ${listings.length} listings for user ${userId}`);
    res.json(listings);
  } catch (error: any) {
    console.error('Error fetching user listings:', error);
    res.status(500).json({ error: 'Failed to fetch user listings' });
  }
});

// Update listing endpoint
app.put('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      price, 
      condition, 
      location, 
      zip_code, 
      category_id,
      images = []
    } = req.body;

    console.log('📝 Update listing request:', { id, title, description, price, condition, location, zip_code, category_id, imagesCount: images.length });
    console.log('📝 Raw request body:', req.body);

    if (!title || !description || !price || !condition || !location || !zip_code || !category_id || 
        title.trim() === '' || description.trim() === '' || location.trim() === '' || 
        zip_code.trim() === '' || category_id.trim() === '') {
      console.log('❌ Missing required fields:', { 
        title: title, 
        description: description, 
        price: price, 
        condition: condition, 
        location: location, 
        zip_code: zip_code, 
        category_id: category_id 
      });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if listing exists
    const existingListing = await prisma.listing.findUnique({
      where: { id }
    });

    if (!existingListing) {
      console.log('❌ Listing not found:', id);
      return res.status(404).json({ error: 'Listing not found' });
    }

    console.log('✅ Listing found:', existingListing.title);

    // First, delete existing images
    console.log('🗑️ Deleting existing images for listing:', id);
    await prisma.image.deleteMany({
      where: { listingId: id }
    });

    // Update the listing with new images
    console.log('📝 Updating listing in database...');
    console.log('🖼️ Images to create:', images.map((img: any) => ({ filename: img.filename, imageUrl: img.imageUrl })));
    
    const listing = await prisma.listing.update({
      where: { id },
      data: {
        title,
        description,
        price: parseFloat(price),
        condition,
        location,
        zipCode: zip_code,
        categoryId: category_id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        images: {
          create: images.map((image: any, index: number) => {
            console.log(`Creating image ${index + 1}:`, { filename: image.filename, imageUrl: image.imageUrl });
            return {
              filename: image.filename,
              originalName: image.originalName,
              mimeType: image.mimeType,
              size: image.size,
              path: image.imageUrl,
              isPrimary: index === 0 // First image is primary
            };
          })
        }
      },
      include: {
        images: true,
        category: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log('✅ Listing updated successfully:', listing.id);
    res.json(listing);
  } catch (error: any) {
    console.error('❌ Error updating listing:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    res.status(500).json({ error: 'Failed to update listing', details: error.message });
  }
});

// Increment listing view count
app.post('/api/listings/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Increment the view count
    const updatedListing = await prisma.listing.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1
        }
      },
      select: {
        id: true,
        viewCount: true
      }
    });

    res.json({ 
      success: true, 
      viewCount: updatedListing.viewCount 
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    res.status(500).json({ error: 'Failed to increment view count' });
  }
});

// Image upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Multiple image upload endpoint
app.post('/api/upload-multiple', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const files = req.files as Express.Multer.File[];
    const uploadedImages = files.map(file => ({
      imageUrl: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    }));
    
    res.json({
      success: true,
      images: uploadedImages
    });
  } catch (error: any) {
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

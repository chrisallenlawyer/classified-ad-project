# Local Classifieds Platform

A full-stack classified ad platform for the Tuscaloosa/Birmingham Alabama area, built with modern cloud technologies.

## Current Status ✅

**WORKING FEATURES:**
- ✅ Database: Supabase PostgreSQL with Row Level Security
- ✅ Backend: Supabase API with auto-generated endpoints
- ✅ Frontend: React app on port 5173
- ✅ Authentication: Supabase Auth with JWT
- ✅ File Storage: Supabase Storage with global CDN
- ✅ Real-time: Ready for live updates
- ✅ **Subscription System**: Complete monetization platform
- ✅ **Payment Processing**: Stripe integration (demo mode)
- ✅ **Usage Tracking**: Real-time limits enforcement
- ✅ **Search Functionality**: Full-text search with filters
- ✅ **Vehicle Categories**: Specialized vehicle listing system
- ✅ **Admin Dashboard**: Complete management interface

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Supabase (PostgreSQL + API + Auth + Storage)
- **Database**: Supabase PostgreSQL with RLS
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime (ready to implement)

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # Supabase API services
│   │   ├── contexts/      # React contexts (Auth)
│   │   └── lib/           # Supabase configuration
├── supabase-migration.sql # Database schema for Supabase
└── SUPABASE_MIGRATION_GUIDE.md # Migration instructions
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- Supabase account (free)
- npm

### Installation

1. **Follow the migration guide:**
   - See `SUPABASE_MIGRATION_GUIDE.md` for detailed instructions
   - Create a Supabase project
   - Run the database migration
   - Set up environment variables

2. **Install dependencies:**
```bash
npm run install:all
```

3. **Start development:**
```bash
npm run dev
```

### URLs
- **Frontend**: http://localhost:5173/
- **Backend**: Supabase (cloud)
- **Database**: Supabase Dashboard
- **Storage**: Supabase Storage

### Environment Variables
Create `client/.env` with your Supabase credentials:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Recently Implemented Features 🎉

### **Subscription & Monetization System**
- **4 Subscription Tiers**: Free, Basic ($9.99), Professional ($19.99), Enterprise ($49.99)
- **Usage Tracking**: Real-time monitoring of listing limits
- **Payment Integration**: Stripe Elements with secure card processing
- **Flexible Pricing**: Featured listings ($5), Vehicle listings ($20), Combined fees ($25)
- **Subscription Dashboard**: Complete user management interface

### **Advanced Search & Discovery**
- **Full-Text Search**: Search across titles, descriptions, and locations
- **Category Search**: Quick category-based filtering
- **Search Results Page**: Dedicated search interface with filters
- **Smart Filtering**: Client-side category name matching

### **Vehicle Category System**
- **Specialized Categories**: Mark categories as vehicle-specific
- **Automatic Fee Charging**: Vehicle listings require payment
- **Combined Pricing**: Vehicle + Featured listing support
- **Visual Indicators**: Clear vehicle category markers

### **Enhanced Admin Features**
- **✅ Collapsible Sections**: Clean, organized admin interface
- **✅ User Management**: View, edit, and manage user accounts with real-time data
- **✅ Admin Role Control**: Secure admin access with role-based permissions
- **✅ Listing Management**: Approve, edit, and remove listings
- **✅ Category Management**: Create and configure categories
- **✅ Pricing Configuration**: Dynamic pricing management
- **✅ Security System**: Comprehensive access control and user verification

## Next Features to Implement

1. **Messaging System**
   - Anonymous messaging between users
   - Real-time chat functionality
   - Message history and notifications

2. **Rating & Review System**
   - User reviews and ratings
   - Trust indicators and reputation
   - Review moderation tools

3. **Advanced Analytics**
   - Revenue tracking dashboard
   - User engagement metrics
   - Listing performance analytics

4. **Email Notifications**
   - Subscription confirmations
   - Payment receipts
   - Usage limit warnings

5. **Mobile Optimization**
   - Responsive design improvements
   - Mobile-specific features
   - Progressive Web App (PWA) support

## Development Notes

- **Port Conflicts**: If ports 3002 or 5174 are in use, change them in:
  - `server/.env` (PORT=3002)
  - `client/src/services/api.ts` (API_BASE_URL)
  - `client/vite.config.ts` (proxy target)

- **Database Issues**: If you get permission errors, run:
```bash
/opt/homebrew/Cellar/postgresql@15/15.14/bin/psql postgres
ALTER DATABASE local_classifieds OWNER TO classifieds_user;
\q
```

## File Locations

- **Server entry**: `server/src/index.ts`
- **Database schema**: `server/prisma/schema.prisma`
- **Frontend entry**: `client/src/main.tsx`
- **Main app**: `client/src/App.tsx`
- **API service**: `client/src/services/api.ts`
- **Environment**: `server/.env`

## Success! 🎉

You've successfully built a working full-stack web application! This is a significant achievement that demonstrates:
- Database setup and management
- Backend API development
- Frontend React development
- Full-stack integration
- Problem-solving skills

Keep up the great work! 🚀

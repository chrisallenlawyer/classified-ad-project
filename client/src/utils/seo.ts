// SEO utilities for the classified ad platform
export interface SEOData {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  category?: string;
  price?: number;
  currency?: string;
  availability?: 'in stock' | 'out of stock' | 'preorder';
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  url?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: {
    '@type': string;
    name: string;
  };
  publisher?: {
    '@type': string;
    name: string;
    logo?: {
      '@type': string;
      url: string;
    };
  };
  offers?: {
    '@type': string;
    price: number;
    priceCurrency: string;
    availability: string;
  };
  category?: string;
  condition?: string;
  brand?: string;
  model?: string;
  mileage?: number;
  year?: number;
}

// Default SEO data for the platform
export const defaultSEO: SEOData = {
  title: 'Classified Ads - Buy, Sell, Trade Anything',
  description: 'Find great deals on classified ads. Buy, sell, and trade anything from cars to electronics, furniture to real estate. Safe, secure, and easy to use.',
  keywords: 'classified ads, buy sell, marketplace, local ads, online classifieds, trading, second hand, used items',
  image: '/og-image.jpg',
  url: 'https://your-domain.com',
  type: 'website'
};

// Generate page title
export const generateTitle = (pageTitle: string, siteName: string = 'Classified Ads'): string => {
  if (pageTitle === siteName) return pageTitle;
  return `${pageTitle} | ${siteName}`;
};

// Generate meta description
export const generateDescription = (description: string, maxLength: number = 160): string => {
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength - 3) + '...';
};

// Generate keywords from listing data
export const generateKeywords = (listing: any): string => {
  const keywords = [];
  
  if (listing.title) keywords.push(listing.title.toLowerCase());
  if (listing.category) keywords.push(listing.category.toLowerCase());
  if (listing.location) keywords.push(listing.location.toLowerCase());
  if (listing.condition) keywords.push(listing.condition.toLowerCase());
  if (listing.brand) keywords.push(listing.brand.toLowerCase());
  if (listing.model) keywords.push(listing.model.toLowerCase());
  
  // Add common classified ad keywords
  keywords.push('classified ads', 'buy sell', 'marketplace', 'local ads');
  
  return [...new Set(keywords)].join(', ');
};

// Generate structured data for listings
export const generateListingStructuredData = (listing: any): StructuredData => {
  const baseUrl = 'https://your-domain.com';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    url: `${baseUrl}/listing/${listing.id}`,
    image: listing.images?.[0] || `${baseUrl}/default-listing.jpg`,
    datePublished: listing.created_at,
    dateModified: listing.updated_at,
    author: {
      '@type': 'Person',
      name: listing.seller_name || 'Anonymous'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Classified Ads Platform',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`
      }
    },
    offers: {
      '@type': 'Offer',
      price: listing.price || 0,
      priceCurrency: 'USD',
      availability: listing.is_available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    },
    category: listing.category,
    condition: listing.condition,
    brand: listing.brand,
    model: listing.model,
    mileage: listing.mileage,
    year: listing.year
  };
};

// Generate structured data for the website
export const generateWebsiteStructuredData = (): StructuredData => {
  const baseUrl = 'https://your-domain.com';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Classified Ads Platform',
    description: 'Find great deals on classified ads. Buy, sell, and trade anything from cars to electronics, furniture to real estate.',
    url: baseUrl,
    image: `${baseUrl}/og-image.jpg`,
    publisher: {
      '@type': 'Organization',
      name: 'Classified Ads Platform',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`
      }
    }
  };
};

// Generate breadcrumb structured data
export const generateBreadcrumbStructuredData = (breadcrumbs: Array<{name: string, url: string}>): StructuredData => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    name: 'Breadcrumb',
    description: 'Navigation breadcrumb',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url
    }))
  };
};

// Generate FAQ structured data
export const generateFAQStructuredData = (faqs: Array<{question: string, answer: string}>): StructuredData => {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: 'Frequently Asked Questions',
    description: 'Common questions about our classified ads platform',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
};

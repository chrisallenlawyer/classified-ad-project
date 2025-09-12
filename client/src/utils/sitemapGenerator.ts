// Dynamic sitemap generator for SEO
import { supabase } from '../lib/supabase';

export interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  images?: Array<{
    loc: string;
    title?: string;
    caption?: string;
  }>;
}

export const generateSitemap = async (): Promise<string> => {
  const baseUrl = 'https://your-domain.com'; // Replace with your actual domain
  const currentDate = new Date().toISOString().split('T')[0];
  
  const urls: SitemapUrl[] = [
    // Static pages
    {
      loc: `${baseUrl}/`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: 1.0
    },
    {
      loc: `${baseUrl}/search`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: 0.8
    },
    {
      loc: `${baseUrl}/search?featured=true`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: 0.6
    }
  ];

  try {
    // Get categories for category pages
    const { data: categories } = await supabase
      .from('categories')
      .select('name, slug')
      .eq('is_active', true);

    if (categories) {
      categories.forEach(category => {
        urls.push({
          loc: `${baseUrl}/search?category=${category.slug || category.name.toLowerCase()}`,
          lastmod: currentDate,
          changefreq: 'daily',
          priority: 0.7
        });
      });
    }

    // Get active listings
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, updated_at, images')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1000); // Limit to prevent huge sitemaps

    if (listings) {
      listings.forEach(listing => {
        const listingUrl: SitemapUrl = {
          loc: `${baseUrl}/listing/${listing.id}`,
          lastmod: new Date(listing.updated_at).toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: 0.5
        };

        // Add images if available
        if (listing.images && listing.images.length > 0) {
          listingUrl.images = listing.images.map((image: any) => ({
            loc: image.path || image.url,
            title: listing.title,
            caption: listing.title
          }));
        }

        urls.push(listingUrl);
      });
    }

    // Generate XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
    xml += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${url.loc}</loc>\n`;
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;
      
      if (url.images && url.images.length > 0) {
        url.images.forEach(image => {
          xml += '    <image:image>\n';
          xml += `      <image:loc>${image.loc}</image:loc>\n`;
          if (image.title) {
            xml += `      <image:title>${image.title}</image:title>\n`;
          }
          if (image.caption) {
            xml += `      <image:caption>${image.caption}</image:caption>\n`;
          }
          xml += '    </image:image>\n';
        });
      }
      
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return generateStaticSitemap();
  }
};

// Fallback static sitemap
const generateStaticSitemap = (): string => {
  const baseUrl = 'https://your-domain.com';
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
};

// API endpoint to serve dynamic sitemap
export const serveSitemap = async (req: any, res: any) => {
  try {
    const sitemap = await generateSitemap();
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error serving sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
};

import React from 'react';

interface SEOImageProps {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

const SEOImage: React.FC<SEOImageProps> = ({
  src,
  alt,
  title,
  width,
  height,
  className = '',
  loading = 'lazy',
  priority = false,
  sizes,
  quality = 75
}) => {
  // Generate optimized image URL (you can integrate with image optimization service)
  const getOptimizedImageUrl = (originalSrc: string, width?: number, height?: number, quality?: number) => {
    // For now, return original src
    // In production, you might want to use a service like Cloudinary, ImageKit, or Next.js Image Optimization
    return originalSrc;
  };

  const optimizedSrc = getOptimizedImageUrl(src, width, height, quality);

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      title={title || alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : loading}
      sizes={sizes}
      decoding="async"
      // Add structured data attributes for better SEO
      itemProp="image"
      // Add error handling
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = '/default-listing.jpg';
        target.alt = 'Image not available';
      }}
    />
  );
};

export default SEOImage;

import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin } from 'lucide-react';
import { useAdTracking } from '@/hooks/use-ad-tracking';

interface SponsoredPostProps {
  ad: {
    id: string;
    businessName: string;
    title: string;
    content: string;
    imageUrl?: string;
    websiteUrl?: string;
    address: string;
    suburb: string;
    cta: string; // Call to action text
  };
  onAdClick: (adId: string) => void;
}

export function SponsoredPost({ ad, onAdClick }: SponsoredPostProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { observeAd, unobserveAd } = useAdTracking();

  useEffect(() => {
    const element = elementRef.current;
    if (element) {
      observeAd(element);
      return () => unobserveAd(element);
    }
  }, [observeAd, unobserveAd]);

  const handleClick = () => {
    // Track click separately
    fetch('/api/ads/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adId: ad.id,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);

    onAdClick(ad.id);
    if (ad.websiteUrl) {
      window.open(ad.websiteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card 
      ref={elementRef}
      data-ad-id={ad.id}
      className="mb-4 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white"
      data-testid={`sponsored-post-${ad.id}`}
    >
      <CardContent className="p-4">
        {/* Sponsored Badge */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <span className="text-xs font-medium">Sponsored</span>
          </Badge>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-3 h-3 mr-1" />
            {ad.suburb}
          </div>
        </div>

        {/* Business Content */}
        <div className="space-y-3">
          {/* Business Name with Logo */}
          <div className="flex items-center gap-3">
            {ad.imageUrl && (
              <img 
                src={ad.imageUrl} 
                alt="Business Logo" 
                className="w-8 h-8 rounded object-cover"
              />
            )}
            <h3 className="font-semibold text-gray-900">{ad.businessName}</h3>
          </div>
          <h4 className="font-medium text-gray-800">{ad.title}</h4>
          
          <p className="text-gray-700 leading-relaxed">{ad.content}</p>
          
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <MapPin className="w-4 h-4 inline mr-1" />
              {ad.address}
            </div>
            
            <Button 
              onClick={handleClick}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              data-testid={`ad-cta-${ad.id}`}
            >
              {ad.cta}
              <ExternalLink className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
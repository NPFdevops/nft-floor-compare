import React from 'react';
import { usePostHog } from 'posthog-js/react';
import { generateLegacyCollectionImage } from '../data/collections';
import { safeCapture, getDeviceType } from '../utils/analytics';

// Helper function to generate NFTPriceFloor S3 CDN image URL
const generateCollectionImage = (slug) => {
  return `https://s3.amazonaws.com/cdn.nftpricefloor/projects/v1/${slug}.png?version=6`;
};

const ComparisonExamples = ({ onSelectComparison, isMobile, onOpenSearch }) => {
  const [activeExample, setActiveExample] = React.useState(null);
  const posthog = usePostHog();
  
  // Popular NFT collection comparisons using NFTPriceFloor slugs and S3 CDN images
  const examples = [
    {
      collection1: { slug: 'bored-ape-yacht-club', name: 'Bored Ape Yacht Club', image: generateCollectionImage('bored-ape-yacht-club') },
      collection2: { slug: 'pudgy-penguins', name: 'Pudgy Penguins', image: generateCollectionImage('pudgy-penguins') }
    },
    {
      collection1: { slug: 'cryptopunks', name: 'CryptoPunks', image: generateCollectionImage('cryptopunks') },
      collection2: { slug: 'bored-ape-yacht-club', name: 'Bored Ape Yacht Club', image: generateCollectionImage('bored-ape-yacht-club') }
    },
    {
      collection1: { slug: 'azuki', name: 'Azuki', image: generateCollectionImage('azuki') },
      collection2: { slug: 'pudgy-penguins', name: 'Pudgy Penguins', image: generateCollectionImage('pudgy-penguins') }
    },
    {
      collection1: { slug: 'mutant-ape-yacht-club', name: 'Mutant Ape Yacht Club', image: generateCollectionImage('mutant-ape-yacht-club') },
      collection2: { slug: 'bored-ape-yacht-club', name: 'Bored Ape Yacht Club', image: generateCollectionImage('bored-ape-yacht-club') }
    },
    {
      collection1: { slug: 'doodles', name: 'Doodles', image: generateCollectionImage('doodles') },
      collection2: { slug: 'pudgy-penguins', name: 'Pudgy Penguins', image: generateCollectionImage('pudgy-penguins') }
    },
    {
      collection1: { slug: 'milady', name: 'Milady Maker', image: generateCollectionImage('milady') },
      collection2: { slug: 'azuki', name: 'Azuki', image: generateCollectionImage('azuki') }
    },
    {
      collection1: { slug: 'clonex', name: 'CloneX', image: generateCollectionImage('clonex') },
      collection2: { slug: 'azuki', name: 'Azuki', image: generateCollectionImage('azuki') }
    },
    {
      collection1: { slug: 'proof-moonbirds', name: 'Moonbirds', image: generateCollectionImage('proof-moonbirds') },
      collection2: { slug: 'pudgy-penguins', name: 'Pudgy Penguins', image: generateCollectionImage('pudgy-penguins') }
    }
  ];

  const handleClick = (example, index) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50); // Haptic feedback
    }
    
    // Track example comparison click
    safeCapture(posthog, 'example_comparison_clicked', {
      example_id: index,
      collection1_slug: example.collection1.slug,
      collection2_slug: example.collection2.slug,
      collection1_name: example.collection1.name,
      collection2_name: example.collection2.name,
      device_type: getDeviceType()
    });
    
    setActiveExample(index);
    onSelectComparison(example.collection1.slug, example.collection2.slug);
  };

  const handleCustomClick = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50); // Haptic feedback
    }
    
    // Track custom comparison click
    safeCapture(posthog, 'custom_comparison_clicked', {
      device_type: getDeviceType()
    });
    
    if (onOpenSearch) {
      onOpenSearch();
    }
  };

  /**
   * Handle image loading errors with graceful fallbacks
   * @param {Event} event - Image error event
   * @param {string} slug - Collection slug for fallback generation
   */
  const handleImageError = (event, slug) => {
    const img = event.target;
    const currentSrc = img.src;
    
    // Check if we're already showing a fallback to prevent infinite loops
    if (currentSrc.includes('api.dicebear.com') || currentSrc.includes('ui-avatars.com')) {
      return;
    }
    
    // If NFTPriceFloor CDN failed, try legacy high-quality image
    if (currentSrc.includes('cdn.nftpricefloor')) {
      console.log(`🖼️ NFTPriceFloor CDN image failed for ${slug}, trying legacy fallback`);
      img.src = generateLegacyCollectionImage(slug);
      return;
    }
    
    // If legacy image failed, use dicebear as final fallback
    console.log(`🖼️ Legacy image failed for ${slug}, using dicebear fallback`);
    img.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${slug}`;
  };

  if (isMobile) {
    // Mobile: Show only images, no text, 4 examples in 2 rows
    return (
      <div className="mb-6 px-2">
        <div className="grid grid-cols-2 gap-3">
          {examples.slice(0, 4).map((example, index) => (
            <button
              key={index}
              onClick={() => handleClick(example, index)}
              className="group relative border-2 border-black rounded-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E3579A] active:scale-95 p-3"
              style={{
                backgroundColor: activeExample === index ? '#E3579A' : '#f5f5f5'
              }}
              title={`${example.collection1.name} vs ${example.collection2.name}`}
            >
              <div className="flex items-center justify-center gap-2">
                {/* Collection 1 Image */}
                <div className="relative w-12 h-12 border-2 border-black rounded-none overflow-hidden flex-shrink-0 bg-white transform group-hover:scale-110 group-hover:rotate-[-5deg] transition-all duration-200">
                  <img
                    src={example.collection1.image}
                    alt={example.collection1.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => handleImageError(e, example.collection1.slug)}
                  />
                </div>

                {/* VS Badge */}
                <div className="relative z-10">
                  <span
                    className="inline-block text-xs font-black border-2 border-black rounded-none transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-200 px-2 py-1"
                    style={{
                      backgroundColor: activeExample === index ? 'white' : '#E3579A',
                      color: activeExample === index ? '#E3579A' : 'white'
                    }}
                  >
                    VS
                  </span>
                </div>

                {/* Collection 2 Image */}
                <div className="relative w-12 h-12 border-2 border-black rounded-none overflow-hidden flex-shrink-0 bg-white transform group-hover:scale-110 group-hover:rotate-[5deg] transition-all duration-200">
                  <img
                    src={example.collection2.image}
                    alt={example.collection2.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => handleImageError(e, example.collection2.slug)}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop: Show 8 examples with images only, 4 per row on desktop
  return (
    <div className="mb-6">
      <div className="grid grid-cols-4 gap-3">
        {examples.slice(0, 7).map((example, index) => (
            <button
            key={index}
            onClick={() => handleClick(example, index)}
            className="group relative border-2 border-black rounded-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E3579A] active:scale-95 p-3"
            style={{
              backgroundColor: activeExample === index ? '#E3579A' : '#f5f5f5'
            }}
            title={`${example.collection1.name} vs ${example.collection2.name}`}
          >
            <div className="flex items-center justify-center gap-3">
              {/* Collection 1 */}
              <div className="relative w-14 h-14 border-2 border-black rounded-none overflow-hidden flex-shrink-0 bg-white transform group-hover:scale-110 group-hover:rotate-[-3deg] transition-all duration-200">
                <img
                  src={example.collection1.image}
                  alt={example.collection1.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => handleImageError(e, example.collection1.slug)}
                />
              </div>

              {/* VS Badge */}
              <div className="relative z-10 flex-shrink-0">
                <span
                  className="inline-block text-sm font-black border-2 border-black rounded-none transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-200 px-3 py-1.5"
                  style={{
                    backgroundColor: activeExample === index ? 'white' : '#E3579A',
                    color: activeExample === index ? '#E3579A' : 'white'
                  }}
                >
                  VS
                </span>
              </div>

              {/* Collection 2 */}
              <div className="relative w-14 h-14 border-2 border-black rounded-none overflow-hidden flex-shrink-0 bg-white transform group-hover:scale-110 group-hover:rotate-[3deg] transition-all duration-200">
                <img
                  src={example.collection2.image}
                  alt={example.collection2.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => handleImageError(e, example.collection2.slug)}
                />
              </div>
            </div>
          </button>
        ))}
        
        {/* Custom Card - Opens Search */}
        <button
          onClick={handleCustomClick}
          className="group relative border-2 border-black rounded-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E3579A] active:scale-95 p-3"
          style={{
            backgroundColor: '#FFD93D'
          }}
          title="Choose your own collections"
        >
          <div className="flex items-center justify-center gap-3">
            {/* Collection 1 - Empty */}
            <div className="relative w-14 h-14 border-2 border-black rounded-none overflow-hidden flex-shrink-0 flex items-center justify-center bg-white transform group-hover:scale-110 group-hover:rotate-[-3deg] transition-all duration-200">
              <span className="text-3xl font-bold text-gray-400 group-hover:scale-125 transition-transform duration-200">?</span>
            </div>

            {/* VS Badge */}
            <div className="relative z-10 flex-shrink-0">
              <span className="inline-block text-sm font-black text-white bg-[#E3579A] px-3 py-1.5 border-2 border-black rounded-none transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-200">
                VS
              </span>
            </div>

            {/* Collection 2 - Empty */}
            <div className="relative w-14 h-14 border-2 border-black rounded-none overflow-hidden flex-shrink-0 flex items-center justify-center bg-white transform group-hover:scale-110 group-hover:rotate-[3deg] transition-all duration-200">
              <span className="text-3xl font-bold text-gray-400 group-hover:scale-125 transition-transform duration-200">?</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ComparisonExamples;

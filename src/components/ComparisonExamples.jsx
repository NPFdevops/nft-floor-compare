import React from 'react';
import { generateLegacyCollectionImage } from '../data/collections';

// Helper function to generate NFTPriceFloor S3 CDN image URL
const generateCollectionImage = (slug) => {
  return `https://s3.amazonaws.com/cdn.nftpricefloor/projects/v1/${slug}.png?version=6`;
};

const ComparisonExamples = ({ onSelectComparison, isMobile }) => {
  const [activeExample, setActiveExample] = React.useState(null);
  
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
    setActiveExample(index);
    onSelectComparison(example.collection1.slug, example.collection2.slug);
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
              className={`group relative border-2 border-black rounded-none hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] active:scale-95 p-3 ${
                activeExample === index ? 'bg-[#E3579A]' : 'bg-white'
              }`}
              title={`${example.collection1.name} vs ${example.collection2.name}`}
            >
              <div className="flex items-center justify-center gap-2">
                {/* Collection 1 Image */}
                <div className="w-12 h-12 border-2 border-black overflow-hidden bg-gray-100 flex-shrink-0">
                  <img 
                    src={example.collection1.image} 
                    alt={example.collection1.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => handleImageError(e, example.collection1.slug)}
                  />
                </div>
                
                {/* VS Text */}
                <span className={`text-xs font-bold ${
                  activeExample === index ? 'text-white bg-black px-2 py-1' : 'text-white bg-[#E3579A] px-2 py-1'
                }`}>VS</span>
                
                {/* Collection 2 Image */}
                <div className="w-12 h-12 border-2 border-black overflow-hidden bg-gray-100 flex-shrink-0">
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

  // Desktop: Show 8 examples with images and names in a 4-column grid
  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {examples.map((example, index) => (
          <button
            key={index}
            onClick={() => handleClick(example, index)}
            className={`group relative border-2 border-black rounded-none hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] active:scale-95 p-4 ${
              activeExample === index ? 'bg-[#E3579A]' : 'bg-white'
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                {/* Collection 1 */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-10 h-10 border-2 border-black overflow-hidden bg-gray-100 flex-shrink-0">
                    <img 
                      src={example.collection1.image} 
                      alt={example.collection1.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => handleImageError(e, example.collection1.slug)}
                    />
                  </div>
                  <span className={`text-xs font-medium truncate ${
                    activeExample === index ? 'text-white' : 'text-gray-900'
                  }`}>
                    {example.collection1.name}
                  </span>
                </div>
                
                {/* VS Badge */}
                <div className={`flex-shrink-0 text-white px-2 py-1 text-[10px] font-bold ${
                  activeExample === index ? 'bg-black' : 'bg-[#E3579A]'
                }`}>
                  VS
                </div>
                
                {/* Collection 2 */}
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-row-reverse">
                  <div className="w-10 h-10 border-2 border-black overflow-hidden bg-gray-100 flex-shrink-0">
                    <img 
                      src={example.collection2.image} 
                      alt={example.collection2.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => handleImageError(e, example.collection2.slug)}
                    />
                  </div>
                  <span className={`text-xs font-medium truncate text-right ${
                    activeExample === index ? 'text-white' : 'text-gray-900'
                  }`}>
                    {example.collection2.name}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ComparisonExamples;

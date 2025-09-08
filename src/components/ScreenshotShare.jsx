import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { createShareableUrl, generateShareTitle } from '../utils/urlUtils';

const ScreenshotShare = ({ targetId, collection1, collection2, timeframe, layout }) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const captureScreenshot = async () => {
    const targetElement = document.getElementById(targetId);
    
    if (!targetElement) {
      alert('No charts to capture. Please load some collection data first.');
      return;
    }

    setIsCapturing(true);

    try {
      const canvas = await html2canvas(targetElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        
        // Trigger download with descriptive filename
        const shareTitle = generateShareTitle({ collection1, collection2, timeframe });
        const sanitizedTitle = shareTitle.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase();
        const filename = `${sanitizedTitle}-${new Date().toISOString().slice(0, 10)}.png`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }, 'image/png');

    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Failed to capture screenshot. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };


  const shareUrl = () => {
    const shareTitle = generateShareTitle({ collection1, collection2, timeframe });
    const shareUrl = createShareableUrl({ collection1, collection2, timeframe, layout });
    const shareText = `${shareTitle} - View interactive comparison: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      }).catch((error) => {
        console.error('Error sharing URL:', error);
        copyToClipboard();
      });
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    const shareTitle = generateShareTitle({ collection1, collection2, timeframe });
    const shareUrl = createShareableUrl({ collection1, collection2, timeframe, layout });
    const text = `${shareTitle} - View interactive comparison: ${shareUrl}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Comparison link copied to clipboard!');
      }).catch(() => {
        alert('Unable to copy to clipboard.');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Comparison link copied to clipboard!');
      } catch (err) {
        alert('Unable to copy to clipboard.');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <button 
        onClick={captureScreenshot}
        disabled={isCapturing}
        className="flex items-center justify-center rounded-none h-10 border-2 border-black bg-white text-black gap-2 text-sm font-bold leading-normal min-w-0 px-3 sm:px-4 hover:bg-gray-100 transition-colors shadow-[4px_4px_0px_#000000]"
        title="Capture and download screenshot"
      >
        {isCapturing ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
            <span className="truncate hidden sm:inline">Capturing...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">screenshot</span>
            <span className="truncate hidden sm:inline">Screenshot</span>
          </>
        )}
      </button>

      <button 
        onClick={shareUrl}
        className="flex items-center justify-center rounded-none h-10 border-2 border-black bg-blue-500 text-white gap-2 text-sm font-bold leading-normal min-w-0 px-3 sm:px-4 hover:bg-blue-600 transition-colors shadow-[4px_4px_0px_#000000]"
        title="Share comparison URL"
      >
        <span className="material-symbols-outlined">link</span>
        <span className="truncate hidden sm:inline">Share URL</span>
      </button>
    </div>
  );
};

export default ScreenshotShare;

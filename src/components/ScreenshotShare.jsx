import React, { useState } from 'react';
import html2canvas from 'html2canvas';

const ScreenshotShare = ({ targetId }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState(null);

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
        setLastScreenshot(url);
        
        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = `nft-floor-comparison-${new Date().toISOString().slice(0, 10)}.png`;
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

  const shareScreenshot = async () => {
    if (!lastScreenshot) {
      alert('Please capture a screenshot first.');
      return;
    }

    if (navigator.share) {
      try {
        // Convert blob URL back to blob for sharing
        const response = await fetch(lastScreenshot);
        const blob = await response.blob();
        const file = new File([blob], 'nft-floor-comparison.png', { type: 'image/png' });

        await navigator.share({
          title: 'NFT Floor Price Comparison',
          text: 'Check out this NFT floor price comparison!',
          files: [file],
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to copying link
        copyToClipboard();
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    const text = 'Check out this NFT floor price comparison created with NFT Floor Compare!';
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Comparison text copied to clipboard!');
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
        alert('Comparison text copied to clipboard!');
      } catch (err) {
        alert('Unable to copy to clipboard.');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="screenshot-share">
      <div className="screenshot-buttons">
        <button
          onClick={captureScreenshot}
          disabled={isCapturing}
          className="capture-button"
          title="Capture and download screenshot"
        >
          {isCapturing ? (
            <>
              <div className="button-spinner"></div>
              <span>Capturing...</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4z"/>
                <path d="M6.5 7.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zM8 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                <path d="M3 12l2.5-3.5L8 11l2.5-3.5L13 12H3z"/>
              </svg>
              <span>Screenshot</span>
            </>
          )}
        </button>

        {lastScreenshot && (
          <button
            onClick={shareScreenshot}
            className="share-button"
            title="Share screenshot"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/>
            </svg>
            <span>Share</span>
          </button>
        )}
      </div>
      
      <div className="screenshot-info">
        <small>Capture and share your floor price comparisons</small>
      </div>
    </div>
  );
};

export default ScreenshotShare;

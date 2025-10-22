import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const SettingsModal = ({ isOpen, onClose }) => {
  const { themeMode, actualTheme, setThemeMode, isSystem } = useTheme();

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      // Add haptic feedback on mobile
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(1);
      }
      onClose();
    }
  };

  const handleClose = () => {
    // Add haptic feedback on mobile
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(1);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className={`max-w-md w-full mx-4 overflow-hidden rounded-none border-2 transition-all duration-200 max-h-[90vh] overflow-y-auto ${
        actualTheme === 'dark' 
          ? 'bg-[#1a1a1a] border-white' 
          : 'bg-white border-black'
      }`} style={{fontFamily: '"Space Grotesk", sans-serif'}}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b-2 ${
          actualTheme === 'dark' ? 'border-white' : 'border-black'
        }`}>
          <h2 className={`text-xl font-bold tracking-tight ${
            actualTheme === 'dark' ? 'text-white' : 'text-black'
          }`}>Settings</h2>
          <button
            onClick={handleClose}
            className={`w-10 h-10 flex items-center justify-center rounded-none border-2 transition-all duration-200 hover:scale-105 ${
              actualTheme === 'dark'
                ? 'bg-[#1a1a1a] border-white text-white hover:bg-[var(--accent-color)] hover:text-black'
                : 'bg-white border-black text-black hover:bg-[var(--accent-color)]'
            }`}
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Appearance Section */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                actualTheme === 'dark' ? 'text-white' : 'text-black'
              }`}>Appearance</h3>
              
              {/* Theme Options */}
              <div className="space-y-3">
                {/* Light Mode */}
                <label className={`flex items-center justify-between cursor-pointer p-4 rounded-none border-2 transition-all duration-200 hover:scale-[1.02] ${
                  themeMode === 'light' 
                    ? actualTheme === 'dark'
                      ? 'border-white bg-[var(--accent-color)] text-black'
                      : 'border-black bg-[var(--accent-color)] text-black'
                    : actualTheme === 'dark' 
                      ? 'border-gray-700 hover:border-white bg-[#1a1a1a]' 
                      : 'border-gray-300 hover:border-black bg-white'
                }`}>
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-11 h-11 rounded-none border-2 flex items-center justify-center transition-colors ${
                      themeMode === 'light' 
                        ? actualTheme === 'dark'
                          ? 'bg-white border-white text-black'
                          : 'bg-black border-black text-white'
                        : actualTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-gray-200 border-gray-300 text-black'
                    }`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-base font-bold ${themeMode === 'light' ? 'text-black' : (actualTheme === 'dark' ? 'text-white' : 'text-black')}`}>Light Mode</p>
                      <p className={`text-sm ${themeMode === 'light' ? 'text-black/70' : (actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600')}`}>Always use light theme</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                    themeMode === 'light' 
                      ? actualTheme === 'dark'
                        ? 'border-white bg-white'
                        : 'border-black bg-black'
                      : actualTheme === 'dark' 
                        ? 'border-gray-500 bg-gray-800' 
                        : 'border-gray-400 bg-white'
                  }`}>
                    {themeMode === 'light' && (
                      <div className={`w-3 h-3 rounded-none ${
                        actualTheme === 'dark' ? 'bg-black' : 'bg-white'
                      }`}></div>
                    )}
                  </div>
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={themeMode === 'light'}
                    onChange={() => {
                      if (window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate(1);
                      }
                      setThemeMode('light');
                    }}
                    className="sr-only"
                  />
                </label>
                
                {/* Dark Mode */}
                <label className={`flex items-center justify-between cursor-pointer p-4 rounded-none border-2 transition-all duration-200 hover:scale-[1.02] ${
                  themeMode === 'dark' 
                    ? actualTheme === 'dark'
                      ? 'border-white bg-[var(--accent-color)] text-black'
                      : 'border-black bg-[var(--accent-color)] text-black'
                    : actualTheme === 'dark' 
                      ? 'border-gray-700 hover:border-white bg-[#1a1a1a]' 
                      : 'border-gray-300 hover:border-black bg-white'
                }`}>
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-11 h-11 rounded-none border-2 flex items-center justify-center transition-colors ${
                      themeMode === 'dark' 
                        ? actualTheme === 'dark'
                          ? 'bg-white border-white text-black'
                          : 'bg-black border-black text-white'
                        : actualTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-gray-200 border-gray-300 text-black'
                    }`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-base font-bold ${themeMode === 'dark' ? 'text-black' : (actualTheme === 'dark' ? 'text-white' : 'text-black')}`}>Dark Mode</p>
                      <p className={`text-sm ${themeMode === 'dark' ? 'text-black/70' : (actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600')}`}>Always use dark theme</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                    themeMode === 'dark' 
                      ? actualTheme === 'dark'
                        ? 'border-white bg-white'
                        : 'border-black bg-black'
                      : actualTheme === 'dark' 
                        ? 'border-gray-500 bg-gray-800' 
                        : 'border-gray-400 bg-white'
                  }`}>
                    {themeMode === 'dark' && (
                      <div className={`w-3 h-3 rounded-none ${
                        actualTheme === 'dark' ? 'bg-black' : 'bg-white'
                      }`}></div>
                    )}
                  </div>
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={themeMode === 'dark'}
                    onChange={() => {
                      if (window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate(1);
                      }
                      setThemeMode('dark');
                    }}
                    className="sr-only"
                  />
                </label>
                
                {/* System Mode */}
                <label className={`flex items-center justify-between cursor-pointer p-4 rounded-none border-2 transition-all duration-200 hover:scale-[1.02] ${
                  themeMode === 'system' 
                    ? actualTheme === 'dark'
                      ? 'border-white bg-[var(--accent-color)] text-black'
                      : 'border-black bg-[var(--accent-color)] text-black'
                    : actualTheme === 'dark' 
                      ? 'border-gray-700 hover:border-white bg-[#1a1a1a]' 
                      : 'border-gray-300 hover:border-black bg-white'
                }`}>
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-11 h-11 rounded-none border-2 flex items-center justify-center transition-colors ${
                      themeMode === 'system' 
                        ? actualTheme === 'dark'
                          ? 'bg-white border-white text-black'
                          : 'bg-black border-black text-white'
                        : actualTheme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-gray-200 border-gray-300 text-black'
                    }`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-base font-bold ${themeMode === 'system' ? 'text-black' : (actualTheme === 'dark' ? 'text-white' : 'text-black')}`}>System</p>
                      <p className={`text-sm ${themeMode === 'system' ? 'text-black/70' : (actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600')}`}>Follow system preference {isSystem && `(currently ${actualTheme})`}</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                    themeMode === 'system' 
                      ? actualTheme === 'dark'
                        ? 'border-white bg-white'
                        : 'border-black bg-black'
                      : actualTheme === 'dark' 
                        ? 'border-gray-500 bg-gray-800' 
                        : 'border-gray-400 bg-white'
                  }`}>
                    {themeMode === 'system' && (
                      <div className={`w-3 h-3 rounded-none ${
                        actualTheme === 'dark' ? 'bg-black' : 'bg-white'
                      }`}></div>
                    )}
                  </div>
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    checked={themeMode === 'system'}
                    onChange={() => {
                      if (window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate(1);
                      }
                      setThemeMode('system');
                    }}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* System Information */}
            <div className={`pt-6 border-t-2 ${
              actualTheme === 'dark' ? 'border-white' : 'border-black'
            }`}>
              <div className="flex items-center justify-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-none animate-pulse ${
                  actualTheme === 'dark' ? 'bg-white' : 'bg-black'
                }`}></div>
                <p className={`font-bold ${
                  actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Theme preference saved automatically
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

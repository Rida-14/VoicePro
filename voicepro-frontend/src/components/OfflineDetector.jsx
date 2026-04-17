import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import './OfflineDetector.css';

const OfflineDetector = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show reconnected message briefly
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (isOnline && !wasOffline) return null;

  return (
    <div className={`offline-banner ${isOnline ? 'online' : 'offline'}`}>
      {isOnline ? (
        <>
          <Wifi size={20} />
          <span>You're back online!</span>
        </>
      ) : (
        <>
          <WifiOff size={20} />
          <span>No internet connection. Some features may be unavailable.</span>
        </>
      )}
    </div>
  );
};

export default OfflineDetector;

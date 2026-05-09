'use client';

import { useEffect } from 'react';
import Image from 'next/image';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, 
        backgroundColor: 'rgba(0,0,0,0.9)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <button 
        style={{
          position: 'absolute', top: '20px', right: '30px', 
          background: 'none', border: 'none', color: 'white', 
          fontSize: '40px', cursor: 'pointer', zIndex: 10000,
          padding: '10px'
        }}
        onClick={onClose}
        title="Đóng (Esc)"
      >&times;</button>
      <div style={{ position: 'relative', width: '90vw', height: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <Image 
          src={imageUrl} 
          alt="Full screen view" 
          fill 
          style={{ objectFit: 'contain' }} 
          priority
        />
      </div>
    </div>
  );
}

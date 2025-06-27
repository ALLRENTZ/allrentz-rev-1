
export interface CompressedImageResult {
  dataUrl: string;
  size: number;
}

export class ImageCompressor {
  private static MAX_WIDTH = 400;
  private static MAX_HEIGHT = 300;
  private static QUALITY = 0.8;
  
  static async compressImage(file: File): Promise<CompressedImageResult> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        const { width: newWidth, height: newHeight } = this.calculateDimensions(
          img.width,
          img.height
        );
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw and compress the image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', this.QUALITY);
        const size = Math.round((compressedDataUrl.length * 3) / 4); // Approximate size in bytes
        
        resolve({
          dataUrl: compressedDataUrl,
          size
        });
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
  
  private static calculateDimensions(originalWidth: number, originalHeight: number) {
    let { MAX_WIDTH, MAX_HEIGHT } = this;
    
    if (originalWidth <= MAX_WIDTH && originalHeight <= MAX_HEIGHT) {
      return { width: originalWidth, height: originalHeight };
    }
    
    const widthRatio = MAX_WIDTH / originalWidth;
    const heightRatio = MAX_HEIGHT / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);
    
    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio)
    };
  }
}

export class StorageManager {
  private static STORAGE_KEY_PREFIX = 'compressed_';
  private static MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for safety
  
  static setItem(key: string, value: string): boolean {
    const fullKey = this.STORAGE_KEY_PREFIX + key;
    
    try {
      // Check if adding this item would exceed our limit
      const estimatedSize = this.getStorageSize() + value.length;
      
      if (estimatedSize > this.MAX_STORAGE_SIZE) {
        // Try to free up space by removing oldest items
        this.cleanupOldItems();
        
        // Check again after cleanup
        const newEstimatedSize = this.getStorageSize() + value.length;
        if (newEstimatedSize > this.MAX_STORAGE_SIZE) {
          console.warn('Storage cleanup insufficient, item too large');
          return false;
        }
      }
      
      localStorage.setItem(fullKey, value);
      localStorage.setItem(fullKey + '_timestamp', Date.now().toString());
      return true;
    } catch (error) {
      console.error('Storage error:', error);
      // Try cleanup and retry once
      this.cleanupOldItems();
      try {
        localStorage.setItem(fullKey, value);
        localStorage.setItem(fullKey + '_timestamp', Date.now().toString());
        return true;
      } catch (retryError) {
        console.error('Storage retry failed:', retryError);
        return false;
      }
    }
  }
  
  static getItem(key: string): string | null {
    return localStorage.getItem(this.STORAGE_KEY_PREFIX + key);
  }
  
  static removeItem(key: string): void {
    const fullKey = this.STORAGE_KEY_PREFIX + key;
    localStorage.removeItem(fullKey);
    localStorage.removeItem(fullKey + '_timestamp');
  }
  
  private static getStorageSize(): number {
    let total = 0;
    for (let key in localStorage) {
      if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
        total += localStorage[key].length;
      }
    }
    return total;
  }
  
  private static cleanupOldItems(): void {
    const items: Array<{ key: string; timestamp: number }> = [];
    
    // Collect all our items with timestamps
    for (let key in localStorage) {
      if (key.startsWith(this.STORAGE_KEY_PREFIX) && !key.includes('_timestamp')) {
        const timestampKey = key + '_timestamp';
        const timestamp = parseInt(localStorage.getItem(timestampKey) || '0');
        items.push({ key: key.replace(this.STORAGE_KEY_PREFIX, ''), timestamp });
      }
    }
    
    // Sort by timestamp (oldest first) and remove oldest 25%
    items.sort((a, b) => a.timestamp - b.timestamp);
    const itemsToRemove = Math.ceil(items.length * 0.25);
    
    for (let i = 0; i < itemsToRemove; i++) {
      this.removeItem(items[i].key);
      console.log(`Cleaned up old image: ${items[i].key}`);
    }
  }
  
  static getStorageInfo(): { used: number; limit: number; percentage: number } {
    const used = this.getStorageSize();
    const percentage = (used / this.MAX_STORAGE_SIZE) * 100;
    
    return {
      used,
      limit: this.MAX_STORAGE_SIZE,
      percentage: Math.round(percentage)
    };
  }
}

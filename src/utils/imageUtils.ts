
export interface CompressedImageResult {
  dataUrl: string;
  size: number;
}

export class ImageCompressor {
  private static MAX_WIDTH = 400;
  private static MAX_HEIGHT = 300;
  private static QUALITY = 0.7; // Slightly more compression to save space
  
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
    const { MAX_WIDTH, MAX_HEIGHT } = this;
    
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
  private static MAX_STORAGE_SIZE = 15 * 1024 * 1024; // Increased to 15MB
  private static CLEANUP_THRESHOLD = 0.8; // Only cleanup when 80% full
  private static CLEANUP_PERCENTAGE = 0.1; // Only remove 10% of items instead of 25%
  
  static setItem(key: string, value: string): boolean {
    const fullKey = this.STORAGE_KEY_PREFIX + key;
    
    try {
      // Check if adding this item would exceed our limit
      const currentSize = this.getStorageSize();
      const estimatedSize = currentSize + value.length;
      
      if (estimatedSize > this.MAX_STORAGE_SIZE) {
        // Only cleanup if we're above the threshold
        if (currentSize > this.MAX_STORAGE_SIZE * this.CLEANUP_THRESHOLD) {
          console.warn(`Storage is getting full (${Math.round((currentSize / this.MAX_STORAGE_SIZE) * 100)}%). Cleaning up oldest images...`);
          this.cleanupOldItems();
          
          // Check again after cleanup
          const newCurrentSize = this.getStorageSize();
          const newEstimatedSize = newCurrentSize + value.length;
          if (newEstimatedSize > this.MAX_STORAGE_SIZE) {
            console.warn('Storage cleanup insufficient, item too large');
            return false;
          }
        } else {
          console.warn('Item too large for storage');
          return false;
        }
      }
      
      localStorage.setItem(fullKey, value);
      localStorage.setItem(fullKey + '_timestamp', Date.now().toString());
      console.log(`Stored image: ${key} (${Math.round(value.length / 1024)}KB)`);
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
    for (const key in localStorage) {
      if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
        total += localStorage[key].length;
      }
    }
    return total;
  }
  
  private static cleanupOldItems(): void {
    const items: Array<{ key: string; timestamp: number; size: number }> = [];
    
    // Collect all our items with timestamps and sizes
    for (const key in localStorage) {
      if (key.startsWith(this.STORAGE_KEY_PREFIX) && !key.includes('_timestamp')) {
        const timestampKey = key + '_timestamp';
        const timestamp = parseInt(localStorage.getItem(timestampKey) || '0');
        const size = localStorage.getItem(key)?.length || 0;
        items.push({ 
          key: key.replace(this.STORAGE_KEY_PREFIX, ''), 
          timestamp,
          size 
        });
      }
    }
    
    // Sort by timestamp (oldest first) and remove only the cleanup percentage
    items.sort((a, b) => a.timestamp - b.timestamp);
    const itemsToRemove = Math.max(1, Math.ceil(items.length * this.CLEANUP_PERCENTAGE));
    
    console.log(`Cleaning up ${itemsToRemove} of ${items.length} stored images to free space...`);
    
    for (let i = 0; i < itemsToRemove; i++) {
      this.removeItem(items[i].key);
      const sizeKB = Math.round(items[i].size / 1024);
      console.log(`Cleaned up old image: ${items[i].key} (${sizeKB}KB)`);
    }
  }
  
  static getStorageInfo(): { used: number; limit: number; percentage: number; itemCount: number } {
    const used = this.getStorageSize();
    const percentage = (used / this.MAX_STORAGE_SIZE) * 100;
    
    // Count items
    let itemCount = 0;
    for (const key in localStorage) {
      if (key.startsWith(this.STORAGE_KEY_PREFIX) && !key.includes('_timestamp')) {
        itemCount++;
      }
    }
    
    return {
      used,
      limit: this.MAX_STORAGE_SIZE,
      percentage: Math.round(percentage),
      itemCount
    };
  }
  
  static clearAllStoredImages(): void {
    const keys = [];
    for (const key in localStorage) {
      if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keys.length} storage items`);
  }
}

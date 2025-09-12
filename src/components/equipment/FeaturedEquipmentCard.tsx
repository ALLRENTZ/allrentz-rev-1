
import React, { useState } from 'react';
import { Star, MapPin, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FeaturedEquipmentItem } from '@/data/featuredEquipment';
import { useToast } from "@/hooks/use-toast";
import { ImageCompressor, StorageManager } from '@/utils/imageUtils';

interface FeaturedEquipmentCardProps {
  item: FeaturedEquipmentItem;
  onImageUpdate?: (equipmentId: string, newImageUrl: string) => void;
}

const FeaturedEquipmentCard: React.FC<FeaturedEquipmentCardProps> = ({ item, onImageUpdate }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [currentImage, setCurrentImage] = useState(item.image);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Load saved image from localStorage on component mount
  React.useEffect(() => {
    const savedImage = StorageManager.getItem(`featured_equipment_image_${item.id}`);
    if (savedImage) {
      setCurrentImage(savedImage);
    }
  }, [item.id]);

  const getFallbackImage = () => {
    return 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop&auto=format';
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageEdit = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleImageUpload;
    input.click();
  };

  const handleImageUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Compress the image
      const compressed = await ImageCompressor.compressImage(file);
      
      // Try to store the compressed image
      const success = StorageManager.setItem(`featured_equipment_image_${item.id}`, compressed.dataUrl);
      
      if (!success) {
        const storageInfo = StorageManager.getStorageInfo();
        toast({
          title: "Storage Full",
          description: `Storage is ${storageInfo.percentage}% full. Some old images were removed to make space. Please try again.`,
          variant: "destructive"
        });
        return;
      }
      
      setCurrentImage(compressed.dataUrl);
      setImageError(false);
      onImageUpdate?.(item.id, compressed.dataUrl);
      
      const sizeKB = Math.round(compressed.size / 1024);
      toast({
        title: "Image Updated",
        description: `Successfully updated image for ${item.name} (${sizeKB}KB)`,
      });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to process image. Please try a different image.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const imageToDisplay = imageError ? getFallbackImage() : currentImage;

  return (
    <div className="industrial-card overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div 
        className="relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {imageLoading && (
          <div className="w-full h-48 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        )}
        <img 
          src={imageToDisplay} 
          alt={item.name}
          className={`w-full h-48 object-cover ${imageLoading ? 'hidden' : 'block'}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        
        {/* Edit Button - Bottom Right */}
        {isHovering && !imageLoading && (
          <div className="absolute bottom-3 right-3 z-50">
            <button
              onClick={handleImageEdit}
              disabled={isUploading}
              className="bg-black bg-opacity-80 hover:bg-opacity-90 text-white p-2.5 rounded-full transition-all duration-200 flex items-center justify-center shadow-lg backdrop-blur-sm"
              title="Edit Image"
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </button>
          </div>
        )}

        {/* Available Badge */}
        {item.available && (
          <div className="absolute top-3 left-3">
            <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">
              Available
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
          <p className="text-sm text-gray-600">{item.specifications}</p>
        </div>

        {/* Location and Rating */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{item.location}</span>
          </div>
          <div className="flex items-center space-x-1 text-sm">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="font-medium">{item.rating}</span>
            <span className="text-gray-500">({item.reviews})</span>
          </div>
        </div>

        {/* Vendor */}
        <p className="text-sm text-gray-500 mb-3">{item.vendor}</p>

        {/* Pricing */}
        <div className="border-t border-gray-200 pt-3 mb-4">
          <p className="text-xl font-bold text-gray-900">
            ${item.dailyRate.toLocaleString()}
            <span className="text-sm font-normal text-gray-600">/day</span>
          </p>
        </div>

        {/* CTA Button */}
        <Link to="/customer-onboarding">
          <Button className="w-full industrial-button font-medium py-2">
            Request Quote
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default FeaturedEquipmentCard;

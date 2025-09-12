
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Pencil } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ImageCompressor, StorageManager } from '@/utils/imageUtils';

interface CategoryCardProps {
  title: string;
  description: string;
  image: string;
  equipmentCount: number;
  subItems: string[];
  label: 'Core Solutions' | 'Advanced' | 'Tooling';
  category: string;
  onImageUpdate?: (categoryId: string, newImageUrl: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  title,
  description,
  image,
  equipmentCount,
  subItems,
  label,
  category,
  onImageUpdate
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Load saved image from localStorage on component mount
  React.useEffect(() => {
    const savedImage = StorageManager.getItem(`category_image_${category}`);
    if (savedImage) {
      setCurrentImage(savedImage);
    }
  }, [category]);

  const labelColors = {
    'Core Solutions': 'bg-blue-100 text-blue-800',
    'Advanced': 'bg-purple-100 text-purple-800',
    'Tooling': 'bg-green-100 text-green-800'
  };

  // Fallback image for categories
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
      const success = StorageManager.setItem(`category_image_${category}`, compressed.dataUrl);
      
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
      onImageUpdate?.(category, compressed.dataUrl);
      
      const sizeKB = Math.round(compressed.size / 1024);
      toast({
        title: "Image Updated",
        description: `Successfully updated image for ${title} (${sizeKB}KB)`,
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
    <div className="industrial-card overflow-hidden hover:shadow-lg transition-all duration-300 group">
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
          alt={title}
          className={`w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 ${imageLoading ? 'hidden' : 'block'}`}
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

        <div className="absolute top-3 left-3">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${labelColors[label]}`}>
            {label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="mb-3">
          <h3 className="text-xl font-bold text-allrentz-gray mb-2">{title}</h3>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>

        {/* Sub-items preview */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Popular Equipment:</p>
          <div className="space-y-1">
            {subItems.slice(0, 3).map((item, index) => (
              <p key={index} className="text-xs text-gray-600">• {item}</p>
            ))}
          </div>
        </div>

        {/* Equipment count */}
        <div className="mb-4">
          <p className="text-sm text-gray-500">{equipmentCount} units available</p>
        </div>

        {/* CTA */}
        <Link 
          to={`/browse/results?category=${category}`}
          className="w-full inline-flex items-center justify-center bg-allrentz-red hover:bg-red-700 text-white font-medium py-3 px-4 rounded-md transition-colors group"
        >
          See All Equipment
          <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default CategoryCard;

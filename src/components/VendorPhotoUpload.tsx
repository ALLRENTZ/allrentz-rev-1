
import React, { useState } from 'react';
import { Upload, Camera, X, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface VendorPhotoUploadProps {
  equipmentId: string;
  equipmentName: string;
  onUploadComplete?: () => void;
}

const VendorPhotoUpload: React.FC<VendorPhotoUploadProps> = ({
  equipmentId,
  equipmentName,
  onUploadComplete
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Please upload only image files.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      const newPhotos = imageFiles.map(file => URL.createObjectURL(file));
      setUploadedPhotos(prev => [...prev, ...newPhotos]);
      setIsUploading(false);
      
      toast({
        title: "Photos Uploaded",
        description: `${imageFiles.length} photo(s) uploaded successfully for ${equipmentName}`,
      });
      
      onUploadComplete?.();
    }, 1500);
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-allrentz-gray mb-2">
          Upload Photos for {equipmentName}
        </h3>
        <p className="text-sm text-gray-600">
          Add clear photos showing the equipment condition and specifications
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? 'border-allrentz-red bg-red-50' 
            : 'border-gray-300 hover:border-allrentz-red hover:bg-red-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Upload className="h-6 w-6 text-gray-600" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              Drop photos here or click to upload
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, JPEG up to 10MB each
            </p>
          </div>
          
          <div className="flex justify-center">
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button variant="outline" className="inline-flex items-center space-x-2">
                <Camera className="h-4 w-4" />
                <span>Select Photos</span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* Uploading State */}
      {isUploading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2 text-allrentz-red">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-allrentz-red"></div>
            <span>Uploading photos...</span>
          </div>
        </div>
      )}

      {/* Uploaded Photos */}
      {uploadedPhotos.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-allrentz-gray">Uploaded Photos</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {uploadedPhotos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo}
                  alt={`Equipment photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadedPhotos.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Visual verification complete! Customers can now see your equipment photos.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPhotoUpload;

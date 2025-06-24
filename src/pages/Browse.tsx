
import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Clock, DollarSign, Star, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CategoryCard from '@/components/CategoryCard';
import EquipmentQuoteRequest from '@/components/EquipmentQuoteRequest';
import { equipmentCategories } from '@/data/equipmentCategories';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Equipment {
  id: string;
  title: string;
  description: string;
  category: string;
  daily_rate: number;
  location: string;
  image_url: string;
  specifications: any;
}

const Browse = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [featuredEquipment, setFeaturedEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchFeaturedEquipment();
  }, []);

  const fetchFeaturedEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('available', true)
        .limit(6);

      if (error) throw error;
      setFeaturedEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestQuote = (equipment: Equipment) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to request a quote.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedEquipment(equipment);
    setShowQuoteModal(true);
  };

  const filteredCategories = equipmentCategories.filter(category =>
    category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Search Section */}
      <section className="bg-gradient-to-r from-allrentz-gray to-allrentz-gray-dark py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Find the Perfect Equipment
            </h1>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto">
              Browse our extensive catalog of industrial equipment from verified vendors
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search for equipment, categories, or specifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-4 text-lg bg-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Equipment Section */}
      {featuredEquipment.length > 0 && (
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-allrentz-gray">Featured Equipment</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Zap className="h-4 w-4 text-allrentz-red" />
                <span>Available for immediate rental</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEquipment.map((equipment) => (
                <Card key={equipment.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img 
                        src={equipment.image_url} 
                        alt={equipment.title}
                        className="w-full h-48 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                        Available
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg text-allrentz-gray line-clamp-2">{equipment.title}</h3>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{equipment.description}</p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <MapPin className="h-4 w-4" />
                          <span>{equipment.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">4.8</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4 text-allrentz-red" />
                          <span className="font-bold text-allrentz-red">${equipment.daily_rate}/day</span>
                        </div>
                        <Button 
                          onClick={() => handleRequestQuote(equipment)}
                          size="sm"
                          className="bg-allrentz-red hover:bg-red-700"
                        >
                          Request Quote
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-allrentz-gray mb-4">Equipment Categories</h2>
            <p className="text-xl text-gray-600">
              Explore our comprehensive catalog organized by industry needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCategories.map((category) => (
              <CategoryCard key={category.id} {...category} />
            ))}
          </div>
          
          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No categories found matching your search.</p>
            </div>
          )}
        </div>
      </section>

      <EquipmentQuoteRequest 
        equipment={selectedEquipment}
        open={showQuoteModal}
        onOpenChange={setShowQuoteModal}
      />
    </div>
  );
};

export default Browse;

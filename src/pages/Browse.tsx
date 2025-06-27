import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Equipment } from '@/types/equipment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, Star } from 'lucide-react';

const Browse = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for demo
  const mockEquipment: Equipment[] = [
    {
      id: 'eq-1',
      title: 'Industrial Boiler - 150 PSI',
      description: 'High-efficiency industrial boiler for process heating',
      category: 'Boilers',
      daily_rate: 450,
      location: 'Houston, TX',
      image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop',
      specifications: {
        pressure: '150 PSI',
        fuel: 'Natural Gas',
        certified: 'ASME'
      },
      vendor_name: 'Gulf Coast Equipment',
      compliance_score: 95,
      response_time_hours: 2,
      compliance_tags: ['TWIC', 'HAZMAT', 'API-653']
    },
    {
      id: 'eq-2',
      title: 'Storage Tank - 5000 Gallon',
      description: 'Stainless steel storage tank with vacuum capabilities',
      category: 'Storage',
      daily_rate: 320,
      location: 'Beaumont, TX',
      image_url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=300&fit=crop',
      specifications: {
        capacity: '5000 Gallons',
        material: 'Stainless Steel',
        vacuum_ready: true
      },
      vendor_name: 'Lone Star Rentals',
      compliance_score: 88,
      response_time_hours: 1,
      compliance_tags: ['TWIC', 'ISNET', 'OSHA-30']
    },
    {
      id: 'eq-3',
      title: 'Diesel Generator - 500kW',
      description: 'Portable diesel generator for emergency power',
      category: 'Power Generation',
      daily_rate: 580,
      location: 'Port Arthur, TX',
      image_url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=300&fit=crop',
      specifications: {
        power: '500kW',
        fuel: 'Diesel',
        runtime: '24 hours'
      },
      vendor_name: 'Bayou Industrial Supply',
      compliance_score: 91,
      response_time_hours: 3,
      compliance_tags: ['TWIC', 'HAZMAT', 'PEC-SafeLand']
    }
  ];

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .eq('available', true)
          .limit(10);

        if (error) {
          console.log('Database query failed, using mock data:', error);
          setEquipment(mockEquipment);
        } else if (data && data.length > 0) {
          // Map database data to Equipment interface with proper type conversion
          const mappedEquipment: Equipment[] = data.map(item => ({
            id: item.id,
            title: item.title || 'Equipment',
            description: item.description || '',
            category: item.category || 'General',
            daily_rate: item.daily_rate || 0,
            location: item.location || 'Unknown',
            image_url: item.image_url || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=300&fit=crop',
            specifications: typeof item.specifications === 'object' && item.specifications !== null 
              ? item.specifications as Record<string, any>
              : {},
            vendor_name: 'Equipment Vendor',
            compliance_score: 85,
            response_time_hours: 4,
            compliance_tags: ['TWIC']
          }));
          setEquipment(mappedEquipment);
        } else {
          setEquipment(mockEquipment);
        }
      } catch (error) {
        console.error('Error fetching equipment:', error);
        setEquipment(mockEquipment);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse Equipment</h1>
            <p className="text-gray-600 mt-2">Discover industrial equipment from verified vendors</p>
          </div>
          <Link to="/smartmatch-demo">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              Try SmartMatch AI
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  </div>
                  <Badge variant="secondary">{item.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{item.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">${item.daily_rate}/day</span>
                    </div>
                  </div>

                  {item.vendor_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Vendor: {item.vendor_name}</span>
                      {item.compliance_score && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">{item.compliance_score}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {item.compliance_tags && item.compliance_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.compliance_tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Button className="w-full mt-4">
                    Request Quote
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {equipment.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No equipment found</p>
            <Link to="/smartmatch-demo">
              <Button className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Try SmartMatch to find equipment
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;

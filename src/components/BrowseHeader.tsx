
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const BrowseHeader: React.FC = () => {
  return (
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
  );
};

export default BrowseHeader;

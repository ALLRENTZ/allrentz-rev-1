
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const EmptyState: React.FC = () => {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500 text-lg">No equipment categories found</p>
      <Link to="/smartmatch-demo">
        <Button className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          Try SmartMatch to find equipment
        </Button>
      </Link>
    </div>
  );
};

export default EmptyState;

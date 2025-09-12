
import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';

const SmartMatchButton: React.FC = () => {
  return (
    <Link 
      to="/smartmatch-demo"
      className="inline-flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
    >
      <Zap className="h-5 w-5 mr-3 text-yellow-300" />
      <span className="mr-3">SmartMatch AI</span>
      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
};

export default SmartMatchButton;

import React from 'react';

interface SkipLink {
  href: string;
  label: string;
}

interface SkipNavigationProps {
  links?: SkipLink[];
}

const SkipNavigation: React.FC<SkipNavigationProps> = ({ 
  links = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#footer', label: 'Skip to footer' }
  ]
}) => {
  return (
    <div className="sr-only focus-within:not-sr-only">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className="
            absolute top-4 left-4 z-[9999]
            bg-allrentz-red text-white 
            px-4 py-2 rounded-md
            font-medium text-sm
            focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2
            transform -translate-y-full focus:translate-y-0
            transition-transform duration-150
          "
        >
          {link.label}
        </a>
      ))}
    </div>
  );
};

export default SkipNavigation;
import React from 'react';
import { Shield } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onPortfolioClick: () => void;
  onTestingClick: () => void;
  onAdminClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  onPortfolioClick,
  onTestingClick,
  onAdminClick
}) => {
  const menuItems = [
    { icon: Shield, label: 'Admin', onClick: onAdminClick }
  ];

  // Handle mouse enter/leave for auto-show/hide
  const handleMouseEnter = () => {
    onToggle(true);
  };

  const handleMouseLeave = () => {
    onToggle(false);
  };

  return (
    <>
      {/* Edge Detection Zone - invisible trigger area */}
      <div
        className="fixed left-0 top-0 w-4 h-full z-50"
        onMouseEnter={handleMouseEnter}
      />
      
      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 z-40 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            <h1 className="text-xl font-bold">Admin</h1>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4">
          <div className="space-y-3">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
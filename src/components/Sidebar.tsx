import React from 'react';
import { User, HelpCircle, Users, FileText, BarChart3, LogOut, Briefcase, TestTube, Shield } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onPortfolioClick: () => void;
  onTestingClick: () => void;
  onLogout: () => void; // Add this prop
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onToggle, 
  onPortfolioClick, 
  onTestingClick,
  onLogout // Add this prop
}) => {
  const menuItems = [
    { icon: Shield, label: 'Admin' },
    { icon: BarChart3, label: 'Dashboard', active: true },
    { icon: Briefcase, label: 'Portfolio', onClick: onPortfolioClick },
    { icon: TestTube, label: 'Testing', onClick: onTestingClick },
    { icon: User, label: 'Profile' },
    { icon: HelpCircle, label: 'Contact Support' },
    { icon: Users, label: 'Invite Friends' },
    { icon: FileText, label: 'Terms & Conditions' }
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
            <BarChart3 className="w-8 h-8 text-emerald-400" />
            <h1 className="text-xl font-bold">Portfolio</h1>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4">
          <div className="space-y-3">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Logout Button - Fixed at bottom */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onLogout}
            className="flex items-center px-4 py-2 text-gray-300 hover:bg-red-600 hover:text-white rounded-md transition-colors w-full text-left"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
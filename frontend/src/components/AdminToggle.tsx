import React from 'react';
import { Shield, Eye } from 'lucide-react';
import { AdminToggleProps } from '../types';

const AdminToggle: React.FC<AdminToggleProps> = ({ isAdminMode, onToggle }) => {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Eye className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">Viewer</span>
      </div>
      
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={isAdminMode}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <div
          className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
            isAdminMode
              ? 'bg-primary-600'
              : 'bg-gray-300'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
              isAdminMode ? 'translate-x-5' : 'translate-x-0'
            } mt-0.5 ml-0.5`}
          />
        </div>
      </label>
      
      <div className="flex items-center space-x-2">
        <Shield className="h-4 w-4 text-primary-600" />
        <span className="text-sm text-primary-600 font-medium">Admin</span>
      </div>
      
      {isAdminMode && (
        <div className="ml-2 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
          Admin Mode Active
        </div>
      )}
    </div>
  );
};

export default AdminToggle;
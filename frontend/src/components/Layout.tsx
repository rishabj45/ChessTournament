import React, { useState } from 'react';
import { LogIn, LogOut, Trophy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCurrentTournament } from '../hooks/useApi';
import AdminToggle from './AdminToggle';
import LoginModal from './LoginModal';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentTab, onTabChange }) => {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { data: tournament } = useCurrentTournament();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const tabs = [
    { id: 'schedule', label: 'Schedule & Results' },
    { id: 'standings', label: 'Standings' },
    { id: 'teams', label: 'Teams' },
    { id: 'players', label: 'Best Players' },
  ];

  const handleLogin = async (credentials: any) => {
    await login(credentials);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Tournament Title */}
            <div className="flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {tournament?.name || 'Chess Tournament'}
              </h1>
            </div>

            {/* Admin Controls */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <AdminToggle
                    isAdminMode={isAdminMode}
                    onToggle={setIsAdminMode}
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Welcome, {user?.username}
                    </span>
                    <button
                      onClick={logout}
                      className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-md transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Admin Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {React.cloneElement(children as React.ReactElement, {
          isAdminMode,
          isAuthenticated,
        })}
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      {/* Tournament Info Footer */}
      {tournament && (
        <footer className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Status: <span className="font-medium">{tournament.status}</span>
              </div>
              <div>
                Round {tournament.current_round} of {tournament.total_rounds}
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;
import React, { useState, useEffect } from 'react';
import  Layout  from './components/Layout';
import  Schedule  from './components/Schedule';
import { Standings } from './components/Standings';
import  Teams  from './components/Teams';
import  BestPlayers  from './components/BestPlayers';
import  LoginModal from './components/LoginModal';
import  AdminToggle  from './components/AdminToggle';
import { useAuth } from './hooks/useAuth';
import { useTournament } from './hooks/useTournament';
import api  from './services/api';
import { Tournament } from './types';

type TabType = 'schedule' | 'standings' | 'teams' | 'best-players';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated, adminMode, toggleAdminMode, login, logout } = useAuth();
  const { refreshTournament } = useTournament();

  // Fetch tournament data on component mount
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setLoading(true);
        const response = await api.getCurrentTournament();
        setTournament(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching tournament:', err);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, []);

  // Refresh tournament data when needed
  const handleTournamentUpdate = async () => {
    try {
      const response = await api.getTournaments();
      setTournament(response);
      await refreshTournament();
    } catch (err) {
      console.error('Error refreshing tournament:', err);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      await login(username, password);
      setShowLoginModal(false);
      return true;
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: 'schedule', label: 'Schedule & Results', icon: '📅' },
    { id: 'standings', label: 'Standings', icon: '🏆' },
    { id: 'teams', label: 'Teams', icon: '👥' },
    { id: 'best-players', label: 'Best Players', icon: '⭐' }
  ] as const;

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 text-red-600">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <div className="text-xl font-semibold mb-2">Something went wrong</div>
            <div className="text-gray-600">{error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'schedule':
        return <Schedule onUpdate={handleTournamentUpdate} />;
      case 'standings':
        return <Standings onUpdate={handleTournamentUpdate} />;
      case 'teams':
        return <Teams onUpdate={handleTournamentUpdate} />;
      case 'best-players':
        return <BestPlayers onUpdate={handleTournamentUpdate} />;
      default:
        return <Schedule onUpdate={handleTournamentUpdate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Layout>
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              {/* Tournament Title */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {tournament?.name || 'Chess Tournament'}
                </h1>
                {tournament?.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {tournament.description}
                  </p>
                )}
              </div>

              {/* Auth Controls */}
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <div className="flex items-center space-x-3">
                    <AdminToggle 
                      isAdminMode={adminMode} 
                      onToggle={toggleAdminMode} 
                    />
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Admin Login
                  </button>
                )}
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderTabContent()}
        </div>

        {/* Login Modal */}
        {showLoginModal && (
          <LoginModal
            onLogin={handleLogin}
            onClose={() => setShowLoginModal(false)}
          />
        )}

        {/* Admin Mode Indicator */}
        {isAuthenticated && adminMode && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-orange-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
              <span className="text-sm font-medium">🔧 Admin Mode</span>
            </div>
          </div>
        )}

        {/* Tournament Status */}
        {tournament && (
          <div className="fixed bottom-4 left-4 z-40">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
              <div className="text-xs text-gray-500">
                Status: <span className="font-medium text-green-600">{tournament.status}</span>
              </div>
              {tournament.teams && (
                <div className="text-xs text-gray-500">
                  Teams: <span className="font-medium">{tournament.teams.length}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Layout>
    </div>
  );
};

export default App;
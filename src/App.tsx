import React, { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PredictionEnginePage } from './pages/PredictionEnginePage';
import { NewsFeedPage } from './pages/NewsFeedPage';
import { GoogleTrendsPage } from './pages/GoogleTrendsPage';
import { PoliticalTradingPage } from './pages/PoliticalTradingPage';
import { ProfilePage } from './pages/ProfilePage';
import { Toaster } from './components/ui/sonner';

type Page = 'landing' | 'auth' | 'dashboard' | 'prediction' | 'news' | 'trends' | 'political' | 'profile';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  const navigateToAuth = () => setCurrentPage('auth');
  const navigateToDashboard = () => setCurrentPage('dashboard');
  const navigateToPage = (page: Page) => setCurrentPage(page);

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage onNavigateToAuth={navigateToAuth} />
      )}
      
      {currentPage === 'auth' && (
        <AuthPage onAuthSuccess={navigateToDashboard} />
      )}
      
      {currentPage === 'dashboard' && (
        <DashboardPage onNavigate={navigateToPage} />
      )}
      
      {currentPage === 'prediction' && (
        <PredictionEnginePage onNavigate={navigateToPage} />
      )}
      
      {currentPage === 'news' && (
        <NewsFeedPage onNavigate={navigateToPage} />
      )}
      
      {currentPage === 'trends' && (
        <GoogleTrendsPage onNavigate={navigateToPage} />
      )}
      
      {currentPage === 'political' && (
        <PoliticalTradingPage onNavigate={navigateToPage} />
      )}
      
      {currentPage === 'profile' && (
        <ProfilePage onNavigate={navigateToPage} />
      )}
      
      <Toaster 
        theme="dark"
        position="top-right"
        richColors
      />
    </>
  );
}
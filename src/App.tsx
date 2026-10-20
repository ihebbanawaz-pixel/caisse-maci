import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StockProvider } from './context/StockContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './components/modules/LoginPage';

// 17 Modules Métiers
import { Dashboard } from './components/modules/Dashboard';
import { POSCashRegister } from './components/modules/POSCashRegister';
import { Products } from './components/modules/Products';
import { Categories } from './components/modules/Categories';
import { Warehouses } from './components/modules/Warehouses';
import { StockIn } from './components/modules/StockIn';
import { StockOut } from './components/modules/StockOut';
import { Transfers } from './components/modules/Transfers';
import { Inventory } from './components/modules/Inventory';
import { Suppliers } from './components/modules/Suppliers';
import { Customers } from './components/modules/Customers';
import { Purchases } from './components/modules/Purchases';
import { Sales } from './components/modules/Sales';
import { History } from './components/modules/History';
import { Reports } from './components/modules/Reports';
import { UsersModule } from './components/modules/UsersModule';
import { SettingsModule } from './components/modules/SettingsModule';

const MainApp: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [filterTerm, setFilterTerm] = useState('');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white text-sm font-semibold">
        Chargement de Stock Pro...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const handleNavigate = (viewId: string, filter?: string) => {
    setCurrentView(viewId);
    setFilterTerm(filter || '');
  };

  const renderCurrentModule = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'pos':
        return <POSCashRegister />;
      case 'products':
        return <Products initialSearch={filterTerm} />;
      case 'categories':
        return <Categories />;
      case 'warehouses':
        return <Warehouses />;
      case 'stock_in':
        return <StockIn onSuccess={() => setCurrentView('history')} />;
      case 'stock_out':
        return <StockOut onSuccess={() => setCurrentView('history')} />;
      case 'transfers':
        return <Transfers onSuccess={() => setCurrentView('transfers')} />;
      case 'inventory':
        return <Inventory />;
      case 'suppliers':
        return <Suppliers initialSearch={filterTerm} />;
      case 'customers':
        return <Customers initialSearch={filterTerm} />;
      case 'purchases':
        return <Purchases initialSearch={filterTerm} />;
      case 'sales':
        return <Sales initialSearch={filterTerm} />;
      case 'history':
        return <History initialFilter={filterTerm} />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <UsersModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans antialiased text-slate-900 overflow-hidden select-none">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header currentView={currentView} onNavigate={handleNavigate} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {renderCurrentModule()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StockProvider>
        <MainApp />
      </StockProvider>
    </AuthProvider>
  );
}

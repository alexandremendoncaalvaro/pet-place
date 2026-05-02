import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { LogOut, Home, PieChart, ShieldCheck, AlertCircle, User, Bell } from 'lucide-react';
import { cn } from './lib/utils';
import { ResidentDashboard } from './components/ResidentDashboard';
import { TransparenciaView } from './components/TransparenciaView';
import { AdminPanel } from './components/AdminPanel';
import { ProfileView } from './components/ProfileView';
import { MuralView } from './components/MuralView';
import { DirectoryView } from './components/DirectoryView';
import { GlobalModals } from './components/GlobalModals';
import { CreatePostModal } from './components/CreatePostModal';
import { Plus } from 'lucide-react';
import { Button, IconButton } from './components/ui';

export function MainApp() {
  const { user, login, logout, loading, isRealBackend, toggleMockRole, myNotifications } = useApp();
  const [activeTab, setActiveTab] = useState<'home' | 'mural' | 'transparencia' | 'admin' | 'perfil' | 'directory'>('home');
  const [showCreatePost, setShowCreatePost] = useState(false);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500 animate-pulse text-lg">Carregando Caixinha...</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="bg-white max-w-sm w-full p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <PieChart size={32} />
          </div>
          <h1 className="text-2xl font-semibold mb-2 text-gray-800">Caixinha Pet Place</h1>
          <p className="text-gray-500 mb-8 max-w-xs text-sm">Transparência e facilidade para a manutenção do nosso espaço.</p>
          <button 
            onClick={login}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-2xl transition-colors active:scale-95 touch-manipulation"
          >
            Entrar com Google
          </button>
          {!isRealBackend && (
            <div className="mt-6 flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
              <AlertCircle size={14} className="mr-2" /> Modo Demo (Sem Backend)
            </div>
          )}
        </div>
      </div>
    );
  }

  if (user.userStatus === 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="bg-white max-w-sm w-full p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-semibold mb-2 text-gray-800">Acesso Pendente</h1>
          <p className="text-gray-500 mb-8 max-w-xs text-sm">Seu cadastro foi recebido! O administrador aprovará o seu acesso em breve.</p>
          <button 
            onClick={logout}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-4 px-6 rounded-2xl transition-colors active:scale-95 touch-manipulation"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (user.userStatus === 'blocked') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="bg-white max-w-sm w-full p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-semibold mb-2 text-gray-800">Acesso Bloqueado</h1>
          <p className="text-gray-500 mb-8 max-w-xs text-sm">Sua conta foi bloqueada. Entre em contato com a administração.</p>
          <button 
            onClick={logout}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-4 px-6 rounded-2xl transition-colors active:scale-95 touch-manipulation"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  const unreadCount = myNotifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="flex flex-col min-h-screen bg-ink-50 pb-20">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-ink-100 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('perfil')}
            className="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold uppercase overflow-hidden border border-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-500 active:scale-95 transition-transform"
            aria-label="Meu Perfil"
          >
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0)
            )}
          </button>
          <div className="flex flex-col">
            <h1 className="font-semibold text-ink-900 leading-tight">Olá, {user.name.split(' ')[0]}</h1>
            {user.role === 'admin' && (
              <span className="text-xs text-ink-400">Admin</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            onClick={() => setActiveTab('mural')}
            className="text-ink-400 hover:text-brand-600 relative"
            aria-label="Avisos"
          >
            <Bell size={20} className={unreadCount > 0 ? 'text-brand-600' : ''} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            )}
          </IconButton>
          <IconButton onClick={logout} className="-mr-2 text-ink-400 hover:text-ink-700" aria-label="Sair">
            <LogOut size={20} />
          </IconButton>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'home' && <ResidentDashboard />}
        {activeTab === 'mural' && <MuralView />}
        {activeTab === 'transparencia' && <TransparenciaView />}
        {activeTab === 'directory' && <DirectoryView />}
        {activeTab === 'perfil' && <ProfileView />}
        {activeTab === 'admin' && user.role === 'admin' && <AdminPanel />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-ink-100 fixed bottom-0 left-0 w-full z-20 px-2 sm:px-6 py-2 pb-safe flex justify-around items-center">
        <NavItem 
          active={activeTab === 'home'} 
          onClick={() => setActiveTab('home')} 
          icon={<Home size={22} />} 
          label="Início" 
        />
        <NavItem 
          active={activeTab === 'directory'} 
          onClick={() => setActiveTab('directory')} 
          icon={<User size={22} />} 
          label="Comunidade" 
        />
        <NavItem 
          active={activeTab === 'mural'} 
          onClick={() => setActiveTab('mural')} 
          icon={
            <div className="relative">
              <Bell size={22} />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border border-white rounded-full"></span>}
            </div>
          } 
          label="Mural" 
        />
        <NavItem 
          active={activeTab === 'transparencia'} 
          onClick={() => setActiveTab('transparencia')} 
          icon={<PieChart size={22} />} 
          label="Extrato" 
        />
        {user.role === 'admin' && (
          <NavItem 
            active={activeTab === 'admin'} 
            onClick={() => setActiveTab('admin')} 
            icon={<ShieldCheck size={22} />} 
            label="Admin" 
          />
        )}
      </nav>

      {/* Dev toggle */}
      {!isRealBackend && (
        <Button onClick={toggleMockRole} size="sm" className="fixed bottom-28 right-4 z-50 bg-ink-900 text-white">
          Trocar Papel Demo
        </Button>
      )}

      {/* Floating Action Button for Posting */}
      {activeTab === 'home' && (
        <button
          onClick={() => setShowCreatePost(true)}
          className="fixed bottom-[80px] sm:bottom-24 right-4 sm:right-6 bg-brand-600 hover:bg-brand-700 text-white w-14 h-14 rounded-full shadow-lg shadow-brand-600/30 flex items-center justify-center transition-transform active:scale-90 z-20"
          aria-label="Nova publicação"
        >
          <Plus size={28} />
        </button>
      )}

      {showCreatePost && <CreatePostModal onClose={() => setShowCreatePost(false)} />}
      <GlobalModals />
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-2 min-w-[64px] transition-colors active:scale-95 touch-manipulation",
        active ? "text-brand-600" : "text-ink-400"
      )}
    >
      <div className={cn("mb-1", active && "animate-bounce")}>{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

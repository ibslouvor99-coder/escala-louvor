import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { Calendar, Users, CheckCircle2, XCircle, Clock, User, ChevronRight, Check, X, Eye, EyeOff, LogOut, MoreVertical } from 'lucide-react';

// ==========================================
// 1. FIREBASE INITIALIZATION (OUTSIDE COMPONENT)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBQ6p6JrhvDMKFXxV3azCo0uyX0lTXK6QM",
  authDomain: "escala-de-louvor-12a01.firebaseapp.com",
  projectId: "escala-de-louvor-12a01",
  storageBucket: "escala-de-louvor-12a01.firebasestorage.app",
  messagingSenderId: "875236564692",
  appId: "1:875236564692:web:2db9f4053555b08a60e541"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'escala-louvor-app';

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
const getUpcomingServiceDates = (weeks = 4) => {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    // 0 = Domingo, 3 = Quarta-feira
    if (d.getDay() === 0 || d.getDay() === 3) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
  }
  return dates;
};

const formatDateToPTBR = (dateString) => {
  const [year, month, day] = dateString.split('-');
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', { 
    day: '2-digit', 
    month: 'long' 
  }).format(date);
};

const getDayOfWeek = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return new Date(year, month - 1, day).getDay() === 0 ? 'Domingo' : 'Quarta-feira';
};

// ==========================================
// 3. MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  
  const [activeTab, setActiveTab] = useState('minha-disponibilidade');

  // INITIALIZE AUTHENTICATION
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
        setAuthError(null);
      } catch (error) {
        console.error("Erro na autenticação:", error);
        setAuthError(error.code || error.message);
        setAuthLoading(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // FETCH DATA FROM FIRESTORE
  useEffect(() => {
    if (!user) return;

    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data());
      setAllUsers(usersData);
    }, (error) => console.error("Erro ao carregar usuários:", error));

    const availRef = collection(db, 'artifacts', appId, 'public', 'data', 'availabilities');
    const unsubAvail = onSnapshot(availRef, (snapshot) => {
      setAvailabilities(snapshot.docs.map(doc => doc.data()));
    }, (error) => console.error("Erro ao carregar disponibilidades:", error));

    return () => {
      unsubUsers();
      unsubAvail();
    };
  }, [user]);

  const handleLogout = () => {
    setActiveProfileId(null);
    setActiveTab('minha-disponibilidade');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-500 animate-pulse">
          <Clock className="w-10 h-10 mx-auto mb-4" />
          <p className="text-lg">Carregando aplicativo...</p>
        </div>
      </div>
    );
  }

  if (authError || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 border border-amber-200 text-center">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Quase lá! Falta ativar o Firebase</h2>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            O seu projeto foi conectado, mas você ainda precisa ativar o <strong>Login Anônimo</strong> e o <strong>Firestore Database</strong> lá no painel do Firebase.
          </p>
          <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 font-mono mb-5">
            Erro: {authError || 'Aguardando configuração'}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
          >
            Já ativei, tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const dbUser = allUsers.find(u => u.uid === activeProfileId) || null;

  if (!dbUser) {
    return <LoginScreen allUsers={allUsers} onLogin={setActiveProfileId} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isLeader={dbUser?.role === 'lider'} 
        userName={dbUser?.name}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-20 md:pb-0 h-screen overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <header className="mb-8 flex justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                {activeTab === 'minha-disponibilidade' ? 'Minha Disponibilidade' : 'Painel da Liderança'}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeTab === 'minha-disponibilidade' 
                  ? 'Marque os cultos em que você poderá ministrar.' 
                  : 'Visão geral das escalas e disponibilidade da equipe.'}
              </p>
            </div>
            
            <button
               onClick={handleLogout}
               className="md:hidden flex-shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
               title="Sair / Trocar Usuário"
            >
               <LogOut size={22} />
            </button>
          </header>

          {activeTab === 'minha-disponibilidade' ? (
             <AvailabilityView 
               user={dbUser} 
               availabilities={availabilities} 
             />
          ) : (
             <DashboardView 
               allUsers={allUsers} 
               availabilities={availabilities} 
             />
          )}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// COMPONENTS
// ==========================================

function LoginScreen({ allUsers, onLogin }) {
  const [mode, setMode] = useState(allUsers.length > 0 ? 'select' : 'create');
  const [name, setName] = useState('');
  const [role, setRole] = useState('membro');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    if (role === 'lider' && password !== 'louvoradm10') {
      setPasswordError('Senha incorreta.');
      return;
    }
    
    setPasswordError('');
    setLoading(true);
    try {
      const newUid = crypto.randomUUID();
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', newUid);
      await setDoc(userRef, {
        uid: newUid,
        name: name.trim(),
        role: role,
        joinedAt: new Date().toISOString()
      });
      onLogin(newUid);
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      setLoading(false);
    }
  };

  if (mode === 'select' && allUsers.length > 0) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Quem está acessando?</h2>
          <p className="text-center text-slate-500 mb-6">Selecione seu perfil para continuar</p>

          <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-2">
            {allUsers.map(u => (
              <button
                key={u.uid}
                onClick={() => onLogin(u.uid)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${u.role === 'lider' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{u.role}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            ))}
          </div>

          <button
            onClick={() => setMode('create')}
            className="w-full py-3 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
          >
            Criar Novo Perfil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Bem-vindo à Escala!</h2>
        <p className="text-center text-slate-500 mb-8">Como você gostaria de ser identificado?</p>
        
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome Completo</label>
            <input
              type="text"
              required
              placeholder="Ex: João Silva"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sua Função</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('membro')}
                className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                  role === 'membro' 
                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Integrante
              </button>
              <button
                type="button"
                onClick={() => setRole('lider')}
                className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                  role === 'lider' 
                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Líder
              </button>
            </div>
          </div>

          {role === 'lider' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha de Acesso (Líder)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Digite a senha"
                  className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                    passwordError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'
                  } focus:ring-2 focus:border-transparent outline-none transition-all`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </div>
          )}

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Entrar no Aplicativo'}
            </button>
            
            {allUsers.length > 0 && (
              <button
                type="button"
                onClick={() => setMode('select')}
                className="w-full py-3 text-slate-500 font-medium hover:bg-slate-100 rounded-lg transition-colors border border-transparent"
              >
                Voltar para seleção
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Navigation({ activeTab, setActiveTab, isLeader, userName, onLogout }) {
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  
  const navItems = [
    { id: 'minha-disponibilidade', label: 'Minhas Datas', icon: Calendar },
    ...(isLeader ? [{ id: 'lideranca', label: 'Liderança', icon: Users }] : [])
  ];

  return (
    <>
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-blue-600" />
            Escala
          </h2>
        </div>
        
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <button 
              onClick={() => setShowLogoutMenu(!showLogoutMenu)}
              className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 p-3 rounded-xl transition-colors border border-slate-200"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                 <User size={16} className="text-blue-500 flex-shrink-0" />
                 <span className="truncate">{userName}</span>
              </div>
              <MoreVertical size={14} className="text-slate-400" />
            </button>
            
            {showLogoutMenu && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-lg rounded-lg overflow-hidden z-10">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
                >
                  <LogOut size={16} />
                  Sair / Trocar Login
                </button>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-blue-600' : 'text-slate-400'} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <nav className="flex justify-around p-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center p-2 min-w-[80px] rounded-xl transition-all ${
                activeTab === item.id ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <div className={`p-1.5 rounded-lg mb-1 ${activeTab === item.id ? 'bg-blue-50' : 'bg-transparent'}`}>
                <item.icon size={24} />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

function AvailabilityView({ user, availabilities }) {
  const dates = useMemo(() => getUpcomingServiceDates(5), []);
  const [processingDate, setProcessingDate] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleToggleAvailability = async (date, isAvailable) => {
    if (!user) return;
    setProcessingDate(date);
    
    try {
      const docId = `${user.uid}_${date}`;
      const availRef = doc(db, 'artifacts', appId, 'public', 'data', 'availabilities', docId);
      
      await setDoc(availRef, {
        userId: user.uid,
        userName: user.name,
        date: date,
        isAvailable: isAvailable,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao salvar disponibilidade:", error);
    } finally {
      setProcessingDate(null);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <CheckCircle2 size={48} className="text-green-500" />
        </div>
        <h3 className="text-3xl font-bold text-slate-800 mb-4">Tudo Certo, {user?.name?.split(' ')[0]}!</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg leading-relaxed">
          Suas respostas foram enviadas para a liderança. Muito obrigado pela sua disponibilidade!
        </p>
        <button
          onClick={() => setIsSubmitted(false)}
          className="text-blue-600 font-medium py-3 px-6 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all"
        >
          Revisar ou alterar respostas
        </button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dates.map((date) => {
          const answer = availabilities.find(a => a.userId === user?.uid && a.date === date);
          const hasAnswered = !!answer;
          const isAvailable = answer?.isAvailable;
          const isProcessing = processingDate === date;

          return (
            <div key={date} className={`bg-white rounded-2xl p-5 border transition-all shadow-sm
              ${hasAnswered ? (isAvailable ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30') : 'border-slate-200'}`}>
              
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {getDayOfWeek(date)}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-800 capitalize mt-1">
                    {formatDateToPTBR(date)}
                  </h3>
                </div>
                {hasAnswered && (
                  <div className={`p-1.5 rounded-full ${isAvailable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {isAvailable ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleToggleAvailability(date, true)}
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all border
                    ${hasAnswered && isAvailable 
                      ? 'bg-green-500 text-white border-green-600 shadow-sm' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-green-500 hover:text-green-600'
                    } disabled:opacity-50`}
                >
                  <Check size={16} />
                  Disponível
                </button>
                
                <button
                  onClick={() => handleToggleAvailability(date, false)}
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all border
                    ${hasAnswered && !isAvailable 
                      ? 'bg-red-500 text-white border-red-600 shadow-sm' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-red-500 hover:text-red-600'
                    } disabled:opacity-50`}
                >
                  <X size={16} />
                  Indisponível
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex flex-col items-center border-t border-slate-200 pt-8">
        <p className="text-sm text-slate-500 mb-4 text-center">
          Já revisou e marcou todas as suas datas?
        </p>
        <button
          onClick={() => setIsSubmitted(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-10 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
        >
          <CheckCircle2 size={24} />
          Confirmar e Finalizar
        </button>
      </div>
    </div>
  );
}

function DashboardView({ allUsers, availabilities }) {
  const dates = useMemo(() => getUpcomingServiceDates(5), []);
  const [expandedDate, setExpandedDate] = useState(dates[0]);

  return (
    <div className="space-y-4">
      {dates.map((date) => {
        const isExpanded = expandedDate === date;
        
        const dateAvails = availabilities.filter(a => a.date === date);
        const availableUsers = dateAvails.filter(a => a.isAvailable);
        const unavailableUsers = dateAvails.filter(a => !a.isAvailable);
        
        const answeredUserIds = dateAvails.map(a => a.userId);
        const pendingUsers = allUsers.filter(u => !answeredUserIds.includes(u.uid));

        return (
          <div key={date} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => setExpandedDate(isExpanded ? null : date)}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50 transition-colors"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {getDayOfWeek(date)}
                </span>
                <h3 className="text-lg font-semibold text-slate-800 capitalize mt-1">
                  {formatDateToPTBR(date)}
                </h3>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={14} /> {availableUsers.length}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                    <XCircle size={14} /> {unavailableUsers.length}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <Clock size={14} /> {pendingUsers.length}
                  </span>
                </div>
                <ChevronRight className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Disponíveis ({availableUsers.length})
                    </h4>
                    {availableUsers.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Ninguém marcado.</p>
                    ) : (
                      <ul className="space-y-2">
                        {availableUsers.map(a => (
                          <li key={a.userId} className="flex items-center gap-2 text-sm text-slate-700 bg-white p-2 rounded-lg border border-green-100 shadow-sm">
                            <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                            <span className="truncate font-medium">{a.userName}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      Indisponíveis ({unavailableUsers.length})
                    </h4>
                    {unavailableUsers.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Ninguém marcado.</p>
                    ) : (
                      <ul className="space-y-2">
                        {unavailableUsers.map(a => (
                          <li key={a.userId} className="flex items-center gap-2 text-sm text-slate-600 bg-white p-2 rounded-lg border border-red-100 opacity-80">
                            <XCircle size={16} className="text-red-400 flex-shrink-0" />
                            <span className="truncate line-through decoration-slate-300">{a.userName}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                      Pendentes ({pendingUsers.length})
                    </h4>
                    {pendingUsers.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Todos responderam!</p>
                    ) : (
                      <ul className="space-y-2">
                        {pendingUsers.map(u => (
                          <li key={u.uid} className="flex items-center gap-2 text-sm text-slate-500 bg-white p-2 rounded-lg border border-slate-100 border-dashed">
                            <Clock size={16} className="text-slate-300 flex-shrink-0" />
                            <span className="truncate">{u.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
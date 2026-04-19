import React, { useState, useEffect, useMemo } from 'react';
import { 
  loginWithGoogle, 
  loginWithGoogleRedirect,
  logout, 
  auth, 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp, 
  orderBy,
  getDocs,
  limit,
  handleFirestoreError,
  OperationType
} from './firebase';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  Wallet, 
  TrendingUp, 
  Calendar,
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  X,
  CreditCard,
  Smartphone,
  Globe,
  Share2,
  Download,
  Mic,
  BarChart2,
  PieChart as PieChartIcon,
  User as UserIcon,
  BarChart3,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './components/Logo';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

import { useLanguage } from './LanguageContext';

// --- Types ---

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  monthlyBudget: number;
}

interface BazarList {
  id: string;
  userId: string;
  name: string;
  date: any;
  totalCost: number;
  status: 'active' | 'completed';
  targetBudget?: number;
}

interface BazarItem {
  id: string;
  listId: string;
  userId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  estimatedPrice: number;
  actualPrice: number;
  isBought: boolean;
}

const UNITS = ['kg', 'gm', 'ltr', 'piece', 'packet', 'dozen'];

// --- Components ---

const Modal = ({ isOpen, onClose, title, message, onConfirm, confirmLabel, cancelLabel, isAlert = false }: { 
  isOpen: boolean, 
  onClose: () => void, 
  title: string, 
  message: string, 
  onConfirm?: () => void, 
  confirmLabel?: string, 
  cancelLabel?: string,
  isAlert?: boolean
}) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl"
      >
        <h3 className="text-lg font-bold text-zinc-900 mb-2">{title}</h3>
        <p className="text-zinc-500 mb-6">{message}</p>
        <div className="flex gap-3">
          {!isAlert && (
            <button 
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              {cancelLabel || t('cancel')}
            </button>
          )}
          <button 
            onClick={async () => {
              if (onConfirm) {
                try {
                  await onConfirm();
                } catch (error) {
                  console.error('Error in modal confirm:', error);
                }
              }
              onClose();
            }}
            className={`flex-1 py-3 text-white rounded-xl font-bold transition-all ${isAlert ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {confirmLabel || t('confirm')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const { t } = useLanguage();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('Firestore Error')) {
        setHasError(true);
        try {
          const info = JSON.parse(event.message.replace('Firestore Error: ', ''));
          setErrorMessage(`Database Error: ${info.error} during ${info.operationType} at ${info.path}`);
        } catch {
          setErrorMessage(event.message);
        }
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-xl border border-red-100">
          <h2 className="text-xl font-bold text-red-600 mb-2">{t('somethingWentWrong')}</h2>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            {t('reloadApp')}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const { t, language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lists' | 'history' | 'settings' | 'insights'>('dashboard');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    isAlert?: boolean;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({ isOpen: true, title, message, onConfirm, isAlert: false });
  };

  const showAlert = (title: string, message: string) => {
    setModalConfig({ isOpen: true, title, message, isAlert: true, confirmLabel: t('ok') });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  // Tab Switcher Listener
  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      if (e.detail) setActiveTab(e.detail);
    };
    const handleSelectList = (e: any) => {
      if (e.detail) setSelectedListId(e.detail);
    };
    window.addEventListener('set-active-tab', (handleTabSwitch as EventListener));
    window.addEventListener('select-list', (handleSelectList as EventListener));
    return () => {
      window.removeEventListener('set-active-tab', (handleTabSwitch as EventListener));
      window.removeEventListener('select-list', (handleSelectList as EventListener));
    };
  }, []);

  // Auth Listener
  useEffect(() => {
    // Check for redirect result
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect result error:', error);
      setLoginError(`${t('loginError')} (${error.code || 'unknown'})`);
    });

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync profile
        const userRef = doc(db, 'users', u.uid);
        try {
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName || 'User',
              email: u.email || '',
              monthlyBudget: 0
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error('Profile sync error:', error);
          // Don't throw here, just log it. The user is still authenticated.
          // We can show a fallback profile.
          setProfile({
            uid: u.uid,
            displayName: u.displayName || 'User',
            email: u.email || '',
            monthlyBudget: 0
          });
        }
      } else {
        setProfile(null);
      }
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-emerald-600 font-bold text-2xl"
        >
          {t('appName')}
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-24 h-24 gradient-brand rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-200 overflow-hidden p-4">
            <Logo className="w-full h-full" size={64} />
          </div>
          <h1 className="text-4xl font-black text-zinc-900 mb-3 tracking-tight">{t('appName')}</h1>
          <p className="text-zinc-500 mb-10 text-lg">{t('appTagline')}</p>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex flex-col items-center gap-2">
              <p>{loginError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-xs underline font-bold"
              >
                {language === 'bn' ? 'পেজ রিফ্রেশ করুন' : 'Refresh Page'}
              </button>
            </div>
          )}

          <button 
            disabled={isLoggingIn}
            onClick={async () => {
              setIsLoggingIn(true);
              setLoginError(null);
              try {
                await loginWithGoogle();
              } catch (error: any) {
                console.error('Login failed:', error);
                let message = t('loginError');
                if (error.code === 'auth/popup-blocked') {
                  message = language === 'bn' ? 'পপ-আপ ব্লক করা হয়েছে। অনুগ্রহ করে ব্রাউজারে পপ-আপ অনুমতি দিন।' : 'Popup blocked. Please allow popups in your browser.';
                } else if (error.code === 'auth/network-request-failed') {
                  message = language === 'bn' ? 'নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট কানেকশন চেক করুন।' : 'Network error. Please check your internet connection.';
                } else if (error.code === 'auth/popup-closed-by-user') {
                  message = language === 'bn' ? 'লগইন উইন্ডোটি বন্ধ করা হয়েছে। আবার চেষ্টা করুন।' : 'Login window closed. Please try again.';
                } else if (error.code === 'auth/unauthorized-domain') {
                  message = language === 'bn' ? 'এই ডোমেইনটি অথরাইজড নয়। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।' : 'Unauthorized domain. Please contact the administrator.';
                } else if (error.code) {
                  message = `${t('loginError')} (${error.code})`;
                }
                setLoginError(message);
              } finally {
                setIsLoggingIn(false);
              }
            }}
            className={`w-full py-5 gradient-brand text-white rounded-2xl font-bold shadow-xl shadow-brand-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoggingIn ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="" />
            )}
            {isLoggingIn ? t('loggingIn') : t('loginWithGoogle')}
          </button>

          {loginError && (
            <button 
              onClick={async () => {
                setIsLoggingIn(true);
                setLoginError(null);
                try {
                  await loginWithGoogleRedirect();
                } catch (error: any) {
                  console.error('Redirect failed:', error);
                  setLoginError(`${t('loginError')} (${error.code || 'unknown'})`);
                } finally {
                  setIsLoggingIn(false);
                }
              }}
              className="mt-4 text-emerald-600 font-bold text-sm hover:underline"
            >
              {language === 'bn' ? 'লগইন করতে সমস্যা হচ্ছে? অন্যভাবে চেষ্টা করুন' : 'Having trouble? Try another way'}
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-50 pb-28">
        <header className="bg-white/80 backdrop-blur-md border-b border-zinc-100 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand-100 overflow-hidden p-2">
              <Logo className="w-full h-full" size={24} />
            </div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">{t('appName')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-zinc-900 leading-none mb-1">{profile?.displayName}</p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{profile?.email}</p>
            </div>
            <div className="relative">
              <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-2xl border-2 border-white shadow-md" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-500 border-2 border-white rounded-full shadow-sm" />
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto p-6">
          <AnimatePresence mode="wait">
            {selectedListId ? (
              <BazarListDetail 
                listId={selectedListId} 
                onBack={() => setSelectedListId(null)} 
                userId={user.uid}
                showConfirm={showConfirm}
                showAlert={showAlert}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && <Dashboard profile={profile} userId={user.uid} />}
                {activeTab === 'lists' && <BazarLists userId={user.uid} onSelectList={setSelectedListId} filter="active" showConfirm={showConfirm} showAlert={showAlert} />}
                {activeTab === 'history' && <BazarLists userId={user.uid} onSelectList={setSelectedListId} filter="completed" showConfirm={showConfirm} showAlert={showAlert} />}
                {activeTab === 'insights' && <Insights userId={user.uid} />}
                {activeTab === 'settings' && <BudgetSettings profile={profile} userId={user.uid} showAlert={showAlert} />}
              </>
            )}
          </AnimatePresence>
        </main>

        {!selectedListId && (
          <nav className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-lg border border-zinc-100 px-4 py-3 rounded-3xl flex justify-around items-center z-40 shadow-2xl shadow-black/5">
            <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard className="w-5 h-5" />} label={t('dashboard')} />
            <NavButton active={activeTab === 'lists'} onClick={() => setActiveTab('lists')} icon={<Logo size={20} className={activeTab === 'lists' ? 'bg-white' : 'bg-zinc-400'} />} label={t('lists')} />
            <NavButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon={<BarChart2 className="w-5 h-5" />} label={t('insights')} />
            <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="w-5 h-5" />} label={t('history')} />
            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings className="w-5 h-5" />} label={t('settings')} />
          </nav>
        )}

        <Modal 
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          title={modalConfig.title}
          message={modalConfig.message}
          onConfirm={modalConfig.onConfirm}
          isAlert={modalConfig.isAlert}
          confirmLabel={modalConfig.confirmLabel}
        />
      </div>
    </ErrorBoundary>
  );
}

// --- Sub-components ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all relative py-1 ${active ? 'text-brand-600' : 'text-zinc-400 hover:text-zinc-600'}`}
    >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-brand-50 shadow-sm' : 'bg-transparent'}`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider transition-all ${active ? 'opacity-100 scale-100' : 'opacity-60 scale-95'}`}>{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -bottom-1 w-1 h-1 bg-brand-600 rounded-full"
        />
      )}
    </button>
  );
}

function Dashboard({ profile, userId }: { profile: UserProfile | null, userId: string }) {
  const { t, language } = useLanguage();
  const [lists, setLists] = useState<BazarList[]>([]);
  
  useEffect(() => {
    const q = query(
      collection(db, 'bazarLists'),
      where('userId', '==', userId),
      orderBy('date', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setLists(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BazarList)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bazarLists'));
    return unsubscribe;
  }, [userId]);

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthName = now.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' });
    
    const monthLists = lists.filter(l => {
      const d = l.date.toDate();
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalSpent = monthLists.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
    const budget = profile?.monthlyBudget || 0;
    const remaining = budget - totalSpent;
    const percentage = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

    // Prepare chart data
    const chartData = monthLists.map(l => ({
      name: l.date.toDate().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric' }),
      amount: l.totalCost || 0
    }));

    return { totalSpent, budget, remaining, percentage, count: monthLists.length, monthName, chartData };
  }, [lists, profile, language]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="gradient-brand rounded-[2.5rem] p-8 text-white shadow-2xl shadow-brand-200 relative overflow-hidden">
        <div className="absolute top-[-40px] right-[-40px] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-black/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full">
              <Calendar className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{currentMonthStats.monthName} {language === 'bn' ? '২০২৬' : '2026'}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t('budgetTracker')}</span>
          </div>
          
          <p className="text-brand-100 text-sm font-medium mb-1">{t('totalSpent')}</p>
          <h2 className="text-5xl font-black mb-8 tracking-tight">৳ {currentMonthStats.totalSpent.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</h2>
          
          <div className="space-y-4 bg-black/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="flex justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3 h-3" />
                {t('monthlyBudget')}: ৳ {currentMonthStats.budget.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </span>
              <span className="bg-white text-brand-700 px-2 py-0.5 rounded-md">{currentMonthStats.percentage.toFixed(0)}%</span>
            </div>
            
            <div className="h-3 bg-white/20 rounded-full overflow-hidden border border-white/10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${currentMonthStats.percentage}%` }}
                className={`h-full transition-all duration-700 ease-out ${currentMonthStats.percentage > 90 ? 'bg-red-400' : 'bg-white'}`}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase opacity-60 font-bold">{t('remaining')}</span>
                <p className="text-sm font-bold">৳ {currentMonthStats.remaining.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
              </div>
              {currentMonthStats.budget === 0 && (
                <button 
                  onClick={() => {
                    const event = new CustomEvent('set-active-tab', { detail: 'settings' });
                    window.dispatchEvent(event);
                  }}
                  className="text-[11px] bg-white text-brand-600 px-4 py-2 rounded-xl font-bold hover:bg-brand-50 transition-all shadow-lg active:scale-95"
                >
                  {t('setBudget')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          icon={<Logo size={20} className="bg-emerald-500" />} 
          label={t('monthlySummary')} 
          value={`৳ ${currentMonthStats.totalSpent.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`} 
          color="bg-emerald-50" 
          borderColor="border-emerald-100"
        />
        <StatCard 
          icon={<ShoppingBag className="text-amber-500" />} 
          label={t('bazarTrips')} 
          value={`${currentMonthStats.count} ${language === 'bn' ? 'বার' : 'Trips'}`} 
          color="bg-amber-50" 
          borderColor="border-amber-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <StatCard 
          icon={<CreditCard className="text-indigo-600" />} 
          label={t('monthlyBudget')} 
          value={`৳ ${currentMonthStats.budget.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`} 
          color="bg-indigo-50" 
          borderColor="border-indigo-100"
        />
      </div>

      {currentMonthStats.chartData.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
            </div>
            {t('spendingTrend')}
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentMonthStats.chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#a1a1aa' }} 
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`৳ ${value}`, language === 'bn' ? 'খরচ' : 'Spent']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#22c55e" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-brand-600" />
            </div>
            {t('recentBazar')}
          </h3>
          <button 
            onClick={() => {
              const event = new CustomEvent('set-active-tab', { detail: 'history' });
              window.dispatchEvent(event);
            }}
            className="text-xs font-bold text-brand-600 hover:underline"
          >
            {t('viewAll')}
          </button>
        </div>
        
        <div className="space-y-3">
          {lists.slice(-3).reverse().map(list => (
            <div 
              key={list.id} 
              onClick={() => {
                const event = new CustomEvent('select-list', { detail: list.id });
                window.dispatchEvent(event);
              }}
              className="flex items-center justify-between p-4 rounded-2xl border border-zinc-50 hover:border-brand-100 hover:bg-brand-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-white transition-colors">
                  <Logo size={20} className="bg-zinc-400 group-hover:bg-brand-500" />
                </div>
                <div>
                  <p className="font-bold text-zinc-900 group-hover:text-brand-700 transition-colors">{list.name}</p>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{list.date.toDate().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-zinc-900">৳ {list.totalCost?.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US') || 0}</p>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${list.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {list.status === 'active' ? t('active') : t('completed')}
                </span>
              </div>
            </div>
          ))}
          {lists.length === 0 && (
            <div className="text-center py-10 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
              <p className="text-zinc-400 text-sm">{t('noData')}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, color, borderColor }: { icon: React.ReactNode, label: string, value: string, color: string, borderColor: string }) {
  return (
    <div className={`p-5 rounded-3xl ${color} border ${borderColor} flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      </div>
      <div>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xl font-black text-zinc-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function BazarLists({ userId, onSelectList, filter, showConfirm, showAlert }: { userId: string, onSelectList: (id: string) => void, filter: 'active' | 'completed', showConfirm: (title: string, message: string, onConfirm: () => void) => void, showAlert: (title: string, message: string) => void }) {
  const { t, language } = useLanguage();
  const [lists, setLists] = useState<BazarList[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'bazarLists'),
      where('userId', '==', userId),
      where('status', '==', filter),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setLists(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BazarList)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bazarLists'));
    return unsubscribe;
  }, [userId, filter]);

  const handleAddList = async () => {
    if (!newName.trim()) return;
    try {
      await addDoc(collection(db, 'bazarLists'), {
        userId,
        name: newName,
        date: Timestamp.now(),
        totalCost: 0,
        status: 'active'
      });
      setNewName('');
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bazarLists');
    }
  };

  const handleDeleteList = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    showConfirm(
      t('deleteList'),
      t('deleteListConfirm'),
      async () => {
        try {
          await deleteDoc(doc(db, 'bazarLists', id));
          showAlert(t('success'), t('listDeleted'));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `bazarLists/${id}`);
        }
      }
    );
  };

  const groupedLists = useMemo(() => {
    if (filter !== 'completed') return null;
    const groups: { monthKey: string, monthName: string, total: number, lists: BazarList[] }[] = [];
    
    lists.forEach(list => {
      const date = list.date.toDate();
      const monthName = date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' });
      const year = date.getFullYear();
      const monthKey = `${monthName} ${year}`;
      
      let group = groups.find(g => g.monthKey === monthKey);
      if (!group) {
        group = { monthKey, monthName: `${monthName} ${year}`, total: 0, lists: [] };
        groups.push(group);
      }
      group.lists.push(list);
      group.total += (list.totalCost || 0);
    });
    
    return groups;
  }, [lists, filter, language]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">
          {filter === 'active' ? t('activeLists') : t('previousBazar')}
        </h2>
        {filter === 'active' && (
          <button 
            onClick={() => setIsAdding(true)}
            className="p-2 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-4 rounded-2xl border-2 border-emerald-500 shadow-xl mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{t('addNewList')}</h3>
              <button onClick={() => setIsAdding(false)}><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <input 
              autoFocus
              type="text" 
              placeholder={t('listNamePlaceholder')} 
              className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
            />
            <button 
              onClick={handleAddList}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
            >
              {t('create')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {filter === 'completed' && groupedLists ? (
          groupedLists.map(group => (
            <div key={group.monthKey} className="space-y-3 mb-8">
              <div className="flex items-center justify-between px-2 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                  <h3 className="font-black text-zinc-900">{group.monthName}</h3>
                </div>
                <div className="bg-emerald-50 px-3 py-1 rounded-full">
                  <span className="text-[11px] font-bold text-emerald-600">
                    {language === 'bn' ? `মোট: ৳ ${group.total.toLocaleString('bn-BD')}` : `Total: ৳ ${group.total.toLocaleString()}`}
                  </span>
                </div>
              </div>
              <div className="grid gap-3">
                {group.lists.map(list => (
                  <BazarListCard 
                    key={list.id} 
                    list={list} 
                    filter={filter} 
                    onSelectList={onSelectList} 
                    handleDeleteList={handleDeleteList} 
                    language={language} 
                    t={t} 
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          lists.map(list => (
            <BazarListCard 
              key={list.id} 
              list={list} 
              filter={filter} 
              onSelectList={onSelectList} 
              handleDeleteList={handleDeleteList} 
              language={language} 
              t={t} 
            />
          ))
        )}
        
        {lists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-400">{t('noListsFound')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface BazarListCardProps {
  key?: any;
  list: BazarList;
  filter: 'active' | 'completed';
  onSelectList: (id: string) => void;
  handleDeleteList: (e: React.MouseEvent, id: string) => void | Promise<void>;
  language: string;
  t: (key: string) => string;
}

function BazarListCard({ list, filter, onSelectList, handleDeleteList, language, t }: BazarListCardProps) {
  return (
    <motion.div 
      layout
      onClick={() => onSelectList(list.id)}
      className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center justify-between cursor-pointer hover:border-emerald-200 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${filter === 'active' ? 'bg-emerald-50' : 'bg-zinc-50'}`}>
          <Logo size={24} className={filter === 'active' ? 'bg-emerald-600' : 'bg-zinc-400'} />
        </div>
        <div>
          <p className="font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">{list.name}</p>
          <p className="text-xs text-zinc-500">{list.date.toDate().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-bold text-zinc-900">৳ {list.totalCost?.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US') || 0}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${list.status === 'active' ? 'text-emerald-600' : 'text-zinc-400'}`}>
            {list.status === 'active' ? t('active') : t('completed')}
          </p>
        </div>
        <button 
          onClick={(e) => handleDeleteList(e, list.id)}
          className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <ChevronRight className="w-5 h-5 text-zinc-300" />
      </div>
    </motion.div>
  );
}

const CATEGORIES = [
  { name: 'General', icon: <Logo size={16} className="bg-zinc-500" />, color: 'bg-zinc-100 text-zinc-600', hexColor: '#71717a' },
  { name: 'Vegetables', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600', hexColor: '#10b981' },
  { name: 'Meat/Fish', icon: <Logo size={16} className="bg-rose-500" />, color: 'bg-rose-100 text-rose-600', hexColor: '#f43f5e' },
  { name: 'Grocery', icon: <Wallet className="w-4 h-4" />, color: 'bg-amber-100 text-amber-600', hexColor: '#f59e0b' },
  { name: 'Dairy', icon: <Circle className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600', hexColor: '#3b82f6' },
];

function Insights({ userId }: { userId: string }) {
  const { t, language } = useLanguage();
  const [lists, setLists] = useState<BazarList[]>([]);
  const [items, setItems] = useState<BazarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'bazarLists'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BazarList));
      setLists(fetchedLists);
      
      const fetchAllItems = async () => {
        try {
          const allItems: BazarItem[] = [];
          // Fetch items for all fetched lists using nested queries with userId filter
          // This avoids the need for a collectionGroup index while maintaining security
          const itemPromises = fetchedLists.map(list => 
            getDocs(query(
              collection(db, 'bazarLists', list.id, 'items'),
              where('userId', '==', userId)
            ))
          );
          
          const itemSnapshots = await Promise.all(itemPromises);
          itemSnapshots.forEach(snap => {
            snap.forEach(doc => allItems.push({ id: doc.id, ...doc.data() } as BazarItem));
          });
          
          setItems(allItems);
        } catch (error) {
          console.error("Error fetching items for insights:", error);
        } finally {
          setLoading(false);
        }
      };
      
      if (fetchedLists.length > 0) {
        fetchAllItems();
      } else {
        setLoading(false);
      }
    }, (err) => {
      console.error("Insights snapshot error:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  const categoryData = useMemo(() => {
    return CATEGORIES.map(cat => {
      const total = items
        .filter(item => (item.category || 'General') === cat.name)
        .reduce((sum, item) => sum + (item.actualPrice || item.estimatedPrice || 0), 0);
      return { name: t(cat.name), value: total, color: cat.hexColor };
    }).filter(d => d.value > 0);
  }, [items, t]);

  const monthlyData = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'short' });
      
      const total = lists
        .filter(list => {
          const d = list.date.toDate();
          return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        })
        .reduce((sum, list) => sum + (list.totalCost || 0), 0);
        
      return { name: monthName, amount: total };
    }).reverse();
  }, [lists, language]);

  if (loading) return <div className="p-10 text-center text-zinc-400">{t('loading')}</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {categoryData.length > 0 ? (
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm">
          <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-emerald-600" />
            {t('spendingByCategory')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`৳ ${value.toLocaleString()}`, t('total')]}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 border border-zinc-100 shadow-sm text-center">
          <PieChartIcon className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
          <p className="text-zinc-400 font-medium">{t('noDataYet')}</p>
          <p className="text-[10px] text-zinc-300 mt-1 uppercase tracking-wider">{t('addItemsToSeeInsights')}</p>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm">
        <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-brand-600" />
          {t('monthlyComparison')}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`৳ ${value.toLocaleString()}`, t('totalSpent')]}
              />
              <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function BazarListDetail({ listId, onBack, userId, showConfirm, showAlert }: { listId: string, onBack: () => void, userId: string, showConfirm: (title: string, message: string, onConfirm: () => void) => void, showAlert: (title: string, message: string) => void }) {
  const { t, language } = useLanguage();
  const [list, setList] = useState<BazarList | null>(null);
  const [items, setItems] = useState<BazarItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'kg', unitPrice: '', estimatedPrice: '', category: 'General' });
  const [isListening, setIsListening] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<{ amount: number, date: string } | null>(null);

  const fetchLastPurchase = async (itemName: string) => {
    if (!itemName) {
      setLastPurchase(null);
      return;
    }
    try {
      // Find the most recent completed list that contains this item
      const q = query(
        collection(db, 'bazarLists'),
        where('userId', '==', userId),
        where('status', '==', 'completed'),
        orderBy('date', 'desc'),
        limit(5)
      );
      const listsSnap = await getDocs(q);
      for (const listDoc of listsSnap.docs) {
        const itemsSnap = await getDocs(query(
          collection(db, 'bazarLists', listDoc.id, 'items'),
          where('userId', '==', userId),
          where('name', '==', itemName)
        ));
        if (!itemsSnap.empty) {
          const itemData = itemsSnap.docs[0].data();
          setLastPurchase({
            amount: itemData.unitPrice || 0,
            date: listDoc.data().date.toDate().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')
          });
          return;
        }
      }
      setLastPurchase(null);
    } catch (e) {
      console.error("Error fetching last purchase:", e);
      setLastPurchase(null);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showAlert(t('error'), 'Speech recognition not supported');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNewItem(prev => {
        const updated = { ...prev, name: transcript };
        fetchLastPurchase(transcript);
        return updated;
      });
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
      showAlert(t('error'), t('voiceError'));
    };
    recognition.start();
  };

  useEffect(() => {
    const listRef = doc(db, 'bazarLists', listId);
    const unsubList = onSnapshot(listRef, (snap) => {
      if (snap.exists()) setList({ id: snap.id, ...snap.data() } as BazarList);
    }, (err) => handleFirestoreError(err, OperationType.GET, `bazarLists/${listId}`));

    const itemsQuery = query(
      collection(db, 'bazarLists', listId, 'items'),
      where('userId', '==', userId)
    );
    const unsubItems = onSnapshot(itemsQuery, (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BazarItem)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `bazarLists/${listId}/items`));

    return () => {
      unsubList();
      unsubItems();
    };
  }, [listId]);

  const calculateTotal = (itemList: BazarItem[]) => {
    return itemList.reduce((acc, curr) => {
      if (!curr.isBought) return acc;
      const price = curr.actualPrice > 0 ? curr.actualPrice : (curr.estimatedPrice || 0);
      return acc + price;
    }, 0);
  };

  const calculateItemPrice = (quantity: number, unitPrice: number, unit: string) => {
    if (unit === 'gm') {
      return (quantity / 1000) * unitPrice;
    }
    return quantity * unitPrice;
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return;
    try {
      const quantity = Number(newItem.quantity) || 0;
      const unitPrice = Number(newItem.unitPrice) || 0;
      const actualPrice = calculateItemPrice(quantity, unitPrice, newItem.unit);

      await addDoc(collection(db, 'bazarLists', listId, 'items'), {
        listId,
        userId,
        name: newItem.name,
        quantity,
        unit: newItem.unit,
        unitPrice,
        estimatedPrice: actualPrice,
        actualPrice: actualPrice,
        isBought: false,
        category: newItem.category
      });
      setNewItem({ name: '', quantity: '', unit: 'kg', unitPrice: '', estimatedPrice: '', category: 'General' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `bazarLists/${listId}/items`);
    }
  };

  const toggleBought = async (item: BazarItem) => {
    const itemRef = doc(db, 'bazarLists', listId, 'items', item.id);
    try {
      const newIsBought = !item.isBought;
      await updateDoc(itemRef, { isBought: newIsBought });
      
      const updatedItems = items.map(i => i.id === item.id ? { ...i, isBought: newIsBought } : i);
      await updateDoc(doc(db, 'bazarLists', listId), { totalCost: calculateTotal(updatedItems) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bazarLists/${listId}/items/${item.id}`);
    }
  };

  const updateItemField = async (itemId: string, updates: Partial<BazarItem>) => {
    const itemRef = doc(db, 'bazarLists', listId, 'items', itemId);
    try {
      const currentItem = items.find(i => i.id === itemId);
      if (!currentItem) return;

      const updatedItem = { ...currentItem, ...updates };
      
      // Auto-calculate actualPrice if quantity, unitPrice or unit changes
      if ('quantity' in updates || 'unitPrice' in updates || 'unit' in updates) {
        updatedItem.actualPrice = calculateItemPrice(
          updatedItem.quantity || 0, 
          updatedItem.unitPrice || 0, 
          updatedItem.unit
        );
        updates.actualPrice = updatedItem.actualPrice;
      }

      await updateDoc(itemRef, updates);
      const updatedItems = items.map(i => i.id === itemId ? updatedItem : i);
      await updateDoc(doc(db, 'bazarLists', listId), { totalCost: calculateTotal(updatedItems) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bazarLists/${listId}/items/${itemId}`);
    }
  };

  const deleteItem = async (itemId: string) => {
    showConfirm(
      t('deleteItem'),
      t('deleteItemConfirm'),
      async () => {
        console.log('Attempting to delete item:', itemId);
        try {
          await deleteDoc(doc(db, 'bazarLists', listId, 'items', itemId));
          const updatedItems = items.filter(i => i.id !== itemId);
          await updateDoc(doc(db, 'bazarLists', listId), { totalCost: calculateTotal(updatedItems) });
          console.log('Item deleted successfully:', itemId);
        } catch (error) {
          console.error('Error deleting item:', error);
          handleFirestoreError(error, OperationType.DELETE, `bazarLists/${listId}/items/${itemId}`);
        }
      }
    );
  };

  const handleDeleteList = async () => {
    showConfirm(
      t('deleteList'),
      t('deleteListConfirm'),
      async () => {
        console.log('Attempting to delete list from detail view:', listId);
        try {
          await deleteDoc(doc(db, 'bazarLists', listId));
          console.log('List deleted successfully from detail view:', listId);
          onBack();
          showAlert(t('success'), t('listDeleted'));
        } catch (error) {
          console.error('Error deleting list from detail view:', error);
          handleFirestoreError(error, OperationType.DELETE, `bazarLists/${listId}`);
        }
      }
    );
  };

  const completeList = async () => {
    showConfirm(
      t('completeBazar'),
      t('completeBazarConfirm'),
      async () => {
        try {
          await updateDoc(doc(db, 'bazarLists', listId), { status: 'completed' });
          onBack();
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `bazarLists/${listId}`);
        }
      }
    );
  };

  const updateTargetBudget = async (val: number) => {
    try {
      await updateDoc(doc(db, 'bazarLists', listId), { targetBudget: val });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bazarLists/${listId}`);
    }
  };

  const budgetPercentage = useMemo(() => {
    if (!list?.targetBudget || list.targetBudget <= 0) return 0;
    return Math.min((list.totalCost / list.targetBudget) * 100, 100);
  }, [list?.totalCost, list?.targetBudget]);

  const budgetColor = useMemo(() => {
    if (budgetPercentage >= 100) return 'bg-red-500';
    if (budgetPercentage >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [budgetPercentage]);

  const reopenList = async () => {
    showConfirm(
      t('reopenList'),
      t('reopenListConfirm'),
      async () => {
        try {
          await updateDoc(doc(db, 'bazarLists', listId), { status: 'active' });
          showAlert(t('success'), t('reopenList'));
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `bazarLists/${listId}`);
        }
      }
    );
  };

  const shareList = () => {
    const listText = items.map(item => 
      `${item.isBought ? '✅' : '⬜'} ${item.name} - ${item.quantity} ${t(item.unit)}`
    ).join('\n');
    
    const fullText = `${t('appName')}: ${list?.name}\n${t('date')}: ${list?.date.toDate().toLocaleDateString()}\n\n${listText}\n\n${t('totalSpent')}: ৳ ${list?.totalCost}`;
    
    navigator.clipboard.writeText(fullText).then(() => {
      showAlert(t('success'), t('listCopied'));
    });
  };

  const QUICK_ITEMS = [
    { name: 'Rice', category: 'Grocery', unit: 'kg' },
    { name: 'Onion', category: 'Vegetables', unit: 'kg' },
    { name: 'Potato', category: 'Vegetables', unit: 'kg' },
    { name: 'Oil', category: 'Grocery', unit: 'ltr' },
    { name: 'Egg', category: 'General', unit: 'dozen' },
    { name: 'Milk', category: 'Dairy', unit: 'ltr' },
    { name: 'Chicken', category: 'Meat/Fish', unit: 'kg' },
    { name: 'Fish', category: 'Meat/Fish', unit: 'kg' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-zinc-900" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900">{list?.name}</h2>
          <p className="text-xs text-zinc-500">{list?.date.toDate().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={shareList}
            className="p-2 hover:bg-zinc-100 text-zinc-400 hover:text-emerald-600 rounded-full transition-colors"
            title={t('shareList')}
          >
            <Share2 className="w-5 h-5" />
          </button>
          {list?.status === 'active' && (
            <button 
              onClick={handleDeleteList}
              className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-full transition-colors"
              title={t('deleteList')}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <div className="w-2" />
        </div>
      </div>

      <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-100 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-emerald-100 font-medium">{t('totalSpent')}</p>
            <h3 className="text-3xl font-bold">৳ {list?.totalCost?.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US') || 0}</h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-emerald-100 font-medium">{t('items')}</p>
            <h3 className="text-xl font-bold">{items.filter(i => i.isBought).length} / {items.length}</h3>
          </div>
        </div>

        {list?.status === 'active' && (
          <div className="pt-4 border-t border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider mb-1 block">{t('targetBudget')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-200 font-bold">৳</span>
                  <input 
                    type="number"
                    value={list?.targetBudget || ''}
                    onChange={(e) => updateTargetBudget(Number(e.target.value))}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2 bg-emerald-700/30 border border-emerald-400/30 rounded-xl font-bold text-white placeholder:text-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider mb-1">{t('budgetProgress')}</p>
                <p className="text-lg font-black">{Math.round(budgetPercentage)}%</p>
              </div>
            </div>
            
            {list?.targetBudget && list.targetBudget > 0 && (
              <div className="space-y-2">
                <div className="h-2 bg-emerald-700/30 rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetPercentage}%` }}
                    className={`h-full ${budgetPercentage >= 100 ? 'bg-rose-400' : budgetPercentage >= 80 ? 'bg-amber-400' : 'bg-white'} transition-all duration-500`}
                  />
                </div>
                {budgetPercentage >= 100 && (
                  <p className="text-[10px] text-rose-200 font-bold uppercase tracking-wider text-center animate-pulse">
                    ⚠️ {t('overBudget')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">{t('bazarList')}</h3>
          {list?.status === 'active' && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700"
            >
              <Plus className="w-4 h-4" /> {t('addItem')}
            </button>
          )}
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-lg space-y-3"
            >
              <div className="flex flex-wrap gap-2 mb-2">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.name}
                    onClick={() => setNewItem({ ...newItem, category: cat.name })}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${newItem.category === cat.name ? cat.color + ' ring-2 ring-offset-1 ring-emerald-500' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
                  >
                    {cat.icon} {t(cat.name)}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('quickAdd')}</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ITEMS.map(item => (
                    <button 
                      key={item.name}
                      onClick={() => {
                        setNewItem({ ...newItem, name: item.name, category: item.category, unit: item.unit });
                        fetchLastPurchase(item.name);
                      }}
                      className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
                    >
                      + {item.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <input 
                  autoFocus
                  type="text" 
                  placeholder={t('itemNamePlaceholder')} 
                  className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12"
                  value={newItem.name}
                  onChange={(e) => {
                    setNewItem({ ...newItem, name: e.target.value });
                    fetchLastPurchase(e.target.value);
                  }}
                />
                <button 
                  onClick={startVoiceInput}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-zinc-100 text-zinc-400 hover:text-emerald-600'}`}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>

              {lastPurchase && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100"
                >
                  <p className="text-[10px] text-emerald-700 font-bold">
                    💡 {t('lastPaid').replace('{{amount}}', lastPurchase.amount.toString()).replace('{{date}}', lastPurchase.date)}
                  </p>
                </motion.div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex gap-1">
                  <input 
                    type="number" 
                    placeholder={t('quantity')} 
                    className="w-full p-3 bg-zinc-50 rounded-l-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  />
                  <select 
                    className="p-3 bg-zinc-50 rounded-r-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{t(u)}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder={t('unitPricePlaceholder')} 
                    className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">৳</span>
                </div>
              </div>
              {newItem.quantity && newItem.unitPrice && (
                <div className="bg-emerald-50 p-3 rounded-xl flex justify-between items-center">
                  <span className="text-xs text-emerald-700 font-medium">{t('totalPriceAuto')}</span>
                  <span className="font-bold text-emerald-700">
                    ৳ {calculateItemPrice(Number(newItem.quantity), Number(newItem.unitPrice), newItem.unit).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={handleAddItem}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                >
                  {t('add')}
                </button>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          {items.map(item => (
            <div 
              key={item.id} 
              className={`bg-white p-4 rounded-3xl border transition-all flex flex-col gap-3 ${item.isBought ? 'border-emerald-100 bg-emerald-50/30' : 'border-zinc-100 shadow-sm hover:shadow-md'}`}
            >
              <div className="flex items-center gap-4">
                <button onClick={() => toggleBought(item)} className="transition-transform active:scale-90">
                  {item.isBought ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <Circle className="w-7 h-7 text-zinc-300" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${CATEGORIES.find(c => c.name === item.category)?.color || 'bg-zinc-100 text-zinc-400'}`}>
                        {CATEGORIES.find(c => c.name === item.category)?.icon || <Logo size={12} className="bg-zinc-400" />}
                      </div>
                      {editingItemId === item.id ? (
                        <input 
                          autoFocus
                          className="font-bold text-zinc-900 bg-zinc-50 border border-zinc-200 rounded px-2 py-1 w-full"
                          value={item.name}
                          onChange={(e) => updateItemField(item.id, { name: e.target.value })}
                          onBlur={() => setEditingItemId(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingItemId(null)}
                        />
                      ) : (
                        <p 
                          className={`font-bold truncate cursor-pointer ${item.isBought ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}
                          onClick={() => setEditingItemId(item.id)}
                        >
                          {item.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingItemId(item.id === editingItemId ? null : item.id)} className="p-1 text-zinc-300 hover:text-emerald-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="p-1 text-zinc-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {editingItemId === item.id ? (
                        <div className="flex gap-1">
                          <input 
                            type="number"
                            className="w-12 text-xs bg-zinc-50 border border-zinc-200 rounded px-1"
                            value={item.quantity}
                            onChange={(e) => updateItemField(item.id, { quantity: Number(e.target.value) })}
                          />
                          <select 
                            className="text-xs bg-zinc-50 border border-zinc-200 rounded px-1"
                            value={item.unit}
                            onChange={(e) => updateItemField(item.id, { unit: e.target.value })}
                          >
                            {UNITS.map(u => <option key={u} value={u}>{t(u)}</option>)}
                          </select>
                          <span className="text-xs text-zinc-400 self-center">×</span>
                          <input 
                            type="number"
                            placeholder={t('unitPrice')}
                            className="w-16 text-xs bg-zinc-50 border border-zinc-200 rounded px-1"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateItemField(item.id, { unitPrice: Number(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <p className="text-xs text-zinc-500">{item.quantity} {t(item.unit)} {item.unitPrice > 0 && `× ৳${item.unitPrice}`}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400">{t('total')}</span>
                      <p className={`text-sm font-bold ${item.isBought ? 'text-emerald-700' : 'text-zinc-900'}`}>
                        ৳ {(item.actualPrice || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && !isAdding && (
            <div className="text-center py-8">
              <p className="text-zinc-400">{t('noItemsInList')}</p>
            </div>
          )}
        </div>
      </div>

      {list?.status === 'active' && items.length > 0 && (
        <button 
          onClick={completeList}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold shadow-xl hover:bg-zinc-800 transition-all"
        >
          {t('completeBazar')}
        </button>
      )}

      {list?.status === 'completed' && (
        <button 
          onClick={reopenList}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl hover:bg-emerald-700 transition-all"
        >
          {t('reopenList')}
        </button>
      )}
    </motion.div>
  );
}

function BudgetSettings({ profile, userId, showAlert }: { profile: UserProfile | null, userId: string, showAlert: (title: string, message: string) => void }) {
  const { t, language, setLanguage } = useLanguage();
  const [budget, setBudget] = useState(profile?.monthlyBudget || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      showAlert(t('installApp'), t('mobileStep2'));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), { monthlyBudget: Number(budget) });
      showAlert(t('success'), t('budgetUpdated'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{t('settings')}</h2>

      <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-8">
        <div>
          <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            {t('setMonthlyBudget')}
          </h3>
          <div className="relative mb-4">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">৳</div>
            <input 
              type="number" 
              className="w-full pl-10 pr-4 py-4 bg-zinc-50 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </div>
          <p className="text-xs text-zinc-500 mb-6 leading-relaxed">{t('budgetHelpText')}</p>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? t('saving') : t('updateBudget')}
          </button>
        </div>

        <div className="pt-6 border-t border-zinc-50">
          <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-600" />
            </div>
            {t('language')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setLanguage('en')}
              className={`p-4 rounded-2xl border font-bold transition-all ${language === 'en' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-zinc-100 bg-zinc-50 text-zinc-500'}`}
            >
              English
            </button>
            <button 
              onClick={() => setLanguage('bn')}
              className={`p-4 rounded-2xl border font-bold transition-all ${language === 'bn' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-zinc-100 bg-zinc-50 text-zinc-500'}`}
            >
              বাংলা
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-50">
          <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-indigo-600" />
            </div>
            {t('mobileUsage')}
          </h3>
          <div className="bg-indigo-50/50 p-6 rounded-3xl space-y-4">
            <p className="text-sm text-zinc-600 leading-relaxed">{t('mobileUsageText')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
        <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Download className="w-4 h-4 text-emerald-600" />
          </div>
          {t('installApp')}
        </h3>
        <p className="text-sm text-zinc-500 mb-6">{t('installAppHelp')}</p>
        <button 
          onClick={handleInstall}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:scale-[1.02] active:scale-95 transition-all"
        >
          {t('installApp')}
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
        <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-rose-600" />
          </div>
          {t('account')}
        </h3>
        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
          <div className="flex items-center gap-4">
            <img src={auth.currentUser?.photoURL || ''} alt="" className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm" />
            <div>
              <p className="font-bold text-zinc-900 leading-none mb-1">{profile?.displayName}</p>
              <p className="text-xs text-zinc-500">{profile?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-3 text-rose-500 hover:bg-rose-100 rounded-xl transition-all active:scale-90"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="text-center py-6 space-y-1">
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{t('versionInfo')}</p>
        <p className="text-[10px] text-zinc-300 font-medium">{new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
      </div>
    </motion.div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { 
  loginWithGoogle, 
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
  handleFirestoreError,
  OperationType
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  LayoutDashboard, 
  ShoppingBag, 
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
  Package,
  CreditCard,
  Smartphone,
  User as UserIcon,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

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

const Modal = ({ isOpen, onClose, title, message, onConfirm, confirmLabel = 'নিশ্চিত করুন', cancelLabel = 'বাতিল', isAlert = false }: { 
  isOpen: boolean, 
  onClose: () => void, 
  title: string, 
  message: string, 
  onConfirm?: () => void, 
  confirmLabel?: string, 
  cancelLabel?: string,
  isAlert?: boolean
}) => {
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
              {cancelLabel}
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
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
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
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lists' | 'history' | 'settings'>('dashboard');
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
    setModalConfig({ isOpen: true, title, message, isAlert: true, confirmLabel: 'ঠিক আছে' });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  // Tab Switcher Listener
  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener('set-active-tab', (handleTabSwitch as EventListener));
    return () => window.removeEventListener('set-active-tab', (handleTabSwitch as EventListener));
  }, []);

  // Auth Listener
  useEffect(() => {
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
          handleFirestoreError(error, OperationType.WRITE, `users/${u.uid}`);
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
          বাজার হিসাব
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
          <div className="w-24 h-24 gradient-brand rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-200">
            <ShoppingBag className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-zinc-900 mb-3 tracking-tight">বাজার হিসাব</h1>
          <p className="text-zinc-500 mb-10 text-lg">আপনার দৈনিক বাজারের ফর্দ এবং মাসিক খরচের সঠিক হিসাব রাখুন।</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full py-5 gradient-brand text-white rounded-2xl font-bold shadow-xl shadow-brand-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="" />
            Google দিয়ে লগইন করুন
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-50 pb-28">
        <header className="bg-white/80 backdrop-blur-md border-b border-zinc-100 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand-100">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">বাজার হিসাব</h1>
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
                {activeTab === 'settings' && <BudgetSettings profile={profile} userId={user.uid} showAlert={showAlert} />}
              </>
            )}
          </AnimatePresence>
        </main>

        {!selectedListId && (
          <nav className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-lg border border-zinc-100 px-4 py-3 rounded-3xl flex justify-around items-center z-40 shadow-2xl shadow-black/5">
            <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="ড্যাশবোর্ড" />
            <NavButton active={activeTab === 'lists'} onClick={() => setActiveTab('lists')} icon={<ShoppingBag />} label="ফর্দ" />
            <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="ইতিহাস" />
            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings />} label="সেটিং" />
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
    
    const monthName = now.toLocaleString('bn-BD', { month: 'long' });
    
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
      name: l.date.toDate().toLocaleDateString('bn-BD', { day: 'numeric' }),
      amount: l.totalCost || 0
    }));

    return { totalSpent, budget, remaining, percentage, count: monthLists.length, monthName, chartData };
  }, [lists, profile]);

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
              <span className="text-[10px] font-bold uppercase tracking-widest">{currentMonthStats.monthName} ২০২৬</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">বাজেট ট্র্যাকার</span>
          </div>
          
          <p className="text-brand-100 text-sm font-medium mb-1">মোট খরচ</p>
          <h2 className="text-5xl font-black mb-8 tracking-tight">৳ {currentMonthStats.totalSpent.toLocaleString('bn-BD')}</h2>
          
          <div className="space-y-4 bg-black/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="flex justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3 h-3" />
                বাজেট: ৳ {currentMonthStats.budget.toLocaleString('bn-BD')}
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
                <span className="text-[10px] uppercase opacity-60 font-bold">অবশিষ্ট</span>
                <p className="text-sm font-bold">৳ {currentMonthStats.remaining.toLocaleString('bn-BD')}</p>
              </div>
              {currentMonthStats.budget === 0 && (
                <button 
                  onClick={() => {
                    const event = new CustomEvent('set-active-tab', { detail: 'settings' });
                    window.dispatchEvent(event);
                  }}
                  className="text-[11px] bg-white text-brand-600 px-4 py-2 rounded-xl font-bold hover:bg-brand-50 transition-all shadow-lg active:scale-95"
                >
                  বাজেট সেট করুন
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          icon={<CreditCard className="text-indigo-600" />} 
          label="মাসিক বাজেট" 
          value={`৳ ${currentMonthStats.budget.toLocaleString('bn-BD')}`} 
          color="bg-indigo-50" 
          borderColor="border-indigo-100"
        />
        <StatCard 
          icon={<ShoppingBag className="text-rose-600" />} 
          label="মোট বাজার" 
          value={`${currentMonthStats.count} টি`} 
          color="bg-rose-50" 
          borderColor="border-rose-100"
        />
      </div>

      {currentMonthStats.chartData.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
            </div>
            খরচের প্রবণতা
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
                  formatter={(value: number) => [`৳ ${value}`, 'খরচ']}
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
            সাম্প্রতিক বাজার
          </h3>
          <button 
            onClick={() => {
              const event = new CustomEvent('set-active-tab', { detail: 'history' });
              window.dispatchEvent(event);
            }}
            className="text-xs font-bold text-brand-600 hover:underline"
          >
            সব দেখুন
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
                  <Package className="w-5 h-5 text-zinc-400 group-hover:text-brand-500" />
                </div>
                <div>
                  <p className="font-bold text-zinc-900 group-hover:text-brand-700 transition-colors">{list.name}</p>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{list.date.toDate().toLocaleDateString('bn-BD')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-zinc-900">৳ {list.totalCost?.toLocaleString('bn-BD') || 0}</p>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${list.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {list.status === 'active' ? 'চলমান' : 'শেষ'}
                </span>
              </div>
            </div>
          ))}
          {lists.length === 0 && (
            <div className="text-center py-10 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
              <p className="text-zinc-400 text-sm">কোনো তথ্য পাওয়া যায়নি</p>
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
      'ফর্দ মুছে ফেলুন',
      'আপনি কি নিশ্চিত যে আপনি এই ফর্দটি মুছে ফেলতে চান?',
      async () => {
        console.log('Attempting to delete list:', id);
        try {
          await deleteDoc(doc(db, 'bazarLists', id));
          console.log('List deleted successfully:', id);
          showAlert('সফল', 'ফর্দটি মুছে ফেলা হয়েছে।');
        } catch (error) {
          console.error('Error deleting list:', error);
          handleFirestoreError(error, OperationType.DELETE, `bazarLists/${id}`);
        }
      }
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">
          {filter === 'active' ? 'সক্রিয় ফর্দ' : 'আগের বাজার'}
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
              <h3 className="font-bold">নতুন ফর্দ তৈরি করুন</h3>
              <button onClick={() => setIsAdding(false)}><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <input 
              autoFocus
              type="text" 
              placeholder="ফর্দের নাম (যেমন: সাপ্তাহিক বাজার)" 
              className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
            />
            <button 
              onClick={handleAddList}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
            >
              তৈরি করুন
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {lists.map(list => (
          <motion.div 
            key={list.id}
            layout
            onClick={() => onSelectList(list.id)}
            className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center justify-between cursor-pointer hover:border-emerald-200 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${filter === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-zinc-900">{list.name}</p>
                <p className="text-xs text-zinc-500">{list.date.toDate().toLocaleDateString('bn-BD')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-bold text-zinc-900">৳ {list.totalCost || 0}</p>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${list.status === 'active' ? 'text-emerald-600' : 'text-zinc-400'}`}>
                  {list.status === 'active' ? 'সক্রিয়' : 'সম্পন্ন'}
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
        ))}
        {lists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-400">কোনো ফর্দ পাওয়া যায়নি। নতুন একটি তৈরি করুন!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const CATEGORIES = [
  { name: 'General', icon: <Package className="w-4 h-4" />, color: 'bg-zinc-100 text-zinc-600' },
  { name: 'Vegetables', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600' },
  { name: 'Meat/Fish', icon: <ShoppingBag className="w-4 h-4" />, color: 'bg-rose-100 text-rose-600' },
  { name: 'Grocery', icon: <Wallet className="w-4 h-4" />, color: 'bg-amber-100 text-amber-600' },
  { name: 'Dairy', icon: <Circle className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' },
];

function BazarListDetail({ listId, onBack, userId, showConfirm, showAlert }: { listId: string, onBack: () => void, userId: string, showConfirm: (title: string, message: string, onConfirm: () => void) => void, showAlert: (title: string, message: string) => void }) {
  const [list, setList] = useState<BazarList | null>(null);
  const [items, setItems] = useState<BazarItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'kg', unitPrice: '', estimatedPrice: '', category: 'General' });

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
      'আইটেম মুছে ফেলুন',
      'আপনি কি নিশ্চিত যে আপনি এই আইটেমটি মুছে ফেলতে চান?',
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
      'ফর্দ মুছে ফেলুন',
      'আপনি কি নিশ্চিত যে আপনি এই পুরো ফর্দটি মুছে ফেলতে চান?',
      async () => {
        console.log('Attempting to delete list from detail view:', listId);
        try {
          await deleteDoc(doc(db, 'bazarLists', listId));
          console.log('List deleted successfully from detail view:', listId);
          onBack();
          showAlert('সফল', 'ফর্দটি মুছে ফেলা হয়েছে।');
        } catch (error) {
          console.error('Error deleting list from detail view:', error);
          handleFirestoreError(error, OperationType.DELETE, `bazarLists/${listId}`);
        }
      }
    );
  };

  const completeList = async () => {
    showConfirm(
      'বাজার সম্পন্ন করুন',
      'আপনি কি এই বাজারটি সম্পন্ন করতে চান?',
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
          <p className="text-xs text-zinc-500">{list?.date.toDate().toLocaleDateString('bn-BD')}</p>
        </div>
        <div className="flex items-center gap-2">
          {list?.status === 'active' && (
            <button 
              onClick={handleDeleteList}
              className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-full transition-colors"
              title="ফর্দ মুছে ফেলুন"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <div className="w-2" />
        </div>
      </div>

      <div className="bg-emerald-600 rounded-2xl p-6 text-white flex justify-between items-center shadow-lg shadow-emerald-100">
        <div>
          <p className="text-xs text-emerald-100 font-medium">মোট খরচ</p>
          <h3 className="text-3xl font-bold">৳ {list?.totalCost || 0}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-emerald-100 font-medium">আইটেম</p>
          <h3 className="text-xl font-bold">{items.filter(i => i.isBought).length} / {items.length}</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">বাজারের তালিকা</h3>
          {list?.status === 'active' && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700"
            >
              <Plus className="w-4 h-4" /> আইটেম যোগ করুন
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
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
              <input 
                autoFocus
                type="text" 
                placeholder="আইটেমের নাম (যেমন: চাল)" 
                className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex gap-1">
                  <input 
                    type="number" 
                    placeholder="পরিমাণ" 
                    className="w-full p-3 bg-zinc-50 rounded-l-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  />
                  <select 
                    className="p-3 bg-zinc-50 rounded-r-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="একক দাম (যেমন: ১৬০)" 
                    className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">৳</span>
                </div>
              </div>
              {newItem.quantity && newItem.unitPrice && (
                <div className="bg-emerald-50 p-3 rounded-xl flex justify-between items-center">
                  <span className="text-xs text-emerald-700 font-medium">মোট দাম (অটো):</span>
                  <span className="font-bold text-emerald-700">
                    ৳ {calculateItemPrice(Number(newItem.quantity), Number(newItem.unitPrice), newItem.unit).toLocaleString('bn-BD')}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={handleAddItem}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                >
                  যোগ করুন
                </button>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                >
                  বাতিল
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
                        {CATEGORIES.find(c => c.name === item.category)?.icon || <Package className="w-3 h-3" />}
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
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <span className="text-xs text-zinc-400 self-center">×</span>
                          <input 
                            type="number"
                            placeholder="দাম/একক"
                            className="w-16 text-xs bg-zinc-50 border border-zinc-200 rounded px-1"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateItemField(item.id, { unitPrice: Number(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <p className="text-xs text-zinc-500">{item.quantity} {item.unit} {item.unitPrice > 0 && `× ৳${item.unitPrice}`}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400">মোট:</span>
                      <p className={`text-sm font-bold ${item.isBought ? 'text-emerald-700' : 'text-zinc-900'}`}>
                        ৳ {(item.actualPrice || 0).toLocaleString('bn-BD')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && !isAdding && (
            <div className="text-center py-8">
              <p className="text-zinc-400">তালিকায় কোনো আইটেম নেই।</p>
            </div>
          )}
        </div>
      </div>

      {list?.status === 'active' && items.length > 0 && (
        <button 
          onClick={completeList}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold shadow-xl hover:bg-zinc-800 transition-all"
        >
          বাজার সম্পন্ন করুন
        </button>
      )}
    </motion.div>
  );
}

function BudgetSettings({ profile, userId, showAlert }: { profile: UserProfile | null, userId: string, showAlert: (title: string, message: string) => void }) {
  const [budget, setBudget] = useState(profile?.monthlyBudget || 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), { monthlyBudget: Number(budget) });
      showAlert('সফল', 'বাজেট সফলভাবে সেভ করা হয়েছে!');
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
      <h2 className="text-2xl font-black text-zinc-900 tracking-tight">সেটিংস</h2>

      <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-8">
        <div>
          <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-brand-600" />
            </div>
            মাসিক বাজেট নির্ধারণ
          </h3>
          <div className="relative mb-4">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">৳</div>
            <input 
              type="number" 
              className="w-full pl-10 pr-4 py-4 bg-zinc-50 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-lg"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </div>
          <p className="text-xs text-zinc-500 mb-6 leading-relaxed">আপনার মাসিক খরচের লক্ষ্যমাত্রা নির্ধারণ করুন। এটি আপনাকে খরচ নিয়ন্ত্রণে সাহায্য করবে।</p>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 gradient-brand text-white rounded-2xl font-bold shadow-lg shadow-brand-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? 'সেভ হচ্ছে...' : 'বাজেট আপডেট করুন'}
          </button>
        </div>

        <div className="pt-6 border-t border-zinc-50">
          <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-indigo-600" />
            </div>
            মোবাইলে ব্যবহার করার নিয়ম
          </h3>
          <div className="bg-indigo-50/50 p-6 rounded-3xl space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-indigo-600 shadow-sm flex-shrink-0">১</div>
              <p className="text-sm text-zinc-600 leading-relaxed">আপনার ফোনের ব্রাউজারে (Chrome বা Safari) এই ওয়েবসাইটটি ওপেন করুন।</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-indigo-600 shadow-sm flex-shrink-0">২</div>
              <p className="text-sm text-zinc-600 leading-relaxed">ব্রাউজারের মেনু থেকে <span className="font-bold text-indigo-700">"Add to Home Screen"</span> অপশনটি সিলেক্ট করুন।</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-indigo-600 shadow-sm flex-shrink-0">৩</div>
              <p className="text-sm text-zinc-600 leading-relaxed">এখন আপনার মোবাইলের হোম স্ক্রিনে এটি একটি অ্যাপের মতো দেখাবে!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
        <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-rose-600" />
          </div>
          অ্যাকাউন্ট
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
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">বাজার হিসাব v1.2.0 • Made by Basir Uddin</p>
        <p className="text-[10px] text-zinc-300 font-medium">19-03-2026</p>
      </div>
    </motion.div>
  );
}

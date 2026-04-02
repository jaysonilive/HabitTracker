import React, { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { cn } from '../lib/utils';
import { format, startOfMonth, getDaysInMonth } from 'date-fns';
import { 
  LogOut, ChevronLeft, ChevronRight, Plus, Check, 
  LayoutDashboard, ListTodo, Moon, BookOpen, 
  TrendingUp, Target, User, Calendar, Trash2, Quote, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const INITIAL_NUM_HABITS = 5;
const SLEEP_HOURS = ['9hrs', '8hrs', '7hrs', '6hrs', '5hrs'];

interface DashboardData {
  uid: string;
  monthYear: string;
  habits: string[];
  completions: Record<string, boolean>;
  sleep: Record<string, string>;
  notes: string;
}

const defaultHabits = Array(INITIAL_NUM_HABITS).fill('');

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'habits', label: 'Daily Habits', icon: ListTodo },
  { id: 'sleep', label: 'Sleep Tracker', icon: Moon },
  { id: 'journal', label: 'Journal', icon: BookOpen },
];

export default function HabitTracker() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const monthYear = format(currentDate, 'yyyy-MM');
  const daysInMonth = getDaysInMonth(currentDate);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, `users/${user.uid}/dashboards/${monthYear}`);
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setDashboard(snapshot.data() as DashboardData);
      } else {
        const initialData: DashboardData = {
          uid: user.uid,
          monthYear,
          habits: defaultHabits,
          completions: {},
          sleep: {},
          notes: ''
        };
        setDoc(docRef, initialData).catch(console.error);
        setDashboard(initialData);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching dashboard:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, monthYear]);

  const updateDashboard = useCallback(async (updates: Partial<DashboardData>) => {
    if (!user || !dashboard) return;
    const docRef = doc(db, `users/${user.uid}/dashboards/${monthYear}`);
    try {
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error("Error updating dashboard:", error);
    }
  }, [user, dashboard, monthYear]);

  const handleHabitChange = (index: number, value: string) => {
    if (!dashboard) return;
    const newHabits = [...(dashboard.habits || defaultHabits)];
    newHabits[index] = value;
    updateDashboard({ habits: newHabits });
  };

  const addHabit = () => {
    if (!dashboard) return;
    updateDashboard({ habits: [...(dashboard.habits || defaultHabits), ''] });
  };

  const removeHabit = (indexToRemove: number) => {
    if (!dashboard) return;
    const currentHabits = dashboard.habits || defaultHabits;
    if (currentHabits.length <= 1) return; // Keep at least one
    const newHabits = currentHabits.filter((_, index) => index !== indexToRemove);
    updateDashboard({ habits: newHabits });
  };

  const toggleCompletion = (habitIndex: number, day: number) => {
    if (!dashboard) return;
    const key = `${habitIndex}-${day}`;
    const newCompletions = { ...dashboard.completions };
    newCompletions[key] = !newCompletions[key];
    updateDashboard({ completions: newCompletions });
  };

  const setSleep = (day: number, hours: string) => {
    if (!dashboard) return;
    const newSleep = { ...dashboard.sleep };
    if (newSleep[day] === hours) {
      delete newSleep[day];
    } else {
      newSleep[day] = hours;
    }
    updateDashboard({ sleep: newSleep });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateDashboard({ notes: e.target.value });
  };

  const calculateTotalPoints = (day: number) => {
    if (!dashboard) return 0;
    let points = 0;
    const habitsList = dashboard.habits || defaultHabits;
    for (let i = 0; i < habitsList.length; i++) {
      if (dashboard.completions[`${i}-${day}`]) {
        points++;
      }
    }
    return points;
  };

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const calculateSleepPoints = () => {
    if (!dashboard) return '';
    const points: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const hour = dashboard.sleep[day];
      if (hour) {
        const hIndex = SLEEP_HOURS.indexOf(hour);
        points.push(`${(day - 1) * 40 + 20},${hIndex * 40 + 20}`);
      }
    }
    return points.join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const habitsList = dashboard?.habits || defaultHabits;
  
  // Calculate Overview Stats
  const totalPossible = habitsList.length * daysInMonth;
  let totalCompleted = 0;
  const completionsPerDay = Array.from({ length: daysInMonth }, (_, i) => {
    let dayTotal = 0;
    for (let h = 0; h < habitsList.length; h++) {
      if (dashboard?.completions[`${h}-${i + 1}`]) {
        dayTotal++;
        totalCompleted++;
      }
    }
    return { day: i + 1, completions: dayTotal };
  });
  const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  let totalSleepHours = 0;
  let sleepDays = 0;
  if (dashboard?.sleep) {
    Object.values(dashboard.sleep).forEach((val: string) => {
      const hrs = parseInt(val.replace('hrs', ''));
      if (!isNaN(hrs)) {
        totalSleepHours += hrs;
        sleepDays++;
      }
    });
  }
  const avgSleep = sleepDays > 0 ? (totalSleepHours / sleepDays).toFixed(1) : '0';

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 max-w-6xl mx-auto"
          >
            {/* Greeting */}
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Welcome back, {user?.displayName?.split(' ')[0] || 'User'}!
              </h2>
              <p className="text-gray-500 mt-2 text-lg">Here's your progress for {format(currentDate, 'MMMM yyyy')}.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/30 transform transition-transform hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-blue-100 font-medium text-lg">Completion Rate</h3>
                  <div className="p-2 bg-white/20 rounded-lg"><TrendingUp className="w-5 h-5 text-white" /></div>
                </div>
                <div className="text-5xl font-bold">{completionRate}%</div>
                <p className="text-blue-100 text-sm mt-3 font-medium">{totalCompleted} total habits completed</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-500/30 transform transition-transform hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-purple-100 font-medium text-lg">Active Habits</h3>
                  <div className="p-2 bg-white/20 rounded-lg"><Target className="w-5 h-5 text-white" /></div>
                </div>
                <div className="text-5xl font-bold">{habitsList.filter(h => h.trim() !== '').length}</div>
                <p className="text-purple-100 text-sm mt-3 font-medium">Out of {habitsList.length} total slots</p>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/30 transform transition-transform hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-indigo-100 font-medium text-lg">Average Sleep</h3>
                  <div className="p-2 bg-white/20 rounded-lg"><Moon className="w-5 h-5 text-white" /></div>
                </div>
                <div className="text-5xl font-bold">{avgSleep} <span className="text-2xl font-medium">hrs</span></div>
                <p className="text-indigo-100 text-sm mt-3 font-medium">Based on {sleepDays} logged days</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-8">Daily Completions</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completionsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} />
                    <Tooltip 
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="completions" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        );

      case 'habits':
        return (
          <motion.div 
            key="habits"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-[1600px] mx-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Daily Habits</h2>
                <p className="text-gray-500 mt-1">Track your daily progress and get 1% better.</p>
              </div>
              <button 
                onClick={addHabit}
                className="flex items-center space-x-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Habit</span>
              </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[max-content] pb-4">
                  <div className="flex border-b border-gray-200 bg-gray-50/80">
                    <div className="w-12 flex-shrink-0 border-r border-gray-200 p-4 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider sticky left-0 bg-gray-50/80 z-20">#</div>
                    <div className="w-48 md:w-64 flex-shrink-0 border-r border-gray-200 p-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider sticky left-12 bg-gray-50/80 z-20">Habit / Rules</div>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <div key={i} className="w-10 flex-shrink-0 border-r last:border-r-0 border-gray-200 p-4 text-center text-gray-500 font-semibold text-xs">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-col">
                    {habitsList.map((habit, index) => (
                      <div key={index} className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
                        <div className="w-12 flex-shrink-0 border-r border-gray-100 p-3 flex items-center justify-center text-gray-400 font-medium text-sm sticky left-0 bg-white group-hover:bg-gray-50/50 z-10 transition-colors">
                          {index + 1}
                        </div>
                        <div className="w-48 md:w-64 flex-shrink-0 border-r border-gray-100 p-0 relative sticky left-12 bg-white group-hover:bg-gray-50/50 z-10 flex items-center transition-colors">
                          <input
                            type="text"
                            value={habit}
                            onChange={(e) => handleHabitChange(index, e.target.value)}
                            placeholder={`Enter habit ${index + 1}...`}
                            className="w-full h-full p-4 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-sm font-medium text-gray-700 placeholder-gray-300"
                          />
                          <button
                            onClick={() => removeHabit(index)}
                            className="absolute right-2 opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete habit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                          const isCompleted = dashboard?.completions[`${index}-${dayIndex + 1}`];
                          return (
                            <div 
                              key={dayIndex} 
                              className="w-10 flex-shrink-0 border-r last:border-r-0 border-gray-100 p-1 cursor-pointer"
                              onClick={() => toggleCompletion(index, dayIndex + 1)}
                            >
                              <motion.div 
                                layout
                                className={cn(
                                  "w-full h-full rounded-md flex items-center justify-center transition-colors",
                                  isCompleted ? "bg-blue-600 text-white shadow-sm" : "hover:bg-gray-100 bg-transparent"
                                )}
                                whileTap={{ scale: 0.9 }}
                              >
                                {isCompleted && <Check className="w-4 h-4" strokeWidth={3} />}
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="flex bg-gray-50/80 border-t-2 border-gray-200">
                    <div className="w-[15rem] md:w-[19rem] flex-shrink-0 border-r border-gray-200 p-4 text-right text-gray-700 font-bold text-sm uppercase tracking-wider sticky left-0 bg-gray-50/80 z-20">
                      Total Points
                    </div>
                    {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                      const points = calculateTotalPoints(dayIndex + 1);
                      return (
                        <div key={dayIndex} className="w-10 flex-shrink-0 border-r last:border-r-0 border-gray-200 p-4 text-center text-blue-600 font-bold text-sm">
                          {points > 0 ? points : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'sleep':
        return (
          <motion.div 
            key="sleep"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-[1600px] mx-auto"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Sleep Tracker</h2>
              <p className="text-gray-500 mt-1">Connect the dots to visualize your sleep patterns.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[max-content] pb-4">
                  <div className="flex">
                    {/* Left Column - Labels */}
                    <div className="w-[19rem] flex-shrink-0 flex flex-col border-r border-gray-200 bg-gray-50/80">
                      <div className="h-12 border-b border-gray-200 flex items-center px-6 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                        Hours of Sleep
                      </div>
                      {SLEEP_HOURS.map(hour => (
                        <div key={hour} className="h-10 border-b last:border-b-0 border-gray-100 flex items-center px-6 text-gray-600 font-medium text-sm">
                          {hour}
                        </div>
                      ))}
                    </div>

                    {/* Right Column - Grid & Graph */}
                    <div className="flex-1 relative">
                      {/* Header Row */}
                      <div className="flex h-12 border-b border-gray-200 bg-gray-50/80">
                        {Array.from({length: daysInMonth}, (_, i) => (
                          <div key={i} className="w-10 flex-shrink-0 border-r last:border-r-0 border-gray-200 flex items-center justify-center text-gray-500 font-semibold text-xs">
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      
                      {/* Grid Area */}
                      <div className="relative h-[12.5rem]">
                        <div className="absolute inset-0 flex flex-col pointer-events-none">
                          {SLEEP_HOURS.map((_, i) => (
                            <div key={i} className="h-10 border-b border-gray-100 last:border-b-0" />
                          ))}
                        </div>
                        <div className="absolute inset-0 flex pointer-events-none">
                          {Array.from({length: daysInMonth}, (_, i) => (
                            <div key={i} className="w-10 flex-shrink-0 border-r border-gray-100 last:border-r-0" />
                          ))}
                        </div>

                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                          <motion.polyline
                            points={calculateSleepPoints()}
                            fill="none"
                            stroke="#8b5cf6"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                          />
                        </svg>

                        <div className="absolute inset-0 flex flex-col z-20">
                          {SLEEP_HOURS.map((hour, hIndex) => (
                            <div key={hour} className="flex h-10">
                              {Array.from({length: daysInMonth}, (_, dIndex) => {
                                const isSelected = dashboard?.sleep[dIndex + 1] === hour;
                                return (
                                  <div
                                    key={dIndex}
                                    className="w-10 flex-shrink-0 flex items-center justify-center cursor-pointer hover:bg-purple-50/30 transition-colors"
                                    onClick={() => setSleep(dIndex + 1, hour)}
                                  >
                                    {isSelected && (
                                      <motion.div
                                        layoutId={`sleep-dot-${dIndex + 1}`}
                                        className="w-3.5 h-3.5 rounded-full bg-purple-500 shadow-[0_0_0_4px_rgba(139,92,246,0.2)]"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                      />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'journal':
        return (
          <motion.div 
            key="journal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full max-w-4xl mx-auto flex flex-col"
          >
            <div className="bg-[#fdfbf7] rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden relative">
              {/* Journal Header */}
              <div className="px-6 md:px-10 py-6 border-b border-gray-200 flex items-center justify-between bg-white/60 backdrop-blur-sm">
                <div>
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-800">Monthly Journal</h3>
                  <p className="text-gray-500 text-sm font-medium mt-1 uppercase tracking-widest">{format(currentDate, 'MMMM yyyy')}</p>
                </div>
                <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-green-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="hidden sm:inline">Auto-saved</span>
                  <span className="sm:hidden">Saved</span>
                </div>
              </div>
              
              {/* Editor Area */}
              <div className="flex-1 p-6 md:p-10 flex flex-col">
                <textarea
                  value={dashboard?.notes || ''}
                  onChange={handleNotesChange}
                  placeholder="Write your thoughts, reflections, or goals for this month..."
                  className="flex-1 w-full bg-transparent border-none focus:ring-0 outline-none resize-none text-gray-800 text-lg md:text-xl leading-relaxed placeholder-gray-400 font-serif"
                  style={{ lineHeight: '2' }}
                />
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden font-sans text-gray-900 selection:bg-blue-200">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 w-72 bg-slate-950 text-white flex flex-col flex-shrink-0 shadow-2xl z-50 transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-full h-64 bg-blue-900/20 blur-[100px] pointer-events-none"></div>
        
        <div className="p-8 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
              <Target className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Tracker</span>
          </div>
          <button 
            className="md:hidden text-gray-400 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 relative z-10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center space-x-4 px-5 py-4 rounded-xl transition-all duration-300 relative group",
                activeTab === tab.id 
                  ? "bg-white/10 text-white shadow-lg border border-white/10 backdrop-blur-md" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
              )}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute left-0 w-1 h-8 bg-blue-500 rounded-r-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <tab.icon className={cn("w-5 h-5 transition-colors", activeTab === tab.id ? "text-blue-400" : "text-gray-400 group-hover:text-gray-300")} />
              <span className="font-semibold text-sm tracking-wide">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10 bg-black/20 relative z-10 backdrop-blur-xl">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700">
              {user?.photoURL ? <img src={user.photoURL} alt="Profile" /> : <User className="w-5 h-5 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Header */}
        <header className="h-20 md:h-24 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-10 flex-shrink-0 z-10">
          <div className="flex items-center space-x-4">
            <button 
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 hidden sm:block">
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-8">
            <div className="flex items-center bg-gray-50 rounded-xl p-1 md:p-1.5 border border-gray-200 shadow-sm">
              <button onClick={prevMonth} className="p-1.5 md:p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-2 md:space-x-3 px-2 md:px-6 min-w-[140px] md:min-w-[200px] justify-center">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 text-blue-600 hidden sm:block" />
                <span className="font-bold text-gray-900 text-xs md:text-sm tracking-wide uppercase">
                  {format(currentDate, 'MMM yyyy')}
                </span>
              </div>
              <button onClick={nextMonth} className="p-1.5 md:p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </button>
            </div>
            
            <button 
              onClick={() => auth.signOut()}
              className="p-2 md:p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar relative">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

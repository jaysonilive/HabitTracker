import React, { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { cn } from '../lib/utils';
import { format, startOfMonth, getDaysInMonth } from 'date-fns';
import { 
  LogOut, ChevronLeft, ChevronRight, Plus, Check, 
  LayoutDashboard, ListTodo, Moon, BookOpen, 
  TrendingUp, Target, User, Calendar, Trash2, Menu, X, Activity, Sparkles, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

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

const DotPattern = () => (
  <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
);

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

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const calculateSleepPoints = () => {
    if (!dashboard) return '';
    const points: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const hour = dashboard.sleep[day];
      if (hour) {
        const hIndex = SLEEP_HOURS.indexOf(hour);
        points.push(`${(day - 1) * 48 + 24},${hIndex * 48 + 24}`);
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
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const habitsList = dashboard?.habits || defaultHabits;
  
  // Calculate Overview Stats
  const totalPossible = habitsList.length * daysInMonth;
  let totalCompleted = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  const completionsPerDay = Array.from({ length: daysInMonth }, (_, i) => {
    let dayTotal = 0;
    for (let h = 0; h < habitsList.length; h++) {
      if (dashboard?.completions[`${h}-${i + 1}`]) {
        dayTotal++;
        totalCompleted++;
      }
    }
    
    // Calculate streak based on if ANY habit was completed that day
    if (dayTotal > 0) {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else {
      tempStreak = 0;
    }

    return { day: i + 1, completions: dayTotal };
  });

  // Current streak is the streak ending on the most recently completed day
  currentStreak = tempStreak;

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

  const calculateTotalPoints = (day: number) => {
    let points = 0;
    habitsList.forEach((_, index) => {
      if (dashboard?.completions[`${index}-${day}`]) {
        points++;
      }
    });
    return points;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6 max-w-6xl mx-auto relative z-10"
          >
            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Hero Card */}
              <div className="md:col-span-8 bg-black rounded-[2rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500 to-purple-600 blur-[100px] opacity-40 rounded-full group-hover:opacity-60 transition-opacity duration-700"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500 to-transparent blur-[80px] opacity-20 rounded-full"></div>
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-6 border border-white/10">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-200">Monthly Progress</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                      You're doing <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">amazing.</span>
                    </h2>
                    <p className="text-gray-400 text-lg md:text-xl max-w-md leading-relaxed">
                      You've completed <strong className="text-white">{totalCompleted}</strong> habits this month. Keep building that momentum!
                    </p>
                  </div>
                  
                  <div className="mt-10 flex items-center space-x-6">
                    <div className="flex flex-col">
                      <span className="text-4xl font-black text-white">{currentStreak}</span>
                      <span className="text-sm text-gray-400 font-medium uppercase tracking-wider flex items-center mt-1"><Flame className="w-4 h-4 mr-1 text-orange-500"/> Current Streak</span>
                    </div>
                    <div className="w-px h-12 bg-white/20"></div>
                    <div className="flex flex-col">
                      <span className="text-4xl font-black text-white">{maxStreak}</span>
                      <span className="text-sm text-gray-400 font-medium uppercase tracking-wider mt-1">Best Streak</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completion Rate Card */}
              <div className="md:col-span-4 bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col justify-center items-center text-center relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500"></div>
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 transform group-hover:-translate-y-2 transition-transform duration-500">
                  <TrendingUp className="w-10 h-10" />
                </div>
                <div className="text-6xl font-black text-gray-900 tracking-tighter">{completionRate}<span className="text-3xl text-gray-400">%</span></div>
                <div className="text-gray-500 font-bold uppercase tracking-widest text-sm mt-4">Completion Rate</div>
              </div>

              {/* Active Habits Card */}
              <div className="md:col-span-4 bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                  <Target className="w-7 h-7" />
                </div>
                <div className="text-5xl font-black text-gray-900 mb-2">{habitsList.filter(h => h.trim() !== '').length}</div>
                <div className="text-gray-500 font-bold uppercase tracking-widest text-sm">Active Habits</div>
                <div className="mt-auto pt-6">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(habitsList.filter(h => h.trim() !== '').length / habitsList.length) * 100}%` }}></div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 font-medium text-right">Out of {habitsList.length} slots</div>
                </div>
              </div>

              {/* Average Sleep Card */}
              <div className="md:col-span-4 bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
                  <Moon className="w-7 h-7" />
                </div>
                <div className="text-5xl font-black text-gray-900 mb-2">{avgSleep}<span className="text-2xl text-gray-400 ml-1">hrs</span></div>
                <div className="text-gray-500 font-bold uppercase tracking-widest text-sm">Average Sleep</div>
                <div className="mt-auto pt-6 text-sm font-medium text-purple-600 bg-purple-50 px-4 py-2 rounded-xl inline-block w-max">
                  Based on {sleepDays} logged days
                </div>
              </div>

              {/* Chart Card */}
              <div className="md:col-span-12 bg-white rounded-[2rem] p-8 md:p-10 shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">Activity Overview</h3>
                  <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span>Daily Completions</span>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={completionsPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} 
                        dy={10} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} 
                        dx={-10} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 20px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Bar dataKey="completions" radius={[8, 8, 8, 8]} maxBarSize={40}>
                        {completionsPerDay.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.completions > 0 ? '#3b82f6' : '#e2e8f0'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </motion.div>
        );

      case 'habits':
        return (
          <motion.div 
            key="habits"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-[1600px] mx-auto relative z-10"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Daily Habits</h2>
                <p className="text-gray-500 mt-2 text-lg">Track your daily progress and get 1% better.</p>
              </div>
              <button 
                onClick={addHabit}
                className="flex items-center justify-center space-x-2 text-sm font-bold text-white bg-gray-900 hover:bg-black px-6 py-3.5 rounded-2xl transition-all shadow-xl shadow-gray-900/20 transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                <span>Add New Habit</span>
              </button>
            </div>
            
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[max-content] pb-4">
                  {/* Header */}
                  <div className="flex border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
                    <div className="w-12 flex-shrink-0 border-r border-gray-100 p-4 text-center text-gray-500 font-bold text-xs uppercase tracking-wider sticky left-0 bg-gray-50/90 z-20 backdrop-blur-md">#</div>
                    <div className="w-48 md:w-64 flex-shrink-0 border-r border-gray-100 p-4 text-left text-gray-700 font-bold text-xs uppercase tracking-wider sticky left-12 bg-gray-50/90 z-20 backdrop-blur-md">Habit / Rules</div>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <div key={i} className="w-12 flex-shrink-0 border-r last:border-r-0 border-gray-100 p-4 text-center text-gray-500 font-bold text-xs">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  
                  {/* Body */}
                  <div className="flex flex-col">
                    {habitsList.map((habit, index) => (
                      <div key={index} className="flex border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                        <div className="w-12 flex-shrink-0 border-r border-gray-50 p-3 flex items-center justify-center text-gray-400 font-bold text-sm sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 transition-colors">
                          {index + 1}
                        </div>
                        <div className="w-48 md:w-64 flex-shrink-0 border-r border-gray-50 p-0 relative sticky left-12 bg-white group-hover:bg-blue-50/30 z-10 flex items-center transition-colors">
                          <input
                            type="text"
                            value={habit}
                            onChange={(e) => handleHabitChange(index, e.target.value)}
                            placeholder={`Enter habit ${index + 1}...`}
                            className="w-full h-full p-4 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 placeholder-gray-300"
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
                              className="w-12 flex-shrink-0 border-r last:border-r-0 border-gray-50 p-1.5 cursor-pointer flex items-center justify-center"
                              onClick={() => toggleCompletion(index, dayIndex + 1)}
                            >
                              <motion.div 
                                layout
                                className={cn(
                                  "w-full h-full rounded-xl flex items-center justify-center transition-all duration-300",
                                  isCompleted 
                                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20" 
                                    : "hover:bg-gray-100 bg-transparent border border-transparent hover:border-gray-200"
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

                  {/* Footer */}
                  <div className="flex bg-gray-50/80 border-t-2 border-gray-100">
                    <div className="w-[15rem] md:w-[19rem] flex-shrink-0 border-r border-gray-100 p-4 text-right text-gray-700 font-black text-sm uppercase tracking-wider sticky left-0 bg-gray-50/90 z-20 backdrop-blur-md">
                      Total Points
                    </div>
                    {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                      const points = calculateTotalPoints(dayIndex + 1);
                      return (
                        <div key={dayIndex} className="w-12 flex-shrink-0 border-r last:border-r-0 border-gray-100 p-4 text-center text-blue-600 font-black text-sm">
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-7xl mx-auto relative z-10"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sleep Tracker</h2>
              <p className="text-gray-500 mt-2 text-lg">Connect the dots to visualize your rest and recovery.</p>
            </div>

            <div className="bg-gray-900 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden border border-gray-800">
              {/* Dark mode background effects */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none"></div>
              <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none"></div>
              
              <div className="overflow-x-auto custom-scrollbar-dark pb-6">
                <div className="min-w-[max-content] relative z-10">
                  <div className="flex">
                    {/* Left Column - Labels */}
                    <div className="w-24 md:w-32 flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky left-0 z-30">
                      <div className="h-16 flex items-center justify-end pr-6 font-bold text-gray-500 text-xs uppercase tracking-widest">
                        Hours
                      </div>
                      {SLEEP_HOURS.map(hour => (
                        <div key={hour} className="h-12 flex items-center justify-end pr-6 text-gray-300 font-bold text-sm md:text-base">
                          {hour}
                        </div>
                      ))}
                    </div>

                    {/* Right Column - Grid & Graph */}
                    <div className="flex-1 relative">
                      {/* Header Row */}
                      <div className="flex h-16 border-b border-gray-800">
                        {Array.from({length: daysInMonth}, (_, i) => (
                          <div key={i} className="w-12 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-sm">
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      
                      {/* Grid Area */}
                      <div className="relative h-[15rem]">
                        {/* Horizontal Lines */}
                        <div className="absolute inset-0 flex flex-col pointer-events-none">
                          {SLEEP_HOURS.map((_, i) => (
                            <div key={i} className="h-12 border-b border-gray-800/50 last:border-b-0" />
                          ))}
                        </div>
                        {/* Vertical Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {Array.from({length: daysInMonth}, (_, i) => (
                            <div key={i} className="w-12 flex-shrink-0 border-r border-gray-800/50 last:border-r-0" />
                          ))}
                        </div>

                        {/* SVG Line Graph */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                          <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="50%" stopColor="#ec4899" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="4" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                          </defs>
                          <motion.polyline
                            points={calculateSleepPoints()}
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#glow)"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 2, ease: "easeOut" }}
                          />
                        </svg>

                        {/* Interactive Dots */}
                        <div className="absolute inset-0 flex flex-col z-20">
                          {SLEEP_HOURS.map((hour, hIndex) => (
                            <div key={hour} className="flex h-12">
                              {Array.from({length: daysInMonth}, (_, dIndex) => {
                                const isSelected = dashboard?.sleep[dIndex + 1] === hour;
                                return (
                                  <div
                                    key={dIndex}
                                    className="w-12 flex-shrink-0 flex items-center justify-center cursor-pointer group"
                                    onClick={() => setSleep(dIndex + 1, hour)}
                                  >
                                    <div className={cn(
                                      "w-4 h-4 rounded-full transition-all duration-300",
                                      isSelected 
                                        ? "bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-100" 
                                        : "bg-gray-700/50 scale-50 opacity-0 group-hover:opacity-100 group-hover:scale-100"
                                    )} />
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-[calc(100vh-12rem)] max-w-5xl mx-auto flex flex-col relative z-10"
          >
            <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-100 flex-1 flex flex-col overflow-hidden relative group">
              {/* Decorative Header */}
              <div className="h-32 md:h-40 bg-gradient-to-r from-orange-50 via-rose-50 to-purple-50 relative p-8 md:p-12 flex items-end justify-between overflow-hidden border-b border-gray-100">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-200/40 to-transparent rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10">
                  <h3 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 tracking-tight">Dear Diary...</h3>
                  <p className="text-gray-500 font-medium mt-2 flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{format(currentDate, 'MMMM yyyy')}</span>
                  </p>
                </div>
                <div className="relative z-10 flex items-center space-x-2 bg-white/80 backdrop-blur-md text-gray-700 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest border border-gray-200 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="hidden sm:inline">Auto-saving</span>
                </div>
              </div>
              
              {/* Editor Area */}
              <div className="flex-1 p-8 md:p-12 flex flex-col bg-[#fdfbf7]">
                <textarea
                  value={dashboard?.notes || ''}
                  onChange={handleNotesChange}
                  placeholder="What's on your mind? Reflect on your habits, note your dreams, or just brain dump..."
                  className="flex-1 w-full bg-transparent border-none focus:ring-0 outline-none resize-none text-gray-800 text-xl md:text-2xl leading-relaxed placeholder-gray-300 font-serif"
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
    <div className="flex h-screen bg-[#fafafa] overflow-hidden font-sans text-gray-900 selection:bg-blue-200 relative">
      <DotPattern />
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 w-72 bg-black text-white flex flex-col flex-shrink-0 shadow-2xl z-50 transition-transform duration-500 ease-out border-r border-white/10",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Glowing Orbs */}
        <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/20 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-full h-64 bg-purple-600/20 blur-[100px] pointer-events-none"></div>
        
        <div className="p-8 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20">
              <Target className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Tracker</span>
          </div>
          <button 
            className="md:hidden text-gray-400 hover:text-white transition-colors bg-white/10 p-2 rounded-xl"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-3 mt-8 relative z-10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 relative group overflow-hidden",
                activeTab === tab.id 
                  ? "text-white shadow-lg" 
                  : "text-gray-400 hover:text-white"
              )}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabBackground"
                  className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-white/10 rounded-2xl backdrop-blur-md"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <tab.icon className={cn("w-6 h-6 transition-colors relative z-10", activeTab === tab.id ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300")} />
              <span className="font-bold text-base tracking-wide relative z-10">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 relative z-10 m-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700 shadow-inner">
              {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-gray-400 truncate font-medium">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* Header */}
        <header className="h-24 bg-transparent flex items-center justify-between px-6 md:px-12 flex-shrink-0 z-20">
          <div className="flex items-center space-x-4">
            <button 
              className="md:hidden p-3 text-gray-900 bg-white shadow-lg shadow-gray-200/50 rounded-2xl transition-transform active:scale-95"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 hidden sm:block tracking-tight">
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="flex items-center bg-white rounded-2xl p-1.5 border border-gray-100 shadow-lg shadow-gray-200/40">
              <button onClick={prevMonth} className="p-2.5 hover:bg-gray-50 rounded-xl transition-all">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3 px-4 md:px-8 min-w-[160px] md:min-w-[220px] justify-center">
                <Calendar className="w-4 h-4 text-blue-600 hidden sm:block" />
                <span className="font-black text-gray-900 text-sm md:text-base tracking-widest uppercase">
                  {format(currentDate, 'MMM yyyy')}
                </span>
              </div>
              <button onClick={nextMonth} className="p-2.5 hover:bg-gray-50 rounded-xl transition-all">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <button 
              onClick={() => auth.signOut()}
              className="p-3.5 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-lg shadow-gray-200/40 border border-gray-100"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar relative">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { cn } from '../lib/utils';
import { format, startOfMonth } from 'date-fns';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

const NUM_HABITS = 12;
const NUM_DAYS = 31;
const SLEEP_HOURS = ['9hrs', '8hrs', '7hrs', '6hrs', '5hrs'];

interface DashboardData {
  uid: string;
  monthYear: string;
  habits: string[];
  completions: Record<string, boolean>;
  sleep: Record<string, string>;
  notes: string;
}

const defaultHabits = Array(NUM_HABITS).fill('');

export default function HabitTracker() {
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const monthYear = format(currentDate, 'yyyy-MM');
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, `users/${user.uid}/dashboards/${monthYear}`);
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setDashboard(snapshot.data() as DashboardData);
      } else {
        // Initialize if doesn't exist
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
      delete newSleep[day]; // Toggle off
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
    for (let i = 0; i < NUM_HABITS; i++) {
      if (dashboard.completions[`${i}-${day}`]) {
        points++;
      }
    }
    return points;
  };

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const habits = dashboard?.habits || defaultHabits;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-gray-200 bg-white gap-4">
          <div className="flex items-center space-x-4">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {format(currentDate, 'MMMM yyyy')} Dashboard
            </h1>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-4">
            <span className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Getting 1% Better Each Day</span>
            <button 
              onClick={() => auth.signOut()}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Main Habits Grid */}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-8 border border-gray-200 bg-gray-50 p-2 text-center text-gray-500 font-semibold">#</th>
                  <th className="w-64 border border-gray-200 bg-gray-50 p-2 text-left text-gray-700 font-semibold">Habit/Rules</th>
                  {Array.from({ length: NUM_DAYS }, (_, i) => (
                    <th key={i} className="w-8 border border-gray-200 bg-gray-50 p-2 text-center text-gray-500 font-semibold">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map((habit, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="border border-gray-200 p-2 text-center text-gray-400 font-medium">{index + 1}</td>
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        value={habit}
                        onChange={(e) => handleHabitChange(index, e.target.value)}
                        placeholder={`Habit ${index + 1}`}
                        className="w-full h-full p-2 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-black outline-none"
                      />
                    </td>
                    {Array.from({ length: NUM_DAYS }, (_, dayIndex) => {
                      const isCompleted = dashboard?.completions[`${index}-${dayIndex + 1}`];
                      return (
                        <td 
                          key={dayIndex} 
                          className="border border-gray-200 p-0 cursor-pointer"
                          onClick={() => toggleCompletion(index, dayIndex + 1)}
                        >
                          <div className={cn(
                            "w-full h-8 flex items-center justify-center transition-all duration-200",
                            isCompleted ? "bg-black text-white" : "hover:bg-gray-100"
                          )}>
                            {isCompleted && <span className="text-xs">✓</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                
                {/* Total Points Row */}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={2} className="border border-gray-200 p-2 text-right text-gray-700">
                    Total Points
                  </td>
                  {Array.from({ length: NUM_DAYS }, (_, dayIndex) => (
                    <td key={dayIndex} className="border border-gray-200 p-2 text-center text-gray-700">
                      {calculateTotalPoints(dayIndex + 1) || ''}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* Sleep Tracker Grid */}
            <div className="mt-8">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-[18.5rem] border border-gray-200 bg-gray-50 p-2 text-left text-gray-700 font-semibold">
                      Sleep
                    </th>
                    {Array.from({ length: NUM_DAYS }, (_, i) => (
                      <th key={i} className="w-8 border border-gray-200 bg-gray-50 p-2 text-center text-gray-500 font-semibold">
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLEEP_HOURS.map((hours) => (
                    <tr key={hours} className="hover:bg-gray-50/50 transition-colors">
                      <td className="border border-gray-200 p-2 text-gray-600 font-medium">
                        {hours}
                      </td>
                      {Array.from({ length: NUM_DAYS }, (_, dayIndex) => {
                        const isSelected = dashboard?.sleep[dayIndex + 1] === hours;
                        return (
                          <td 
                            key={dayIndex} 
                            className="border border-gray-200 p-0 cursor-pointer"
                            onClick={() => setSleep(dayIndex + 1, hours)}
                          >
                            <div className={cn(
                              "w-full h-8 transition-all duration-200",
                              isSelected ? "bg-blue-500" : "hover:bg-gray-100"
                            )} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes Section */}
            <div className="mt-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Note:</label>
              <textarea
                value={dashboard?.notes || ''}
                onChange={handleNotesChange}
                placeholder="Add your reflections, goals, or notes for this month..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-y"
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

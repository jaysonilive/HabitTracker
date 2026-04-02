import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, TrendingUp, Target, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export default function Auth() {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left Side - Hero/Branding */}
      <div className="md:w-1/2 bg-gray-900 text-white p-8 md:p-16 flex flex-col justify-center relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-full h-96 bg-gradient-to-t from-purple-500 to-transparent blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-lg mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              Use your features and <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">analyze everything.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-12 leading-relaxed">
              Track your daily habits, monitor your sleep streaks, and get 1% better every single day with our beautiful, real-time dashboard.
            </p>
          </motion.div>

          <div className="space-y-8">
            {[
              { icon: Target, text: "Set and customize your daily habits" },
              { icon: Activity, text: "Visualize your sleep patterns with connected streaks" },
              { icon: TrendingUp, text: "Watch your total points grow over the month" }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                className="flex items-center space-x-5 text-gray-300"
              >
                <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700 shadow-inner">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <span className="font-medium text-lg">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login */}
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-12 bg-gray-50 relative">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-md w-full space-y-8 p-10 bg-white rounded-[2rem] shadow-2xl border border-gray-100 text-center relative z-10"
        >
          <div>
            <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl transform -rotate-3">
              <Target className="w-10 h-10 text-white transform rotate-3" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-gray-500 text-lg">
              Sign in to sync your 1% better journey
            </p>
          </div>
          
          <div className="pt-4">
            <button
              onClick={handleLogin}
              className="group relative w-full flex justify-center items-center space-x-3 py-4 px-4 border border-transparent text-lg font-medium rounded-xl text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <LogIn className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
              <span>Continue with Google</span>
            </button>
          </div>
          
          <p className="text-sm text-gray-400 mt-8">
            Secure, real-time sync across all your devices.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

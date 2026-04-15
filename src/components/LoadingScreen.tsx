import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

export default function LoadingScreen() {
  const orbitRadius = 60;
  const numDots = 8;

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at 30% 40%, #1e1b4b 0%, #0f172a 55%, #020617 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        userSelect: 'none',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Ambient glow blobs */}
      <div
        style={{
          position: 'absolute',
          top: '18%',
          left: '12%',
          width: 520,
          height: 520,
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '18%',
          right: '10%',
          width: 380,
          height: 380,
          background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Orbit container */}
      <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 52 }}>
        {/* Outer slow-rotating dashed ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 16, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: -14,
            borderRadius: '50%',
            border: '1.5px dashed rgba(99,102,241,0.3)',
          }}
        />
        {/* Inner counter-rotating ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: -28,
            borderRadius: '50%',
            border: '1px dashed rgba(16,185,129,0.15)',
          }}
        />

        {/* Orbiting colored dots */}
        {Array.from({ length: numDots }).map((_, i) => {
          const angle = (i / numDots) * 2 * Math.PI - Math.PI / 2;
          const x = orbitRadius * Math.cos(angle);
          const y = orbitRadius * Math.sin(angle);
          const hue = 220 + i * 18;
          return (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: `hsl(${hue}, 80%, 70%)`,
                left: `calc(50% + ${x}px - 5px)`,
                top: `calc(50% + ${y}px - 5px)`,
                boxShadow: `0 0 10px hsl(${hue}, 80%, 68%)`,
              }}
              animate={{ scale: [1, 1.65, 1], opacity: [0.3, 1, 0.3] }}
              transition={{
                repeat: Infinity,
                duration: 1.8,
                delay: (i / numDots) * 1.8,
                ease: 'easeInOut',
              }}
            />
          );
        })}

        {/* Center logo */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 160, damping: 18 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 68,
            height: 68,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.10), 0 0 40px rgba(99,102,241,0.6), 0 0 90px rgba(16,185,129,0.2)',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.13, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          >
            <Check style={{ width: 32, height: 32, color: 'white', strokeWidth: 3 }} />
          </motion.div>
        </motion.div>
      </div>

      {/* App name */}
      <motion.h1
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.6, ease: 'easeOut' }}
        style={{
          color: '#f1f5f9',
          fontSize: '1.9rem',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          margin: 0,
          marginBottom: 12,
        }}
      >
        HabitTracker
      </motion.h1>

      {/* Syncing text with bouncing dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          color: '#475569',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}
      >
        <span>Syncing your habits</span>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
            style={{ display: 'inline-block', fontWeight: 700 }}
          >
            .
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

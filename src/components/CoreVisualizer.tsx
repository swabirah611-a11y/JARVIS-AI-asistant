/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssistantState } from '../types';

interface CoreVisualizerProps {
  state: AssistantState;
}

export const CoreVisualizer: React.FC<CoreVisualizerProps> = ({ state }) => {
  // Define visual parameters based on current state
  const getStateColors = () => {
    switch (state) {
      case AssistantState.LISTENING:
        return {
          glow: 'rgba(0, 240, 255, 0.4)',
          primary: '#00f0ff',
          secondary: '#0070f3',
          ambientText: 'LISTENING',
        };
      case AssistantState.THINKING:
        return {
          glow: 'rgba(121, 40, 202, 0.4)',
          primary: '#7928ca',
          secondary: '#00f0ff',
          ambientText: 'THINKING',
        };
      case AssistantState.SPEAKING:
        return {
          glow: 'rgba(0, 112, 243, 0.4)',
          primary: '#0070f3',
          secondary: '#7928ca',
          ambientText: 'SPEAKING',
        };
      case AssistantState.ERROR:
        return {
          glow: 'rgba(255, 0, 85, 0.4)',
          primary: '#ff0055',
          secondary: '#ffaa00',
          ambientText: 'ERROR',
        };
      case AssistantState.IDLE:
      default:
        return {
          glow: 'rgba(0, 240, 255, 0.15)',
          primary: '#0070f3',
          secondary: '#00f0ff',
          ambientText: 'JARVIS ONLINE',
        };
    }
  };

  const colors = getStateColors();

  // Custom inner core scale animations based on state
  const getCoreScaleAnimation = () => {
    switch (state) {
      case AssistantState.LISTENING:
        return {
          scale: [1, 1.15, 0.95, 1.1, 1],
          transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
        };
      case AssistantState.THINKING:
        return {
          scale: [1, 1.05, 1],
          transition: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
        };
      case AssistantState.SPEAKING:
        return {
          scale: [1, 1.25, 0.9, 1.2, 1],
          transition: { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
        };
      case AssistantState.ERROR:
        return {
          scale: [1, 0.95, 1.05, 1],
          transition: { repeat: Infinity, duration: 3, ease: "easeInOut" }
        };
      case AssistantState.IDLE:
      default:
        return {
          scale: [1, 1.04, 1],
          transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
        };
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-6 md:p-12 w-full max-w-md mx-auto aspect-square">
      {/* Absolute Ambient Background Glow */}
      <motion.div
        className="absolute w-72 h-72 rounded-full filter blur-3xl opacity-30 mix-blend-screen pointer-events-none transition-colors duration-1000"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, rgba(5,7,10,0) 70%)`
        }}
      />

      {/* Main Core Graphic */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        
        {/* Outer Circular Radar Track */}
        <svg className="absolute w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="0.5"
          />
          {/* Dotted tracking layer */}
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="0.5"
            strokeDasharray="1 4"
          />
        </svg>

        {/* Shifting Outer Radar Sweep Line (Active states only) */}
        <AnimatePresence>
          {state !== AssistantState.ERROR && (
            <motion.div
              className="absolute w-[86%] h-[86%] rounded-full border border-transparent"
              style={{
                borderTopColor: `rgba(${state === AssistantState.IDLE ? '255,255,255,0.05' : '0,240,255,0.2'})`,
              }}
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: state === AssistantState.THINKING ? 3 : 8,
                ease: "linear"
              }}
            />
          )}
        </AnimatePresence>

        {/* Orbiting Tech Node 1 */}
        <motion.div
          className="absolute w-[80%] h-[80%] rounded-full border border-dashed"
          style={{
            borderColor: `${colors.primary}15`,
          }}
          animate={{ rotate: -360 }}
          transition={{
            repeat: Infinity,
            duration: 24,
            ease: "linear"
          }}
        >
          {/* Tiny orbital cursor dot */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full shadow-lg"
            style={{ backgroundColor: colors.primary, boxShadow: `0 0 8px ${colors.primary}` }}
          />
        </motion.div>

        {/* Orbiting Tech Node 2 (Spins opposite direction) */}
        <motion.div
          className="absolute w-[68%] h-[68%] rounded-full border border-dashed"
          style={{
            borderColor: `${colors.secondary}10`,
          }}
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 16,
            ease: "linear"
          }}
        >
          {/* Secondary smaller cursor dot */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full opacity-60"
            style={{ backgroundColor: colors.secondary }}
          />
        </motion.div>

        {/* Concentric Audio Ripple Ring 1 (Active during SPEAKING or LISTENING) */}
        <AnimatePresence>
          {(state === AssistantState.SPEAKING || state === AssistantState.LISTENING) && (
            <motion.div
              key="ripple1"
              className="absolute rounded-full border pointer-events-none"
              style={{ borderColor: colors.primary }}
              initial={{ width: '48%', height: '48%', opacity: 0.8 }}
              animate={{
                width: ['48%', '90%'],
                height: ['48%', '90%'],
                opacity: [0.8, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                repeat: Infinity,
                duration: state === AssistantState.SPEAKING ? 1.2 : 1.8,
                ease: "easeOut"
              }}
            />
          )}
        </AnimatePresence>

        {/* Concentric Audio Ripple Ring 2 */}
        <AnimatePresence>
          {state === AssistantState.SPEAKING && (
            <motion.div
              key="ripple2"
              className="absolute rounded-full border pointer-events-none"
              style={{ borderColor: colors.secondary }}
              initial={{ width: '48%', height: '48%', opacity: 0.6 }}
              animate={{
                width: ['48%', '80%'],
                height: ['48%', '80%'],
                opacity: [0.6, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                delay: 0.4,
                ease: "easeOut"
              }}
            />
          )}
        </AnimatePresence>

        {/* Middle Core Rotating Geometry */}
        <motion.div
          className="absolute w-[48%] h-[48%] rounded-full flex items-center justify-center"
          animate={{ rotate: state === AssistantState.THINKING ? -360 : 360 }}
          transition={{
            repeat: Infinity,
            duration: state === AssistantState.THINKING ? 4 : 12,
            ease: "linear"
          }}
        >
          {/* Technical notched ring overlay */}
          <svg className="w-full h-full opacity-30" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={colors.primary}
              strokeWidth="2.5"
              strokeDasharray="18 10 5 10"
            />
          </svg>
        </motion.div>

        {/* Center Glowing Core Sphere */}
        <motion.div
          className="absolute w-[36%] h-[36%] rounded-full flex items-center justify-center shadow-2xl"
          style={{
            background: `radial-gradient(circle, ${colors.primary} 0%, ${colors.secondary}dd 100%)`,
            boxShadow: `0 0 24px ${colors.primary}40, inset 0 0 12px rgba(255,255,255,0.4)`,
          }}
          animate={getCoreScaleAnimation() as any}
        >
          {/* Inner futuristic geometric symbol or indicator */}
          <div className="text-[10px] font-mono tracking-wider text-white select-none pointer-events-none opacity-80 font-bold">
            {state === AssistantState.IDLE && "JV"}
            {state === AssistantState.LISTENING && "REC"}
            {state === AssistantState.THINKING && "CPU"}
            {state === AssistantState.SPEAKING && "OUT"}
            {state === AssistantState.ERROR && "ERR"}
          </div>
        </motion.div>
      </div>

      {/* Center Subtext Status Label */}
      <div className="mt-6 flex flex-col items-center">
        <motion.span
          className="font-display text-sm tracking-widest text-gray-400 font-medium uppercase"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          {colors.ambientText}
        </motion.span>
        
        {/* Decorative micro coordinate grid element */}
        <span className="font-mono text-[9px] text-gray-600 mt-1 uppercase select-none">
          SYS.STAGE_1.ACT_CORE
        </span>
      </div>
    </div>
  );
};

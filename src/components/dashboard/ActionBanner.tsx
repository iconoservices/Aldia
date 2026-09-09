import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Play, Pause, RotateCcw } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface ActionBannerProps {
    performanceScore: number;
    missions: any[];
}

export const ActionBanner = (_props: ActionBannerProps) => {
    // --- LÓGICA POMODORO ---
    const POMO_TIME = 12 * 60;
    const [timeLeft, setTimeLeft] = useState(POMO_TIME);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: any;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (typeof Audio !== 'undefined') {
                try {
                    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                    if (context.state === 'suspended') context.resume();
                    const osc = context.createOscillator();
                    osc.connect(context.destination);
                    osc.start();
                    osc.stop(context.currentTime + 0.3);
                } catch (e) { console.error("Audio error", e); }
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // --- CÁLCULO PROGRESO AÑO ---
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const yearProgress = Math.round((dayOfYear / 365) * 100);

    return (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '8px', 
            marginBottom: '1rem',
            width: '100%'
        }}>
            {/* RACHA */}
            <GlassCard style={{ 
                padding: '0.6rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: 'linear-gradient(135deg, #059669 0%, #FF5F2E 100%)', 
                color: 'white', 
                border: 'none',
                minHeight: '75px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <Flame size={20} fill="white" />
                </motion.div>
                <span style={{ fontSize: '0.5rem', fontWeight: 900, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RACHA</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 900 }}>Fuego!</span>
            </GlassCard>

            {/* POMODORO COMPACTO */}
            <GlassCard style={{ 
                padding: '0.6rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '75px',
                gap: '2px'
            }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(timeLeft)}
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                        onClick={() => setIsActive(!isActive)} 
                        style={{ background: 'transparent', border: 'none', color: 'var(--domain-orange)', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                        {isActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                    <button 
                        onClick={() => { setTimeLeft(POMO_TIME); setIsActive(false); }}
                        style={{ background: 'transparent', border: 'none', color: '#CCC', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                        <RotateCcw size={12} />
                    </button>
                </div>
                <div style={{ width: '80%', height: '2px', background: '#F0F0F0', borderRadius: '1px', marginTop: '4px', overflow: 'hidden' }}>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(POMO_TIME - timeLeft) / POMO_TIME * 100}%` }}
                        style={{ height: '100%', background: 'var(--domain-orange)' }}
                    />
                </div>
            </GlassCard>

            {/* PROGRESO AÑO */}
            <GlassCard style={{ 
                padding: '0.6rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: 'var(--text-carbon)', 
                color: 'white',
                minHeight: '75px',
                border: 'none'
            }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--domain-green)' }}>{yearProgress}%</span>
                <span style={{ fontSize: '0.5rem', fontWeight: 900, opacity: 0.8, textTransform: 'uppercase' }}>AÑO {now.getFullYear()}</span>
                <div style={{ width: '80%', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', marginTop: '4px', overflow: 'hidden' }}>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${yearProgress}%` }}
                        style={{ height: '100%', background: 'var(--domain-green)' }}
                    />
                </div>
            </GlassCard>
        </div>
    );
};

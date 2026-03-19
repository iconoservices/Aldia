import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Play, Pause, RotateCcw } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface ActionBannerProps {
    performanceScore: number;
    missions: any[];
}

export const ActionBanner = ({ performanceScore }: ActionBannerProps) => {
    // --- LÓGICA POMODORO ---
    const [timeLeft, setTimeLeft] = useState(12 * 60);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: any;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Sonido simple si es posible
            if (typeof Audio !== 'undefined') {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (context.state === 'suspended') context.resume();
                const osc = context.createOscillator();
                osc.connect(context.destination);
                osc.start();
                osc.stop(context.currentTime + 0.3);
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
            gap: '12px', 
            marginBottom: '1rem' 
        }}>
            {/* STREAK CARD */}
            <GlassCard style={{ 
                padding: '0.8rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: 'linear-gradient(135deg, #FF8C42 0%, #FF5F2E 100%)', 
                color: 'white', 
                border: 'none',
                minHeight: '100px'
            }}>
                <Flame size={28} fill="white" />
                <span style={{ fontSize: '0.7rem', fontWeight: 900, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Racha</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>¡EN FUEGO!</span>
            </GlassCard>

            {/* POMODORO CARD */}
            <GlassCard style={{ 
                padding: '0.8rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '6px',
                minHeight: '100px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-carbon)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(timeLeft)}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button 
                            onClick={() => setIsActive(!isActive)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--domain-orange)', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                            {isActive ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </button>
                        <RotateCcw 
                            size={14} 
                            color="#CCC" 
                            style={{ cursor: 'pointer' }} 
                            onClick={() => { setTimeLeft(12 * 60); setIsActive(false); }} 
                        />
                    </div>
                </div>
                <div style={{ width: '100%', height: '4px', background: '#F5F5F5', borderRadius: '2px', overflow: 'hidden' }}>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((12*60)-timeLeft)/(12*60)*100}%` }}
                        style={{ height: '100%', background: 'var(--domain-orange)' }}
                    />
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#AAA', textTransform: 'uppercase' }}>Focus 12m</span>
            </GlassCard>

            {/* YEAR PROGRESS CARD */}
            <GlassCard style={{ 
                padding: '0.8rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: 'var(--text-carbon)', 
                color: 'white',
                minHeight: '100px'
            }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--domain-green)' }}>{yearProgress}%</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.8, textTransform: 'uppercase' }}>Año {now.getFullYear()}</span>
                <span style={{ fontSize: '0.55rem', opacity: 0.5, marginTop: '2px' }}>Día {dayOfYear} / 365</span>
            </GlassCard>
        </div>
    );
};

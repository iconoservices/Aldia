import { useState, useEffect } from 'react';
import { Flame, Target, MoreVertical, Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

interface BentoGridProps {
    performanceScore: number;
    missions: any[];
}

export const BentoGrid = ({ performanceScore, missions }: BentoGridProps) => {
    // --- LÓGICA POMODORO ---
    const [pomoMode, setPomoMode] = useState<'classic' | 'blocks'>('blocks');
    const [activeMissionId, setActiveMissionId] = useState<number | null>(null);
    const [currentSession, setCurrentSession] = useState(1);
    const [isBreak, setIsBreak] = useState(false);
    
    const WORK_TIME = pomoMode === 'blocks' ? 12 * 60 : 25 * 60;
    const BREAK_TIME = pomoMode === 'blocks' ? 3 * 60 : 5 * 60;
    const TOTAL_SESSIONS = pomoMode === 'blocks' ? 4 : 1;
    
    const [timeLeft, setTimeLeft] = useState(WORK_TIME); 
    const [isActive, setIsActive] = useState(false);
    const [initialTime, setInitialTime] = useState(WORK_TIME);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [soundType, setSoundType] = useState<'tictac' | 'soft' | 'digital'>('tictac');
    const [audio] = useState<HTMLAudioElement | null>(typeof Audio !== 'undefined' ? new Audio() : null);

    // Reproducir tictac cada segundo
    useEffect(() => {
        if (isActive && soundEnabled && audio && timeLeft > 0) {
            // Generar un pequeño tono tipo tictac (Beep)
            const playTick = async () => {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (context.state === 'suspended') await context.resume();
                
                const currTime = context.currentTime;
                const osc = context.createOscillator();
                const gain = context.createGain();

                osc.type = soundType === 'tictac' ? 'sine' : soundType === 'soft' ? 'triangle' : 'square';
                osc.frequency.setValueAtTime(soundType === 'tictac' ? 800 : 400, currTime);
                
                gain.gain.setValueAtTime(0.05, currTime);
                gain.gain.exponentialRampToValueAtTime(0.01, currTime + 0.1);

                osc.connect(gain);
                gain.connect(context.destination);

                osc.start(currTime);
                osc.stop(currTime + 0.1);
                
                setTimeout(() => context.close(), 200);
            };
            
            playTick();
        }
    }, [timeLeft, isActive, soundEnabled, soundType]);

    useEffect(() => {
        let interval: number | undefined;

        if (isActive && timeLeft > 0) {
            interval = window.setInterval(() => {
                setTimeLeft((prev: number) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            
            // Lógica de cambio de sesión
            if (!isBreak) {
                // Terminó trabajo -> Empezar descanso
                setIsBreak(true);
                setTimeLeft(BREAK_TIME);
                setInitialTime(BREAK_TIME);
            } else {
                // Terminó descanso -> Siguiente sesión de trabajo
                setIsBreak(false);
                if (currentSession < TOTAL_SESSIONS) {
                    setCurrentSession((prev: number) => prev + 1);
                    setTimeLeft(WORK_TIME);
                    setInitialTime(WORK_TIME);
                } else {
                    // Terminó el ciclo
                    setCurrentSession(1);
                    setTimeLeft(WORK_TIME);
                    setInitialTime(WORK_TIME);
                }
            }

            if (soundEnabled) {
                // Sonido de finalización (Triple Beep)
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                const playBeep = (freq: number, startTime: number, duration: number) => {
                    const osc = context.createOscillator();
                    const gain = context.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, startTime);
                    gain.gain.setValueAtTime(0.1, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                    osc.connect(gain);
                    gain.connect(context.destination);
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                };
                playBeep(880, context.currentTime, 0.3);
                playBeep(880, context.currentTime + 0.4, 0.3);
                playBeep(1100, context.currentTime + 0.8, 0.6);
                setTimeout(() => context.close(), 2000);
            }
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => {
        // Desbloquear AudioContext para navegadores móviles
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (context.state === 'suspended') context.resume();
        setIsActive(!isActive);
    };
    const resetTimer = () => {
        setIsActive(false);
        setIsBreak(false);
        setCurrentSession(1);
        setTimeLeft(WORK_TIME);
        setInitialTime(WORK_TIME);
    };

    // Reset completo cuando cambia el modo
    useEffect(() => {
        resetTimer();
    }, [pomoMode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = ((initialTime - timeLeft) / initialTime) * 100; // En porcentaje ahora
    const circleProgress = ((initialTime - timeLeft) / initialTime) * 360; // Para el gradiente

    // --- CÁLCULO PROGRESO AÑO ---
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const yearProgress = Math.round((dayOfYear / 365) * 100);

    return (
        <div className="bento-grid">
            {/* HERO WIDGET (Pomodoro) */}
            <div className="glass-card hero-widget">
                <div className="widget-header" style={{ justifyContent: 'space-between', padding: '0 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select 
                            value={activeMissionId || ''} 
                            onChange={(e) => setActiveMissionId(e.target.value ? Number(e.target.value) : null)}
                            style={{ 
                                fontSize: '0.65rem', 
                                background: '#F5F5F5', 
                                border: '1px solid #EEE', 
                                borderRadius: '8px',
                                color: '#666',
                                fontWeight: 700,
                                outline: 'none',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                maxWidth: '100px',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            <option value="">🎯 ENFOCAR EN...</option>
                            {missions.filter(m => !m.completed).map(m => (
                                <option key={m.id} value={m.id}>{m.text}</option>
                            ))}
                        </select>
                        <RotateCcw 
                            size={18} 
                            className="icon-subtle clickable" 
                            onClick={resetTimer}
                            style={{ cursor: 'pointer' }}
                        />
                        <select 
                            value={pomoMode} 
                            onChange={(e) => {
                                setIsActive(false);
                                setPomoMode(e.target.value as any);
                            }}
                            className="pomo-mode-select"
                            style={{ 
                                fontSize: '0.65rem', 
                                background: 'rgba(255, 140, 66, 0.15)', 
                                border: '1px solid rgba(255, 140, 66, 0.3)', 
                                borderRadius: '8px',
                                color: 'var(--domain-orange)',
                                fontWeight: 900,
                                outline: 'none',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                textTransform: 'uppercase'
                            }}
                        >
                            <option value="blocks">MODO BLOQUES (1H)</option>
                            <option value="classic">MODO CLÁSICO (25M)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div 
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            {soundEnabled ? <Volume2 size={16} color="var(--domain-orange)" /> : <VolumeX size={16} color="#CCC" />}
                        </div>
                        {soundEnabled && (
                            <select 
                                value={soundType} 
                                onChange={(e) => setSoundType(e.target.value as any)}
                                style={{ 
                                    fontSize: '0.6rem', 
                                    background: '#F5F5F5', 
                                    border: 'none', 
                                    borderRadius: '6px',
                                    color: '#666',
                                    fontWeight: 700,
                                    outline: 'none',
                                    padding: '2px 4px'
                                }}
                            >
                                <option value="tictac">Tika-Tak</option>
                                <option value="soft">Zen</option>
                                <option value="digital">Digital</option>
                            </select>
                        )}
                        <MoreVertical size={20} className="icon-subtle" />
                    </div>
                </div>
                
                <div 
                    className="pomodoro-visual" 
                    onClick={toggleTimer}
                    style={{ 
                        cursor: 'pointer',
                        background: `conic-gradient(${isBreak ? 'var(--domain-green)' : 'var(--domain-orange)'} ${circleProgress}deg, #FFF5EB 0deg)`,
                        border: 'none',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        width: '85%',
                        height: '85%',
                        background: 'white',
                        borderRadius: '50%',
                        zIndex: 0
                    }}></div>
                    
                    <div style={{ zIndex: 1, textAlign: 'center', width: '80%', padding: '0 10px' }}>
                        {activeMissionId && (
                            <motion.p 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ 
                                    margin: '0 0 4px 0', 
                                    fontSize: '0.65rem', 
                                    fontWeight: 800, 
                                    color: '#AAA',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}
                            >
                                Enfocado en:
                            </motion.p>
                        )}
                        <h2 className="pomodoro-time" style={{ margin: 0, fontSize: activeMissionId ? '2rem' : '2.4rem' }}>{formatTime(timeLeft)}</h2>
                        
                        {activeMissionId ? (
                            <p style={{ 
                                margin: '4px 0', 
                                fontSize: '0.75rem', 
                                fontWeight: 900, 
                                color: 'var(--text-carbon)',
                                lineHeight: 1.2,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {missions.find(m => m.id === activeMissionId)?.text}
                            </p>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                {isActive ? <Pause size={14} color="#DDD" fill="#DDD" /> : <Play size={14} color="var(--domain-orange)" fill="var(--domain-orange)" />}
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: isBreak ? 'var(--domain-green)' : 'var(--domain-orange)', textTransform: 'uppercase' }}>
                                    {isBreak ? 'Descanso' : 'Enfoque'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* SESIONES (BLOQUES) - Solo si estamos en modo bloques */}
                {pomoMode === 'blocks' && (
                    <div style={{ display: 'flex', gap: '6px', width: '100%', padding: '0 10px', marginBottom: '10px' }}>
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} style={{ 
                                flex: 1, 
                                height: '6px', 
                                borderRadius: '3px', 
                                background: s < currentSession ? 'var(--domain-orange)' : (s === currentSession ? '#F0EBE6' : '#F9F9F9'),
                                overflow: 'hidden',
                                position: 'relative',
                                border: s === currentSession ? '1.5px solid #EEE' : 'none'
                            }}>
                                {s === currentSession && (
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: progress + '%' }} 
                                        style={{ 
                                            height: '100%', 
                                            background: isBreak ? 'var(--domain-green)' : 'var(--domain-orange)',
                                            position: 'absolute',
                                            left: 0,
                                            top: 0
                                        }} 
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <p className="widget-label" style={{ marginBottom: '2px' }}>
                    {pomoMode === 'blocks' ? `Bloque ${currentSession} de 4` : (isBreak ? 'Descanso Clásico' : 'Enfoque Clásico')}
                </p>
                <span className="badge-active" style={{ color: performanceScore > 50 ? 'var(--domain-green)' : 'var(--domain-orange)', marginTop: 0 }}>
                    {performanceScore > 70 ? 'Ultra Foco' : 'Productivo'}
                </span>
            </div>

            {/* RIGHT COLUMN (Streak + Minis) */}
            <div className="right-widgets">
                {/* HORIZONTAL PILL (Fire Streak) */}
                <div className="glass-card streak-widget">
                    <Flame size={28} color="white" strokeWidth={2.5} fill="white" />
                    <p>8 Días de Racha</p>
                </div>

                {/* DOS CUADRADOS SMALL */}
                <div className="mini-widgets-row">
                    <div className="glass-card mini-square">
                        <Target size={24} color="#3D312E" strokeWidth={2} />
                        <p>Meta<br />Hoy</p>
                    </div>
                    {/* WIDGET DE PROGRESO DE AÑO / DIAS */}
                    <div className="glass-card mini-square center-content" style={{ background: 'var(--text-carbon)', color: 'white' }}>
                        <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 600, opacity: 0.7, color: 'white' }}>EL {now.getFullYear()} VA AL</p>
                        <h3 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', fontWeight: 900, color: 'var(--domain-green)' }}>{yearProgress}%</h3>
                        <p style={{ margin: 0, fontSize: '0.55rem', color: '#888' }}>Día {dayOfYear} / 365</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

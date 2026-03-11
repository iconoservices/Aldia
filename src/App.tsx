import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { Header } from './components/layout/Header';
import { BentoGrid } from './components/dashboard/BentoGrid';
import { UpcomingList } from './components/dashboard/UpcomingList';
import { MissionList } from './components/dashboard/MissionList';
import { VidaDashboard } from './components/dashboard/VidaDashboard';
import { CerebroDashboard } from './components/dashboard/CerebroDashboard';
import { FinanzasDashboard } from './components/dashboard/FinanzasDashboard';
import { StatsDashboard } from './components/dashboard/StatsDashboard';
import { SuperFab } from './components/features/SuperFab';
import { NoteDetailsModal } from './components/features/NoteDetailsModal';

import { useAlDiaState } from './hooks/useAlDiaState';

import { ProfileOverlay } from './components/layout/ProfileOverlay';

function App() {
  const [activeTab, setActiveTab] = useState('Acción');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewingNoteId, setViewingNoteId] = useState<number | null>(null);

  const state = useAlDiaState();
  const viewingNote = state.notes.find(n => n.id === viewingNoteId) || null;

  return (
    <div className="aldia-container">
      {/* HEADER COMPRIMIDO */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onProfileClick={() => setIsProfileOpen(true)}
      />

      {/* RENDER CONDICIONAL Y DASHBOARD */}
      <main className="dashboard">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ width: '100%' }}
          >
            {activeTab === 'Acción' ? (
              <>
                <BentoGrid performanceScore={state.performanceScore} missions={state.missions} />
                <div className="dashboard-right-col">
                  {/* 1. SECCIÓN DE ALTA PRIORIDAD (Agenda y Misiones Q1) */}
                  <UpcomingList 
                    agenda={state.agenda} 
                    title="Agenda" 
                  />

                  <MissionList
                    missions={state.missions.filter(m => m.critical && !m.completed)}
                    toggleMission={state.toggleMission}
                    onOpenNote={setViewingNoteId}
                    title="Prioridad Q1 (Urgente)"
                    showTimeBlock={false}
                    showMatrixLinks={false}
                    hideOnEmpty={true}
                  />

                  {/* 4. RESTO DE MISIONES (NO CRÍTICAS O COMPLETADAS) */}
                  <MissionList
                    missions={state.missions.filter(m => {
                      const today = new Date().toISOString().split('T')[0];
                      const isTodayOrPast = !m.dueDate || m.dueDate <= today;
                      // Si no es crítica, o si ya está completada pero es de hoy/pasado
                      return (!m.critical || m.completed) && isTodayOrPast;
                    })}
                    toggleMission={state.toggleMission}
                    onOpenNote={setViewingNoteId}
                    title="Tareas de Hoy"
                    hideOnEmpty={true}
                    onTimelineClick={() => setActiveTab('Vida')}
                  />
                </div>
              </>
            ) : activeTab === 'Vida' ? (
              <VidaDashboard
                habits={state.habits}
                toggleHabit={state.toggleHabit}
                addHabit={state.addHabit}
                timeBlocks={state.timeBlocks}
                addTimeBlock={state.addTimeBlock}
                removeTimeBlock={state.removeTimeBlock}
                missions={state.missions}
                agenda={state.agenda}
              />
            ) : activeTab === 'Cerebro' ? (
              <CerebroDashboard 
                notes={state.notes} 
                removeNote={state.removeNote} 
                toggleNoteItem={state.toggleNoteItem}
                onOpenNote={setViewingNoteId}
              />
            ) : activeTab === 'Finanzas' ? (
              <FinanzasDashboard
                balance={state.balance}
                income={state.todayIncome}
                expense={state.todayExpense}
                owe={state.debtsOwe}
                owed={state.debtsOwed}
                transactions={state.transactions}
              />
            ) : activeTab === 'Stats' ? (
              <StatsDashboard
                performanceScore={state.performanceScore}
                missionFocusScore={state.missionFocusScore}
                completedMissionsCount={state.completedMissionsCount}
              />
            ) : (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Modo {activeTab} 🚧</h2>
                <p>En construcción...</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <NoteDetailsModal 
        isOpen={viewingNoteId !== null} 
        onClose={() => setViewingNoteId(null)}
        note={viewingNote}
        removeNote={state.removeNote}
        toggleNoteItem={state.toggleNoteItem}
        addMission={state.addMission}
      />

      {/* SUPER FAB RADIAL */}
      <SuperFab
        addMission={state.addMission}
        addTransaction={state.addTransaction}
        addHabit={state.addHabit}
        addCalendarEvent={state.addCalendarEvent}
        addNote={state.addNote}
        addTimeBlock={state.addTimeBlock}
      />

      <ProfileOverlay
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

export default App;

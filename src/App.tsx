// Final deployment build - Aldia App
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
import { ProyectosDashboard } from './components/dashboard/ProyectosDashboard';
import { CalendarioView } from './components/dashboard/CalendarioView';
import { SuperFab } from './components/features/SuperFab';
import { NoteDetailsModal } from './components/features/NoteDetailsModal';
import { MissionEditOverlay } from './components/features/MissionEditOverlay';
import { DayTimelineView } from './components/dashboard/DayTimelineView';
import type { Mission } from './hooks/useAlDiaState';

import { useAlDiaState } from './hooks/useAlDiaState';

import { ProfileOverlay } from './components/layout/ProfileOverlay';
import { usePWA } from './hooks/usePWA';
import { RefreshCw } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('Acción');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewingNoteId, setViewingNoteId] = useState<number | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  const state = useAlDiaState();
  const { needRefresh, updateServiceWorker } = usePWA();
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
                    missions={state.missions.filter(m => {
                      const today = new Date().toISOString().split('T')[0];
                      const isTodayOrPast = !m.dueDate || m.dueDate <= today;
                      return isTodayOrPast;
                    })}
                    toggleMission={state.toggleMission}
                    onOpenNote={setViewingNoteId}
                    onEditMission={setEditingMission}
                    removeMission={state.removeMission}
                    title="Misiones"
                    onTimelineClick={() => setIsTimelineOpen(true)}
                    projects={state.projects}
                  />
                </div>
              </>
            ) : activeTab === 'Calendario' ? (
              <CalendarioView 
                agenda={state.agenda}
                timeBlocks={state.timeBlocks}
                rutinas={state.rutinas}
              />
            ) : activeTab === 'Vida' ? (
              <VidaDashboard
                habits={state.habits}
                toggleHabit={state.toggleHabit}
                addHabit={state.addHabit}
                removeHabit={state.removeHabit}
                rutinas={state.rutinas}
                addRoutineItem={state.addRoutineItem}
                toggleRoutineItem={state.toggleRoutineItem}
                removeRoutineItem={state.removeRoutineItem}
                updateRoutine={state.updateRoutine}
                addRoutine={state.addRoutine}
                removeRoutine={state.removeRoutine}
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
                monthlyBudget={state.monthlyBudget}
                updateMonthlyBudget={state.updateMonthlyBudget}
                fixedExpenses={state.fixedExpenses}
                addFixedExpense={state.addFixedExpense}
                removeFixedExpense={state.removeFixedExpense}
                toggleFixedExpense={state.toggleFixedExpense}
                projects={state.projects}
              />
            ) : activeTab === 'Proyectos' ? (
              <ProyectosDashboard
                projects={state.projects}
                missions={state.missions}
                timeBlocks={state.timeBlocks}
                onAddProject={() => setIsAddingProject(true)}
                deleteProject={state.deleteProject}
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

      <MissionEditOverlay 
        isOpen={editingMission !== null}
        onClose={() => setEditingMission(null)}
        mission={editingMission}
        updateMission={state.updateMission}
        removeMission={state.removeMission}
        projects={state.projects}
      />

      <DayTimelineView
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        missions={state.missions}
        rutinas={state.rutinas}
        agenda={state.agenda}
      />

      {/* SUPER FAB RADIAL */}
      <SuperFab
        addMission={state.addMission}
        addTransaction={state.addTransaction}
        addHabit={state.addHabit}
        addCalendarEvent={state.addCalendarEvent}
        addNote={state.addNote}
        addTimeBlock={state.addTimeBlock}
        addProject={state.addProject}
        projects={state.projects}
        rutinas={state.rutinas}
        forceOpenType={isAddingProject ? 'proyecto' : undefined}
        onForceOpenClose={() => setIsAddingProject(false)}
      />

      <ProfileOverlay
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* NOTIFICACIÓN DE ACTUALIZACIÓN (ANTI-CACHÉ) */}
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            style={{
              position: 'fixed', bottom: '100px', left: '20px', right: '20px',
              zIndex: 9999, background: 'var(--domain-orange)', color: 'white',
              padding: '12px 20px', borderRadius: '16px', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 10px 30px rgba(255, 140, 66, 0.4)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RefreshCw size={20} className="spin-slow" />
              <span style={{ fontSize: '0.85rem', fontWeight: 900 }}>¡NUEVA VERSIÓN LISTA!</span>
            </div>
            <button
              onClick={() => updateServiceWorker()}
              style={{
                background: 'white', color: 'var(--domain-orange)', border: 'none',
                padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem',
                fontWeight: 900, cursor: 'pointer'
              }}
            >
              ACTUALIZAR YA
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

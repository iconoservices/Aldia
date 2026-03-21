// Final deployment build - Aldia App
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { Header } from './components/layout/Header';
import { UpcomingList } from './components/dashboard/UpcomingList';
import { MissionList } from './components/dashboard/MissionList';
import { VidaDashboard } from './components/dashboard/VidaDashboard';
import { CerebroDashboard } from './components/dashboard/CerebroDashboard';
import { FinanzasDashboard } from './components/dashboard/FinanzasDashboard';
import { StatsDashboard } from './components/dashboard/StatsDashboard';
import { ProyectosDashboard } from './components/dashboard/ProyectosDashboard';
import { CalendarioView } from './components/dashboard/CalendarioView';
import { ProjectDetailView } from './components/dashboard/ProjectDetailView';
import { SuperFab } from './components/features/SuperFab';
import { NoteDetailsModal } from './components/features/NoteDetailsModal';
import { MissionEditOverlay } from './components/features/MissionEditOverlay';
import { DayTimelineView } from './components/dashboard/DayTimelineView';
import { ActionBanner } from './components/dashboard/ActionBanner';
import { useAlDiaState } from './hooks/useAlDiaState';
import type { Mission, Note } from './hooks/useAlDiaState';
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
  const [selectedProjectDetailId, setSelectedProjectDetailId] = useState<number | null>(null);

  const state = useAlDiaState();
  const { needRefresh, updateServiceWorker } = usePWA();
  const viewingNote: Note | null = state.notes.find((n: Note) => n.id === viewingNoteId) || null;
  const selectedProjectDetail = state.projects.find((p: any) => p.id === selectedProjectDetailId);

  if (state.isInitialLoad) {
    return (
      <div style={{ 
        height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center', background: '#FDF8F5', gap: '1.5rem' 
      }}>
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: '4rem' }}
        >
          🧠
        </motion.div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-carbon)' }}>AlDía</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#AAA' }}>SINCRONIZANDO TU MENTE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aldia-container">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onProfileClick={() => setIsProfileOpen(true)}
      />

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <ActionBanner performanceScore={state.performanceScore} missions={state.missions} />
                <div className="dashboard-grid-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  <UpcomingList agenda={state.agenda} title="Agenda del Día" />
                  <MissionList 
                    missions={state.todayMissions}
                    toggleMission={state.toggleMission}
                    toggleHabit={state.toggleHabit}
                    toggleRoutineItem={state.toggleRoutineItem}
                    onOpenNote={setViewingNoteId}
                    onEditMission={setEditingMission}
                    removeMission={(id: number) => {
                        const mission = state.todayMissions.find((m: Mission) => m.id === id);
                        if (mission?.isRoutine) {
                          if (confirm('¿Eliminar esta tarea de la rutina?')) {
                            state.removeRoutineItem(mission.routineId!, id);
                          }
                        } else if (mission?.isHabit) {
                          if (confirm('¿Eliminar este hábito por completo?')) {
                            state.removeHabit(id);
                          }
                        } else {
                          state.removeMission(id);
                        }
                    }}
                    reorderMissions={state.reorderMissions}
                    projects={state.projects}
                    onTimelineClick={() => setIsTimelineOpen(true)}
                    title="Misiones Hoy"
                  />
                </div>
              </div>
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
                updateRoutineItem={state.updateRoutineItem}
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
                todayNet={state.todayNet}
                todayIncomeReal={state.todayIncomeReal}
                todayExpenseReal={state.todayExpenseReal}
                totalIncomeReal={state.totalIncomeReal}
                totalExpenseReal={state.totalExpenseReal}
                totalNetReal={state.totalNetReal}
                owe={state.debtsOwe}
                owed={state.debtsOwed}
                transactions={state.transactions}
                monthlyBudget={state.monthlyBudget}
                updateMonthlyBudget={state.updateMonthlyBudget}
                fixedExpenses={state.fixedExpenses}
                addFixedExpense={state.addFixedExpense}
                removeFixedExpense={state.removeFixedExpense}
                toggleFixedExpense={state.toggleFixedExpense}
                updateFixedExpense={state.updateFixedExpense}
                repayDebt={state.repayDebt}
                removeTransaction={state.removeTransaction}
                updateTransactionGroup={state.updateTransactionGroup}
                markFixedExpensePaid={state.markFixedExpensePaid}
                unmarkFixedExpensePaid={state.unmarkFixedExpensePaid}
                projects={state.projects}
                accounts={state.accounts}
                setAccounts={state.setAccounts}
              />
            ) : activeTab === 'Proyectos' ? (
              <ProyectosDashboard
                projects={state.projects}
                onAddProject={() => setIsAddingProject(true)}
                deleteProject={state.deleteProject}
                updateProject={state.updateProject}
                onOpenDetail={(id: number) => setSelectedProjectDetailId(id)}
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
        projects={state.projects}
        addProjectTask={state.addProjectTask}
        updateNote={state.updateNote}
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
        fixedExpenses={state.fixedExpenses}
        markFixedExpensePaid={state.markFixedExpensePaid}
      />

      <SuperFab
        addMission={state.addMission}
        addTransaction={state.addTransaction}
        addHabit={state.addHabit}
        addRoutineItem={state.addRoutineItem}
        addCalendarEvent={state.addCalendarEvent}
        addNote={state.addNote}
        addTimeBlock={state.addTimeBlock}
        addProject={state.addProject}
        projects={state.projects}
        accounts={state.accounts}
        rutinas={state.rutinas}
        forceOpenType={isAddingProject ? 'proyecto' : undefined}
        onForceOpenClose={() => setIsAddingProject(false)}
      />

      <AnimatePresence>
        {selectedProjectDetailId && selectedProjectDetail && (
          <ProjectDetailView 
            project={selectedProjectDetail}
            onClose={() => setSelectedProjectDetailId(null)}
            accounts={state.accounts}
            setAccounts={state.setAccounts}
            transactions={state.transactions}
            addProjectTask={state.addProjectTask}
            toggleProjectTask={state.toggleProjectTask}
            removeProjectTask={state.removeProjectTask}
            updateProjectTask={state.updateProjectTask}
            reorderProjectTasks={state.reorderProjectTasks}
            promoteTaskToRoutine={state.promoteTaskToRoutine}
            removeRoutineItem={state.removeRoutineItem}
            rutinas={state.rutinas}
            addProjectCategory={state.addProjectCategory}
            removeProjectCategory={state.removeProjectCategory}
            addInventoryItem={state.addInventoryItem}
            updateInventoryItemQuantity={state.updateInventoryItemQuantity}
            removeInventoryItem={state.removeInventoryItem}
          />
        )}
      </AnimatePresence>

      <ProfileOverlay
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        clearAllData={state.clearAllData}
      />

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

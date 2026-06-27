// Final deployment build - Aldia App
import { useState, useEffect } from 'react';
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
import { ProjectDetailView } from './components/dashboard/ProjectDetailView';
import { ProjectsKanbanView } from './components/dashboard/ProjectsKanbanView';
import { LienzoDashboard } from './components/dashboard/LienzoDashboard';
import { RecycleBinView } from './components/features/RecycleBinView';
import { TimelineAgendaView } from './components/dashboard/TimelineAgendaView';
import { SuperFab } from './components/features/SuperFab';
import { NoteDetailView } from './components/dashboard/NoteDetailView';
import { MissionEditOverlay } from './components/features/MissionEditOverlay';
import { DayTimelineView } from './components/dashboard/DayTimelineView';
import { ActionBanner } from './components/dashboard/ActionBanner';
import { useAlDiaState } from './hooks/useAlDiaState';
import type { Mission, Note } from './hooks/useAlDiaState';
import { ProfileOverlay } from './components/layout/ProfileOverlay';
import { BloquesDashboard } from './components/dashboard/BloquesDashboard';
import { ChecklistDiario } from './components/dashboard/ChecklistDiario';
import { BaseDatosDashboard } from './components/dashboard/BaseDatosDashboard';
import { ProyeccionOriginalDashboard } from './components/dashboard/ProyeccionOriginalDashboard';
import { RitaDashboard } from './components/dashboard/RitaDashboard';
import { EcosistemaMap } from './components/dashboard/EcosistemaMap';
import { BienestarDashboard } from './components/dashboard/BienestarDashboard';
import { DeudasyCobrosDashboard } from './components/dashboard/DeudasyCobrosDashboard';
import { NegocioDashboard } from './components/dashboard/NegocioDashboard';
import { NegocioLienzo } from './components/dashboard/NegocioLienzo';

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/lienzo')) return 'Lienzo';
    if (path.includes('/stats')) return 'Stats';
    if (path.includes('/finanzas')) return 'Finanzas';
    if (path.includes('/proyectos')) return 'Proyectos';
    if (path.includes('/tablero')) return 'Tablero';
    if (path.includes('/vida')) return 'Vida';
    if (path.includes('/cerebro')) return 'Cerebro';
    if (path.includes('/bloques')) return 'Bloques';
    if (path.includes('/checklist')) return 'Checklist';
    if (path.includes('/calendario')) return 'Calendario';
    if (path.includes('/ruta')) return 'Ruta';
    if (path.includes('/mapa')) return 'Mapa';
    if (path.includes('/accion')) return 'Acción';
    if (path.includes('/base')) return 'Base de Datos';
    if (path.includes('/proyeccion')) return 'Proyección';
    if (path.includes('/bloques')) return 'Bloques';
    if (path.includes('/deudas')) return 'Deudas';
    if (path.includes('/bienestar')) return 'Bienestar';
    if (path.includes('/negocio')) return 'Negocio';
    if (path.includes('/lienzo-ops')) return 'Lienzo Ops';
    return 'Checklist';
  });

  useEffect(() => {
    let path = `/${activeTab.toLowerCase()}`;
    if (activeTab === 'Checklist') {
      path = '/';
    } else if (activeTab === 'Acción') {
      path = '/accion';
    } else if (activeTab === 'Base de Datos') {
      path = '/base';
    } else if (activeTab === 'Proyección') {
      path = '/proyeccion';
    } else if (activeTab === 'Deudas') {
      path = '/deudas';
    } else if (activeTab === 'Negocio') {
      path = '/negocio';
    } else if (activeTab === 'Lienzo Ops') {
      path = '/lienzo-ops';
    }
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/lienzo')) setActiveTab('Lienzo');
      else if (path.includes('/stats')) setActiveTab('Stats');
      else if (path.includes('/finanzas')) setActiveTab('Finanzas');
      else if (path.includes('/proyectos')) setActiveTab('Proyectos');
      else if (path.includes('/tablero')) setActiveTab('Tablero');
      else if (path.includes('/vida')) setActiveTab('Vida');
      else if (path.includes('/cerebro')) setActiveTab('Cerebro');
      else if (path.includes('/bloques')) setActiveTab('Bloques');
      else if (path.includes('/checklist')) setActiveTab('Checklist');
      else if (path.includes('/calendario')) setActiveTab('Calendario');
      else if (path.includes('/ruta')) setActiveTab('Ruta');
      else if (path.includes('/mapa')) setActiveTab('Mapa');
      else if (path.includes('/accion')) setActiveTab('Acción');
      else if (path.includes('/base')) setActiveTab('Base de Datos');
      else if (path.includes('/proyeccion')) setActiveTab('Proyección');
      else if (path.includes('/bloques')) setActiveTab('Bloques');
    else if (path.includes('/bienestar')) setActiveTab('Bienestar');
    else if (path.includes('/negocio')) setActiveTab('Negocio');
    else if (path.includes('/lienzo-ops')) setActiveTab('Lienzo Ops');
    else if (path.includes('/deudas')) setActiveTab('Deudas');
      else setActiveTab('Checklist');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewingNoteId, setViewingNoteId] = useState<number | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [selectedProjectDetailId, setSelectedProjectDetailId] = useState<number | null>(null);

  const state = useAlDiaState();
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
    <div className={`aldia-container ${activeTab === 'Calendario' || activeTab === 'Lienzo' || activeTab === 'Lienzo Ops' ? 'no-scroll' : ''}`}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onProfileClick={() => setIsProfileOpen(true)}
        onTrashClick={() => setIsTrashOpen(true)}
      />

      <main className={`dashboard ${activeTab === 'Calendario' || activeTab === 'Lienzo' || activeTab === 'Lienzo Ops' ? 'full-bleed' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              width: '100%',
              ...((activeTab === 'Calendario' || activeTab === 'Lienzo' || activeTab === 'Lienzo Ops') && {
                height: 'calc(100dvh - var(--header-height, 65px))', /* Altura de la cabecera */
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              })
            }}
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
                    removeMission={(mission: Mission) => {
                      if (mission.isRoutine) {
                        state.removeRoutineItem(mission.routineId!, mission.id);
                      } else if (mission.isHabit) {
                        state.removeHabit(mission.id);
                      } else {
                        state.removeMission(mission.id);
                      }
                    }}
                    reorderMissions={state.reorderMissions}
                    projects={state.projects}
                    rutinas={state.rutinas}
                    onTimelineClick={() => setIsTimelineOpen(true)}
                    title="Misiones Hoy"
                  />
                </div>
              </div>
            ) : activeTab === 'Base de Datos' ? (
              <BaseDatosDashboard />
            ) : activeTab === 'Proyección' ? (
              <ProyeccionOriginalDashboard
                transactions={state.transactions}
                fixedExpenses={state.fixedExpenses}
                fixedIncomeItems={(() => { try { return JSON.parse(state.preferences.fixedIncomes || '[]'); } catch { return []; }})()}
                currentMonthStr={new Date().toLocaleDateString('en-CA').substring(0, 7)}
              />
            ) : activeTab === 'Calendario' ? (
              <TimelineAgendaView
                calendarEvents={state.agenda}
                projects={state.projects}
                rutinas={state.rutinas}
                habits={state.habits}
                missions={state.missions}
                onRemoveEvent={state.removeCalendarEvent}
                onToggleMission={state.toggleMission}
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
                reorderRoutineItems={state.reorderRoutineItems}
                projects={state.projects}
                promoteRoutineItemToProject={state.promoteRoutineItemToProject}
              />
            ) : activeTab === 'Cerebro' ? (
              <CerebroDashboard
                notes={state.notes}
                removeNote={state.removeNote}
                toggleNoteItem={state.toggleNoteItem}
                onOpenNote={setViewingNoteId}
              />
            ) : activeTab === 'Bloques' ? (
              <BloquesDashboard
                dailyBlocks={state.dailyBlocks}
                addDailyBlock={state.addDailyBlock}
                toggleDailyBlock={state.toggleDailyBlock}
                removeDailyBlock={state.removeDailyBlock}
                updateDailyBlock={state.updateDailyBlock}
                projects={state.projects}
              />
            ) : activeTab === 'Checklist' ? (
              <ChecklistDiario
                dailyBlocks={state.dailyBlocks}
                addDailyBlock={state.addDailyBlock}
                toggleDailyBlock={state.toggleDailyBlock}
                removeDailyBlock={state.removeDailyBlock}
                projects={state.projects}
              />
            ) : activeTab === 'Ruta' ? (
              <RitaDashboard
                entries={state.ritaEntries}
                addEntry={state.addRitaEntry}
                removeEntry={state.removeRitaEntry}
                updateEntry={state.updateRitaEntry}
                addSubitem={state.addRitaSubitem}
                toggleSubitem={state.toggleRitaSubitem}
                removeSubitem={state.removeRitaSubitem}
                addHabit={state.addHabit}
                habits={state.habits}
              />
            ) : activeTab === 'Mapa' ? (
              <EcosistemaMap />
            ) : activeTab === 'Bienestar' ? (
              <BienestarDashboard />
            ) : activeTab === 'Lienzo Ops' ? (
              <NegocioLienzo />
            ) : activeTab === 'Negocio' ? (
              <NegocioDashboard
                negocioProjects={state.negocioProjects}
                addNegocioProject={state.addNegocioProject}
                removeNegocioProject={state.removeNegocioProject}
                updateNegocioProject={state.updateNegocioProject}
                addClient={state.addClient}
                updateClient={state.updateClient}
                removeClient={state.removeClient}
                addWorker={state.addWorker}
                updateWorker={state.updateWorker}
                removeWorker={state.removeWorker}
                addExpense={state.addExpense}
                updateExpense={state.updateExpense}
                removeExpense={state.removeExpense}
              />
            ) : activeTab === 'Deudas' ? (
              <DeudasyCobrosDashboard
                transactions={state.transactions}
                addTransaction={state.addTransaction}
                removeTransaction={state.removeTransaction}
                repayDebt={state.repayDebt}
                accounts={state.accounts}
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
                preferences={state.preferences}
                updatePreference={state.updatePreference}
                projects={state.projects}
                accounts={state.accounts}
                setAccounts={state.setAccounts}
                addTransaction={state.addTransaction}
                // Missing props for ProjectDetailView
                addProjectTask={state.addProjectTask}
                toggleProjectTask={state.toggleProjectTask}
                removeProjectTask={state.removeProjectTask}
                updateProjectTask={state.updateProjectTask}
                reorderProjectTasks={state.reorderProjectTasks}
                promoteTaskToRoutine={state.promoteTaskToRoutine}
                rutinas={state.rutinas}
                addProjectCategory={state.addProjectCategory}
                removeProjectCategory={state.removeProjectCategory}
                addInventoryItem={state.addInventoryItem}
                updateInventoryItemQuantity={state.updateInventoryItemQuantity}
                removeInventoryItem={state.removeInventoryItem}
                updateProject={state.updateProject}
                setSelectedProjectDetailId={setSelectedProjectDetailId}
                onNavigate={setActiveTab}
              />
            ) : activeTab === 'Proyectos' ? (
              <ProyectosDashboard
                projects={state.projects}
                onAddProject={() => setIsAddingProject(true)}
                deleteProject={state.deleteProject}
                updateProject={state.updateProject}
                onOpenDetail={(id: number) => setSelectedProjectDetailId(id)}
                reorderProjects={state.reorderProjects}
              />
            ) : activeTab === 'Tablero' ? (
              <ProjectsKanbanView 
                projects={state.projects}
                addProjectTask={state.addProjectTask}
                toggleProjectTask={state.toggleProjectTask}
                removeProjectTask={state.removeProjectTask}
                updateProjectTask={state.updateProjectTask}
                reorderProjectTasks={state.reorderProjectTasks}
              />
            ) : activeTab === 'Lienzo' ? (
              <LienzoDashboard />
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
        habits={state.habits}
      />

      {activeTab !== 'Lienzo' && activeTab !== 'Checklist' && activeTab !== 'Bloques' && activeTab !== 'Stats' && activeTab !== 'Finanzas' && (
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
      )}

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
            projects={state.projects}
            updateProject={state.updateProject}
            onOpenSubProject={(id: number) => setSelectedProjectDetailId(id)}
            addProjectObjective={state.addProjectObjective}
            updateProjectObjective={state.updateProjectObjective}
            removeProjectObjective={state.removeProjectObjective}
            addProjectNode={state.addProjectNode}
            updateProjectNode={state.updateProjectNode}
            removeProjectNode={state.removeProjectNode}
            promoteNodeToRoutine={state.promoteNodeToRoutine}
            addMission={state.addMission}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingNoteId !== null && viewingNote && (
          <NoteDetailView
            note={viewingNote}
            onClose={() => setViewingNoteId(null)}
            removeNote={state.removeNote}
            toggleNoteItem={state.toggleNoteItem}
            addMission={state.addMission}
            projects={state.projects}
            addProjectTask={state.addProjectTask}
            updateNote={state.updateNote}
          />
        )}
      </AnimatePresence>

      <ProfileOverlay
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        clearAllData={state.clearAllData}
        preferences={state.preferences}
        updatePreference={state.updatePreference}
      />

      <RecycleBinView
        open={isTrashOpen}
        trash={state.trash}
        onRestore={state.restoreFromTrash}
        onClear={state.clearTrash}
        onClose={() => setIsTrashOpen(false)}
      />

    </div>
  );
}

export default App;

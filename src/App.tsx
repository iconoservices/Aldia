// Final deployment build - Aldia App
import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { Header } from './components/layout/Header';
import { useAlDiaState } from './hooks/useAlDiaState';
import type { Mission, Note } from './hooks/useAlDiaState';
import { ProfileOverlay } from './components/layout/ProfileOverlay';
import { PantallaCarga } from './components/common/PantallaCarga';
// Eager: lo que se ve al primer render (pestaña por defecto + su banner).
import { ChecklistDiario } from './components/dashboard/ChecklistDiario';
import { UpcomingList } from './components/dashboard/UpcomingList';
import { MissionList } from './components/dashboard/MissionList';
import { ActionBanner } from './components/dashboard/ActionBanner';

/* El resto de pantallas y overlays se cargan solo al abrirlas (code-splitting):
   así el arranque baja el marco + el Checklist, no las ~45 vistas de una. */
const named = <M extends Record<string, unknown>, K extends keyof M>(
    loader: () => Promise<M>, key: K,
) => lazy(() => loader().then(m => ({ default: m[key] as React.ComponentType<any> })));

const VidaBloquesDashboard = named(() => import('./components/dashboard/VidaBloquesDashboard'), 'VidaBloquesDashboard');
const CerebroDashboard = named(() => import('./components/dashboard/CerebroDashboard'), 'CerebroDashboard');
const FinanzasDashboard = named(() => import('./components/dashboard/FinanzasDashboard'), 'FinanzasDashboard');
const StatsDashboard = named(() => import('./components/dashboard/StatsDashboard'), 'StatsDashboard');
const ProyectosDashboard = named(() => import('./components/dashboard/ProyectosDashboard'), 'ProyectosDashboard');
const ProjectDetailView = named(() => import('./components/dashboard/ProjectDetailView'), 'ProjectDetailView');
const ProjectsKanbanView = named(() => import('./components/dashboard/ProjectsKanbanView'), 'ProjectsKanbanView');
const LienzoDashboard = named(() => import('./components/dashboard/LienzoDashboard'), 'LienzoDashboard');
const RecycleBinView = named(() => import('./components/features/RecycleBinView'), 'RecycleBinView');
const TimelineAgendaView = named(() => import('./components/dashboard/TimelineAgendaView'), 'TimelineAgendaView');
const NoteDetailView = named(() => import('./components/dashboard/NoteDetailView'), 'NoteDetailView');
const MissionEditOverlay = named(() => import('./components/features/MissionEditOverlay'), 'MissionEditOverlay');
const DayTimelineView = named(() => import('./components/dashboard/DayTimelineView'), 'DayTimelineView');
const PlanDashboard = named(() => import('./components/dashboard/PlanDashboard'), 'PlanDashboard');
const BaseDatosDashboard = named(() => import('./components/dashboard/BaseDatosDashboard'), 'BaseDatosDashboard');
const ProyeccionOriginalDashboard = named(() => import('./components/dashboard/ProyeccionOriginalDashboard'), 'ProyeccionOriginalDashboard');
const RitaDashboard = named(() => import('./components/dashboard/RitaDashboard'), 'RitaDashboard');
const EcosistemaMap = named(() => import('./components/dashboard/EcosistemaMap'), 'EcosistemaMap');
const BienestarDashboard = named(() => import('./components/dashboard/BienestarDashboard'), 'BienestarDashboard');
const DeudasyCobrosDashboard = named(() => import('./components/dashboard/DeudasyCobrosDashboard'), 'DeudasyCobrosDashboard');
const NegocioDashboard = named(() => import('./components/dashboard/NegocioDashboard'), 'NegocioDashboard');
const NegocioLienzo = named(() => import('./components/dashboard/NegocioLienzo'), 'NegocioLienzo');
const BuscadorDashboard = named(() => import('./components/dashboard/BuscadorDashboard'), 'BuscadorDashboard');
const MovimientosDashboard = named(() => import('./components/dashboard/MovimientosDashboard'), 'MovimientosDashboard');
const ListasDashboard = named(() => import('./components/dashboard/ListasDashboard'), 'ListasDashboard');
const PendientesDashboard = named(() => import('./components/dashboard/PendientesDashboard'), 'PendientesDashboard');
const BandejaDashboard = named(() => import('./components/dashboard/BandejaDashboard'), 'BandejaDashboard');
const ComprasDashboard = named(() => import('./components/dashboard/ComprasDashboard'), 'ComprasDashboard');
const ComidasDashboard = named(() => import('./components/dashboard/ComidasDashboard'), 'ComidasDashboard');
const EsporadicosDashboard = named(() => import('./components/dashboard/EsporadicosDashboard'), 'EsporadicosDashboard');
const NotionDashboard = named(() => import('./components/dashboard/NotionDashboard'), 'NotionDashboard');
const AgendaDashboard = named(() => import('./components/dashboard/AgendaDashboard'), 'AgendaDashboard');
const TranqueoDeVidaDashboard = named(() => import('./components/dashboard/TranqueoDeVidaDashboard'), 'TranqueoDeVidaDashboard');
const MetasDashboard = named(() => import('./components/dashboard/MetasDashboard'), 'MetasDashboard');
const RendimientoDashboard = named(() => import('./components/dashboard/RendimientoDashboard'), 'RendimientoDashboard');

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    // Ojo: "/lienzo-ops" también matchea "/lienzo", así que el caso más
    // específico va primero — si no, nunca se llega a la rama de abajo.
    if (path.includes('/lienzo-ops')) return 'Lienzo Ops';
    if (path.includes('/lienzo')) return 'Lienzo';
    if (path.includes('/stats')) return 'Stats';
    if (path.includes('/finanzas')) return 'Finanzas';
    if (path.includes('/proyectos')) return 'Proyectos';
    if (path.includes('/entregas')) return 'Entregas';
    if (path.includes('/agenda')) return 'Agenda';
    if (path.includes('/notion')) return 'Notion';
    if (path.includes('/tranqueo')) return 'Tranqueo de Vida';
    if (path.includes('/movimientos')) return 'Movimientos';
    if (path.includes('/listas')) return 'Listas';
    if (path.includes('/pendientes')) return 'Pendientes';
    if (path.includes('/bandeja')) return 'Bandeja';
    if (path.includes('/compras')) return 'Compras';
    if (path.includes('/comidas')) return 'Comidas';
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
    if (path.includes('/buscador')) return 'Buscador';
    if (path.includes('/metas')) return 'Metas';
    if (path.includes('/rendimiento')) return 'Rendimiento';
    if (path.includes('/plan')) return 'Plan';
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
    } else if (activeTab === 'Tranqueo de Vida') {
      path = '/tranqueo-de-vida';
    } else if (activeTab === 'Proyección') {
      path = '/proyeccion';
    } else if (activeTab === 'Deudas') {
      path = '/deudas';
    } else if (activeTab === 'Negocio') {
      path = '/negocio';
    } else if (activeTab === 'Lienzo Ops') {
      path = '/lienzo-ops';
    } else if (activeTab === 'Buscador') {
      path = '/buscador';
    }
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/lienzo-ops')) setActiveTab('Lienzo Ops');
      else if (path.includes('/lienzo')) setActiveTab('Lienzo');
      else if (path.includes('/stats')) setActiveTab('Stats');
      else if (path.includes('/finanzas')) setActiveTab('Finanzas');
      else if (path.includes('/proyectos')) setActiveTab('Proyectos');
      else if (path.includes('/entregas')) setActiveTab('Entregas');
      else if (path.includes('/agenda')) setActiveTab('Agenda');
      else if (path.includes('/notion')) setActiveTab('Notion');
      else if (path.includes('/tranqueo')) setActiveTab('Tranqueo de Vida');
      else if (path.includes('/movimientos')) setActiveTab('Movimientos');
      else if (path.includes('/listas')) setActiveTab('Listas');
      else if (path.includes('/pendientes')) setActiveTab('Pendientes');
      else if (path.includes('/bandeja')) setActiveTab('Bandeja');
      else if (path.includes('/compras')) setActiveTab('Compras');
      else if (path.includes('/comidas')) setActiveTab('Comidas');
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
      else if (path.includes('/gastos-fijos')) setActiveTab('Gastos Fijos');
      else if (path.includes('/bloques')) setActiveTab('Bloques');
    else if (path.includes('/bienestar')) setActiveTab('Bienestar');
    else if (path.includes('/negocio')) setActiveTab('Negocio');
    else if (path.includes('/deudas')) setActiveTab('Deudas');
    else if (path.includes('/buscador')) setActiveTab('Buscador');
    else if (path.includes('/metas')) setActiveTab('Metas');
    else if (path.includes('/rendimiento')) setActiveTab('Rendimiento');
    else if (path.includes('/plan')) setActiveTab('Plan');
      else setActiveTab('Checklist');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewingNoteId, setViewingNoteId] = useState<number | null>(null);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [selectedProjectDetailId, setSelectedProjectDetailId] = useState<number | null>(null);

  const state = useAlDiaState();
  const viewingNote: Note | null = state.notes.find((n: Note) => n.id === viewingNoteId) || null;
  const selectedProjectDetail = state.projects.find((p: any) => p.id === selectedProjectDetailId);

  if (state.isInitialLoad) {
    return <PantallaCarga completa texto="Sincronizando tu mente…" />;
  }

  return (
    <div className={`aldia-container ${activeTab === 'Calendario' || activeTab === 'Lienzo' || activeTab === 'Lienzo Ops' ? 'no-scroll' : ''}`}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onProfileClick={() => setIsProfileOpen(true)}
        onTrashClick={() => setIsTrashOpen(true)}
      />

      <Suspense fallback={<PantallaCarga />}>
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
                fixedExpenses={state.fixedExpenses}
                fixedIncomeItems={(() => { try { return JSON.parse(state.preferences.fixedIncomes || '[]'); } catch { return []; }})()}
                currentMonthStr={new Date().toLocaleDateString('en-CA').substring(0, 7)}
                preferences={state.preferences}
                updatePreference={state.updatePreference}
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
                updateRoutine={state.updateRoutine}
                updateCalendarEvent={state.updateCalendarEvent}
                addRoutine={state.addRoutine}
                addCalendarEvent={state.addCalendarEvent}
                dailyBlocks={state.dailyBlocks}
                addDailyBlock={state.addDailyBlock}
                toggleDailyBlock={state.toggleDailyBlock}
              />
            ) : (activeTab === 'Vida' || activeTab === 'Bloques') ? (
              <VidaBloquesDashboard
                initial={activeTab === 'Vida' ? 'habitos' : 'rutina'}
                dailyBlocks={state.dailyBlocks}
                addDailyBlock={state.addDailyBlock}
                toggleDailyBlock={state.toggleDailyBlock}
                removeDailyBlock={state.removeDailyBlock}
                updateDailyBlock={state.updateDailyBlock}
                preferences={state.preferences}
                updatePreference={state.updatePreference}
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
            ) : activeTab === 'Checklist' ? (
              <ChecklistDiario
                dailyBlocks={state.dailyBlocks}
                addDailyBlock={state.addDailyBlock}
                toggleDailyBlock={state.toggleDailyBlock}
                removeDailyBlock={state.removeDailyBlock}
                updateDailyBlock={state.updateDailyBlock}
                projects={state.projects}
                addTransaction={state.addTransaction}
                accounts={state.accounts}
                incomeCategories={state.incomeCategories}
                expenseCategories={state.expenseCategories}
                categoryAccountScope={state.categoryAccountScope}
                categoryGroups={state.categoryGroups}
                groupAccountScope={state.groupAccountScope}
              />
            ) : activeTab === 'Plan' ? (
              <PlanDashboard
                transactions={state.transactions}
                fixedExpenses={state.fixedExpenses}
                preferences={state.preferences}
                accounts={state.accounts}
                addFixedExpense={state.addFixedExpense}
                removeFixedExpense={state.removeFixedExpense}
                toggleFixedExpense={state.toggleFixedExpense}
                updateFixedExpense={state.updateFixedExpense}
                payFixedExpensePartial={state.payFixedExpensePartial}
                unmarkFixedExpensePaid={state.unmarkFixedExpensePaid}
                rolloverFixedExpenses={state.rolloverFixedExpenses}
                payPendingPeriod={state.payPendingPeriod}
                unmarkPendingPeriod={state.unmarkPendingPeriod}
                addTransaction={state.addTransaction}
                removeTransaction={state.removeTransaction}
                updatePreference={state.updatePreference}
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
            ) : activeTab === 'Metas' ? (
              <MetasDashboard
                goals={state.goals}
                addGoal={state.addGoal}
                updateGoal={state.updateGoal}
                removeGoal={state.removeGoal}
                addGoalMilestone={state.addGoalMilestone}
                toggleGoalMilestone={state.toggleGoalMilestone}
                removeGoalMilestone={state.removeGoalMilestone}
              />
            ) : activeTab === 'Rendimiento' ? (
              <RendimientoDashboard
                sporadicProjects={state.sporadicProjects}
                transactions={state.transactions}
                dailyCheckins={state.dailyCheckins}
                toggleDailyCheckin={state.toggleDailyCheckin}
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
                updateTransaction={state.updateTransaction}
                accounts={state.accounts}
                contacts={state.contacts}
                setContacts={state.setContacts}
                addFixedExpense={state.addFixedExpense}
                fixedExpenses={state.fixedExpenses}
                removeFixedExpense={state.removeFixedExpense}
                preferences={state.preferences}
                updatePreference={state.updatePreference}
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
                repayDebt={state.repayDebt}
                updateTransaction={state.updateTransaction}
                updateTransactionGroup={state.updateTransactionGroup}
                rolloverFixedExpenses={state.rolloverFixedExpenses}
                preferences={state.preferences}
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
                incomeCategories={state.incomeCategories}
                expenseCategories={state.expenseCategories}
                addCategory={state.addCategory}
                removeCategory={state.removeCategory}
                renameCategory={state.renameCategory}
                mergeCategory={state.mergeCategory}
                categoryAccountScope={state.categoryAccountScope}
                setCategoryAccounts={state.setCategoryAccounts}
                categoryGroups={state.categoryGroups}
                setCategoryGroup={state.setCategoryGroup}
                categoryDescriptions={state.categoryDescriptions}
                setCategoryDescription={state.setCategoryDescription}
                renameCategoryGroup={state.renameCategoryGroup}
                deleteCategoryGroup={state.deleteCategoryGroup}
                groupAccountScope={state.groupAccountScope}
                setGroupAccounts={state.setGroupAccounts}
                aplicarPlantilla={state.aplicarPlantilla}
              />
            ) : activeTab === 'Movimientos' ? (
              <MovimientosDashboard
                transactions={state.transactions}
                removeTransaction={state.removeTransaction}
                updateTransaction={state.updateTransaction}
                accounts={state.accounts}
                incomeCategories={state.incomeCategories}
                expenseCategories={state.expenseCategories}
              />
            ) : activeTab === 'Listas' ? (
              <ListasDashboard
                notes={state.notes}
                addNote={state.addNote}
                removeNote={state.removeNote}
                toggleNoteItem={state.toggleNoteItem}
                updateNote={state.updateNote}
              />
            ) : activeTab === 'Bandeja' ? (
              <BandejaDashboard
                notes={state.notes}
                addNote={state.addNote}
                updateNote={state.updateNote}
              />
            ) : activeTab === 'Pendientes' ? (
              <PendientesDashboard
                notes={state.notes}
                addNote={state.addNote}
                removeNote={state.removeNote}
                toggleNoteItem={state.toggleNoteItem}
                updateNote={state.updateNote}
                agenda={state.agenda}
              />
            ) : activeTab === 'Compras' ? (
              <ComprasDashboard
                shoppingList={state.shoppingList}
                addShoppingItem={state.addShoppingItem}
                updateShoppingItem={state.updateShoppingItem}
                removeShoppingItem={state.removeShoppingItem}
                markShoppingItemPurchased={state.markShoppingItemPurchased}
                presupuestoDisponible={state.balance}
              />
            ) : activeTab === 'Comidas' ? (
              <ComidasDashboard
                recipes={state.recipes}
                addRecipe={state.addRecipe}
                updateRecipe={state.updateRecipe}
                removeRecipe={state.removeRecipe}
                mealPlanEntries={state.mealPlanEntries}
                addMealPlanEntry={state.addMealPlanEntry}
                moveMealPlanEntry={state.moveMealPlanEntry}
                removeMealPlanEntry={state.removeMealPlanEntry}
                nutritionGoals={state.nutritionGoals}
                updateNutritionGoals={state.updateNutritionGoals}
                shoppingList={state.shoppingList}
                addShoppingItem={state.addShoppingItem}
              />
            ) : activeTab === 'Proyectos' ? (
              <ProyectosDashboard
                projects={state.projects}
                addProject={state.addProject}
                deleteProject={state.deleteProject}
                updateProject={state.updateProject}
                onOpenDetail={(id: number) => setSelectedProjectDetailId(id)}
                reorderProjects={state.reorderProjects}
              />
            ) : activeTab === 'Entregas' ? (
              <EsporadicosDashboard
                sporadicProjects={state.sporadicProjects}
                addSporadicProject={state.addSporadicProject}
                updateSporadicProject={state.updateSporadicProject}
                removeSporadicProject={state.removeSporadicProject}
                rescheduleSporadicProject={state.rescheduleSporadicProject}
                startSporadicTimer={state.startSporadicTimer}
                pauseSporadicTimer={state.pauseSporadicTimer}
                stopSporadicTimer={state.stopSporadicTimer}
                startPhotoTimer={state.startPhotoTimer}
                pausePhotoTimer={state.pausePhotoTimer}
                finishPhotoTimer={state.finishPhotoTimer}
                cancelPhotoTimer={state.cancelPhotoTimer}
                adjustPhotoManualExtra={state.adjustPhotoManualExtra}
                resetSporadicWorkedTime={state.resetSporadicWorkedTime}
                resetSporadicPhotoLog={state.resetSporadicPhotoLog}
                removeLastPhotoLog={state.removeLastPhotoLog}
                calendarEvents={state.agenda}
                updateCalendarEvent={state.updateCalendarEvent}
                phaseTemplates={state.phaseTemplates}
                addFaseTemplate={state.addFaseTemplate}
                removeFaseTemplate={state.removeFaseTemplate}
                addFaseTemplateStep={state.addFaseTemplateStep}
                removeFaseTemplateStep={state.removeFaseTemplateStep}
                setFaseTemplateStepStage={state.setFaseTemplateStepStage}
                applyFaseTemplate={state.applyFaseTemplate}
                addProjectFase={state.addProjectFase}
                removeProjectFase={state.removeProjectFase}
                toggleProjectFase={state.toggleProjectFase}
                setProjectFaseStage={state.setProjectFaseStage}
                startFaseTimer={state.startFaseTimer}
                pauseFaseTimer={state.pauseFaseTimer}
                finishFaseTimer={state.finishFaseTimer}
              />
            ) : activeTab === 'Notion' ? (
              <NotionDashboard
                calendarEvents={state.agenda}
                updateCalendarEvent={state.updateCalendarEvent}
              />
            ) : activeTab === 'Agenda' ? (
              <AgendaDashboard
                calendarEvents={state.agenda}
                addCalendarEvent={state.addCalendarEvent}
                removeCalendarEvent={state.removeCalendarEvent}
                updateCalendarEvent={state.updateCalendarEvent}
                preferences={state.preferences}
                updatePreference={state.updatePreference}
                notes={state.notes}
                addNote={state.addNote}
                toggleNoteItem={state.toggleNoteItem}
                updateNote={state.updateNote}
              />
            ) : activeTab === 'Tranqueo de Vida' ? (
              <TranqueoDeVidaDashboard
                notes={state.notes}
                addNote={state.addNote}
                removeNote={state.removeNote}
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
            ) : activeTab === 'Buscador' ? (
              <BuscadorDashboard />
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
        clearFinanzasSelectivo={state.clearFinanzasSelectivo}
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
      </Suspense>

    </div>
  );
}

export default App;

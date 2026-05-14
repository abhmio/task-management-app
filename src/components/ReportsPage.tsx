import { useMemo, useState } from 'react';
import AppSidebar from './AppSidebar';
import { TaskItem } from './TaskPage';

type DateFilter = 'Today' | 'This Week' | 'This Month' | 'Custom Range';

function ReportsPage({
  tasks,
  onNavigate,
  userName,
  onLogout,
}: {
  tasks: TaskItem[];
  onNavigate: (screen: 'dashboard' | 'task' | 'teams' | 'notifications' | 'reports') => void;
  userName: string;
  onLogout?: () => void;
}) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('This Week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const today = new Date('2026-03-24T00:00:00+05:30');

  const dateError =
    dateFilter === 'Custom Range' &&
    customStartDate &&
    customEndDate &&
    new Date(customStartDate) > new Date(customEndDate)
      ? 'Start date must be before or equal to end date'
      : '';

  const reportTasks = useMemo(() => {
    if (dateFilter !== 'Custom Range' || !customStartDate || !customEndDate || dateError) {
      return tasks;
    }

    const startDate = new Date(`${customStartDate}T00:00:00`);
    const endDate = new Date(`${customEndDate}T23:59:59`);

    return tasks.filter((task) => {
      const deadline = new Date(`${task.deadline}T12:00:00`);
      return deadline >= startDate && deadline <= endDate;
    });
  }, [customEndDate, customStartDate, dateError, dateFilter, tasks]);

  const hasReportData = reportTasks.length > 0 && !dateError;
  const totalTasks = reportTasks.length;
  const completedTasks = reportTasks.filter((task) => task.status === 'Completed').length;
  const pendingTasks = reportTasks.filter(
    (task) => task.status === 'Pending' || task.status === 'To Do' || task.status === 'In Progress',
  ).length;
  const overdueTasks = reportTasks.filter(
    (task) => task.status !== 'Completed' && new Date(task.deadline) < today,
  ).length;

  const teamPerformance = useMemo(() => {
    const map = new Map<string, number>();

    reportTasks.forEach((task) => {
      if (task.status === 'Completed') {
        map.set(task.assignee, (map.get(task.assignee) ?? 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([name, completed]) => ({ name, completed }))
      .sort((left, right) => right.completed - left.completed);
  }, [reportTasks]);

  const completionSeries = [24, 38, 30, 48, 56, 61, 72].map((value) =>
    Number.isFinite(value) ? value : 0,
  );
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const pendingPercent = totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0;
  const overduePercent = Math.max(0, 100 - completionPercent - pendingPercent);
  const categoryCounts = reportTasks.reduce(
    (counts, task) => ({
      ...counts,
      [task.category]: (counts[task.category] ?? 0) + 1,
    }),
    {} as Record<string, number>,
  );
  const categoryBreakdown = [
    { label: 'Personal', value: Math.round(((categoryCounts.Personal ?? 0) / Math.max(totalTasks, 1)) * 100), tone: 'category-blue' },
    { label: 'Work', value: Math.round(((categoryCounts.Work ?? 0) / Math.max(totalTasks, 1)) * 100), tone: 'category-purple' },
    { label: 'Academic', value: Math.round(((categoryCounts.Academic ?? 0) / Math.max(totalTasks, 1)) * 100), tone: 'category-gold' },
  ];

  const handleDateFilterChange = (nextFilter: DateFilter) => {
    setDateFilter(nextFilter);
    setReportMessage('');
  };

  const handleExportReport = () => {
    if (!hasReportData) {
      return;
    }

    setReportMessage('Report downloaded successfully');
  };

  return (
    <main className="dashboard-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="spark spark-top" />
      <div className="spark spark-bottom" />

      <AppSidebar
        activeScreen="reports"
        onNavigate={onNavigate}
        onLogout={onLogout}
        userName={userName}
      />

      <section className="dashboard-main reports-main">
        <header className="reports-header">
          <div>
            <p className="section-kicker">Performance Overview</p>
            <h1>Reports</h1>
            <p className="reports-subtitle">
              Analyze your productivity and task performance
            </p>
          </div>

          <div className="reports-toolbar">
            <select
              className="report-filter-select"
              value={dateFilter}
              onChange={(event) => handleDateFilterChange(event.target.value as DateFilter)}
            >
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Custom Range</option>
            </select>
            {dateFilter === 'Custom Range' && (
              <>
                <input
                  className="report-date-input"
                  type="date"
                  aria-label="Start date"
                  value={customStartDate}
                  onChange={(event) => {
                    setReportMessage('');
                    setCustomStartDate(event.target.value);
                  }}
                />
                <input
                  className="report-date-input"
                  type="date"
                  aria-label="End date"
                  value={customEndDate}
                  onChange={(event) => {
                    setReportMessage('');
                    setCustomEndDate(event.target.value);
                  }}
                />
              </>
            )}
            <button
              type="button"
              className="primary-button teams-cta"
              disabled={!hasReportData}
              onClick={handleExportReport}
            >
              Export PDF
            </button>
            <button
              type="button"
              className="secondary-pill"
              disabled={!hasReportData}
              onClick={handleExportReport}
            >
              Export CSV
            </button>
          </div>
        </header>

        {dateError && <p className="form-error report-validation-message">{dateError}</p>}
        {reportMessage && <p className="report-success-message">{reportMessage}</p>}

        {!hasReportData ? (
          <article className="dashboard-card notification-empty-state">
            <div className="empty-bell report-empty-icon" aria-hidden="true">
              <span className="stat-icon list" />
            </div>
            <h2>No report data available</h2>
            <p>Create tasks and complete work to see productivity insights here.</p>
          </article>
        ) : (
          <>
            <section className="reports-summary-grid">
              {[
                { label: 'Total Tasks', value: totalTasks, icon: 'list' },
                { label: 'Completed Tasks', value: completedTasks, icon: 'check' },
                { label: 'Pending Tasks', value: pendingTasks, icon: 'hourglass' },
                { label: 'Overdue Tasks', value: overdueTasks, icon: 'alert' },
              ].map((card) => (
                <article key={card.label} className="dashboard-card stat-card report-stat-card">
                  <div className="stat-top">
                    <div>
                      <p>{card.label}</p>
                      <h3>{card.value}</h3>
                    </div>
                    <div
                      className={
                        card.icon === 'alert'
                          ? 'stat-icon report-alert-icon'
                          : `stat-icon ${card.icon}`
                      }
                      aria-hidden="true"
                    />
                  </div>
                  <span className="stat-detail">{dateFilter} snapshot</span>
                </article>
              ))}
            </section>

            <section className="reports-chart-grid">
              <article className="dashboard-card report-chart-card">
                <div className="panel-head">
                  <h3>Task Completion Over Time</h3>
                  <p>Daily progress</p>
                </div>
                <div className="report-bars">
                  {completionSeries.map((value, index) => (
                    <div key={index} className="report-bar-column">
                      <span style={{ height: `${value * 2}px` }} />
                      <small>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-card report-chart-card">
                <div className="panel-head">
                  <h3>Task Status Distribution</h3>
                  <p>Completed vs Pending vs Overdue</p>
                </div>
                <div className="report-pie-layout">
                  <div
                    className="status-donut-chart"
                    style={{
                      background: `conic-gradient(#8ec5fc 0 ${completionPercent}%, #6c63ff ${completionPercent}% ${completionPercent + pendingPercent}%, #ff8a86 ${completionPercent + pendingPercent}% 100%)`,
                    }}
                  />
                  <div className="report-legend">
                    <span><i className="legend-dot blue" /> Completed ({completionPercent}%)</span>
                    <span><i className="legend-dot purple" /> Pending ({pendingPercent}%)</span>
                    <span><i className="legend-dot coral" /> Overdue ({overduePercent}%)</span>
                  </div>
                </div>
              </article>
            </section>

            <section className="reports-lower-grid">
              <article className="dashboard-card report-chart-card">
                <div className="panel-head">
                  <h3>Category Analysis</h3>
                  <p>Task mix breakdown</p>
                </div>
                <div className="report-pie-layout">
                  <div className="category-donut-chart" />
                  <div className="report-legend">
                    {categoryBreakdown.map((item) => (
                      <span key={item.label}>
                        <i className={`legend-dot ${item.tone}`} /> {item.label} ({item.value}%)
                      </span>
                    ))}
                  </div>
                </div>
              </article>

              <article className="dashboard-card report-chart-card">
                <div className="panel-head">
                  <h3>Team Performance</h3>
                  <p>Completed task comparison</p>
                </div>
                <div className="performance-list">
                  {teamPerformance.length > 0 ? (
                    teamPerformance.map((member) => (
                      <div key={member.name} className="performance-row">
                        <strong>{member.name}</strong>
                        <div className="performance-bar">
                          <span style={{ width: `${Math.max(member.completed * 26, 18)}%` }} />
                        </div>
                        <small>{member.completed}</small>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">No team completion data available yet.</p>
                  )}
                </div>
              </article>
            </section>

            <section className="reports-insights-grid">
              <article className="dashboard-card insight-card">
                <strong>You completed 20% more tasks this week</strong>
                <p>Your momentum improved compared with the previous period.</p>
              </article>
              <article className="dashboard-card insight-card">
                <strong>Most productive day: Monday</strong>
                <p>That’s when the highest completion rate appears in the current trend.</p>
              </article>
              <article className="dashboard-card insight-card">
                <strong>{overdueTasks} tasks are overdue</strong>
                <p>Review pending deadlines to keep your team on track.</p>
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default ReportsPage;

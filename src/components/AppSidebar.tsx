function AppSidebar({
  activeScreen,
  onNavigate,
  onOpenTasks,
  onLogout,
  userName = 'User Name',
}: {
  activeScreen: 'dashboard' | 'task' | 'teams' | 'notifications' | 'reports';
  onNavigate: (screen: 'dashboard' | 'task' | 'teams' | 'notifications' | 'reports') => void;
  onOpenTasks?: () => void;
  onLogout?: () => void;
  userName?: string;
}) {
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <aside className="dashboard-sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <span>T</span>
        </div>
        <span>TaskFlow</span>
      </div>

      <div className="profile-card">
        <div className="avatar">{userInitial}</div>
        <h2>{userName}</h2>
        <p>Task planning workspace</p>
      </div>

      <nav className="sidebar-nav" aria-label="App navigation">
        <button
          type="button"
          className={activeScreen === 'dashboard' ? 'sidebar-link active' : 'sidebar-link'}
          onClick={() => onNavigate('dashboard')}
        >
          <span>Dahboard</span>
        </button>
        <button
          type="button"
          className={activeScreen === 'task' ? 'sidebar-link active' : 'sidebar-link'}
          onClick={() => {
            if (onOpenTasks) {
              onOpenTasks();
              return;
            }

            onNavigate('task');
          }}
        >
          <span>Tasks</span>
        </button>
        <button
          type="button"
          className={activeScreen === 'teams' ? 'sidebar-link active' : 'sidebar-link'}
          onClick={() => onNavigate('teams')}
        >
          <span>Team</span>
        </button>
        <button
          type="button"
          className={activeScreen === 'reports' ? 'sidebar-link active' : 'sidebar-link'}
          onClick={() => onNavigate('reports')}
        >
          <span>Reports</span>
        </button>
        <button
          type="button"
          className={activeScreen === 'notifications' ? 'sidebar-link active' : 'sidebar-link'}
          onClick={() => onNavigate('notifications')}
        >
          <span>Notification</span>
        </button>
        <button type="button" className="sidebar-link sidebar-logout" onClick={onLogout}>
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}

export default AppSidebar;

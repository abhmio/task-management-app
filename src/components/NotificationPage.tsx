import { useMemo, useState } from 'react';
import AppSidebar from './AppSidebar';
import { NotificationItem } from './TaskPage';

type NotificationFilter = 'all' | 'tasks' | 'team' | 'reminders';

function relativeTime(date: string) {
  const now = new Date();
  const value = new Date(date);
  const diffMs = now.getTime() - value.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function groupLabel(date: string) {
  const today = new Date();
  const value = new Date(date);
  const diffDays = Math.floor(
    (today.setHours(0, 0, 0, 0) - value.setHours(0, 0, 0, 0)) / 86400000,
  );

  if (diffDays <= 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  return 'Earlier';
}

function iconClass(category?: NotificationItem['category']) {
  if (category === 'team') {
    return 'notification-icon team';
  }

  if (category === 'reminders') {
    return 'notification-icon reminder';
  }

  return 'notification-icon task';
}

function NotificationPage({
  notifications,
  onNavigate,
  onMarkAllRead,
  onMarkRead,
  onDeleteNotification,
  userName,
  onLogout,
}: {
  notifications: NotificationItem[];
  onNavigate: (screen: 'dashboard' | 'task' | 'teams' | 'notifications' | 'reports') => void;
  onMarkAllRead: () => void;
  onMarkRead: (notificationId: number) => void;
  onDeleteNotification: (notificationId: number) => void;
  userName: string;
  onLogout?: () => void;
}) {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  const visibleNotifications = useMemo(() => {
    if (activeFilter === 'all') {
      return notifications;
    }

    return notifications.filter((notification) => notification.category === activeFilter);
  }, [activeFilter, notifications]);

  const groupedNotifications = useMemo(() => {
    return visibleNotifications.reduce<Record<string, NotificationItem[]>>((accumulator, item) => {
      const label = groupLabel(item.createdAt ?? new Date().toISOString());
      accumulator[label] = [...(accumulator[label] ?? []), item];
      return accumulator;
    }, {});
  }, [visibleNotifications]);

  const orderedGroups = ['Today', 'Yesterday', 'Earlier'].filter(
    (group) => groupedNotifications[group]?.length,
  );

  return (
    <main className="dashboard-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="spark spark-top" />
      <div className="spark spark-bottom" />

      <AppSidebar
        activeScreen="notifications"
        onNavigate={onNavigate}
        onLogout={onLogout}
        userName={userName}
      />

      <section className="dashboard-main notification-main">
        <header className="notifications-header">
          <div>
            <p className="section-kicker">Activity Center</p>
            <h1>Notifications</h1>
            <p className="notifications-subtitle">
              Stay updated with your tasks and team activity
            </p>
          </div>

          <div className="notifications-toolbar">
            <div className="icon-pill" aria-hidden="true">
              <span className="bell-icon" />
            </div>
            <select
              className="notification-filter-select"
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value as NotificationFilter)}
            >
              <option value="all">All</option>
              <option value="tasks">Tasks</option>
              <option value="team">Team</option>
              <option value="reminders">Reminders</option>
            </select>
            <button type="button" className="primary-button teams-cta" onClick={onMarkAllRead}>
              Mark All as Read
            </button>
          </div>
        </header>

        {orderedGroups.length === 0 ? (
          <article className="dashboard-card notification-empty-state">
            <div className="empty-bell" aria-hidden="true">
              <span className="bell-icon" />
            </div>
            <h2>No new notifications</h2>
            <p>Your workspace is calm right now. New updates will appear here.</p>
          </article>
        ) : (
          orderedGroups.map((group) => (
            <section key={group} className="notification-group">
              <div className="panel-head">
                <h3>{group}</h3>
                <p>{groupedNotifications[group].length} update(s)</p>
              </div>

              <div className="notification-list-page">
                {groupedNotifications[group].map((notification) => (
                  <article
                    key={notification.id}
                    className={
                      notification.isRead
                        ? 'dashboard-card notification-card-page'
                        : 'dashboard-card notification-card-page unread'
                    }
                  >
                    <div className={iconClass(notification.category)} />

                    <div className="notification-body">
                      <div className="notification-title-row">
                        <strong>{notification.title}</strong>
                        {!notification.isRead && <span className="unread-dot" />}
                      </div>
                      <p>
                        {notification.detail}{' '}
                        {notification.priority && (
                          <span className={`priority-pill ${notification.priority.toLowerCase()}`}>
                            {notification.priority}
                          </span>
                        )}
                      </p>
                      <span className="notification-time">
                        {relativeTime(notification.createdAt ?? new Date().toISOString())}
                      </span>
                    </div>

                    <div className="notification-actions">
                      <button type="button" className="secondary-pill notification-action-button">
                        View Task
                      </button>
                      {!notification.isRead && (
                        <button
                          type="button"
                          className="ghost-action"
                          onClick={() => onMarkRead(notification.id)}
                        >
                          Mark as Read
                        </button>
                      )}
                      <button
                        type="button"
                        className="delete-icon-button"
                        aria-label="Delete notification"
                        onClick={() => onDeleteNotification(notification.id)}
                      >
                        <span />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </section>
    </main>
  );
}

export default NotificationPage;

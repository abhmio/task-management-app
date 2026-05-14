import { useMemo, useState } from 'react';
import AppSidebar from './AppSidebar';
import { TaskItem } from './TaskPage';

type TeamMember = {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  reportingManager?: string;
  assignedWork: string;
  deadline: string;
  priority: 'Low' | 'Medium' | 'High';
  role: 'Admin' | 'Manager' | 'Member';
  initials: string;
};

type TeamActivity = {
  id: number;
  message: string;
  time: string;
};

type TeamSummary = {
  id: number;
  name: string;
  description: string;
  members: TeamMember[];
  focus: string;
  productivity: number;
  completed: number;
  pending: number;
  activity: TeamActivity[];
};

type TeamTab = 'members' | 'tasks' | 'activity' | 'analytics';

const allowedTeamRoles: TeamMember['role'][] = ['Admin', 'Manager', 'Member'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const initialTeams: TeamSummary[] = [];

const emptyTeamPlaceholder: TeamSummary = {
  id: 0,
  name: 'Your First Team',
  description: 'Create a team to start collaborating with members and assignments.',
  focus: 'No team has been created yet',
  productivity: 0,
  completed: 0,
  pending: 0,
  members: [],
  activity: [
    {
      id: 1,
      message: 'Create a team to see members, tasks, activity, and analytics here.',
      time: 'Ready when you are',
    },
  ],
};

function TeamsPage({
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
  const [teamList, setTeamList] = useState<TeamSummary[]>(initialTeams);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TeamTab>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
  });
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    reportingManager: '',
    assignedWork: '',
    deadline: '2026-04-28',
    priority: 'Medium' as TeamMember['priority'],
    role: 'Member' as TeamMember['role'],
  });

  const activeTeam =
    teamList.find((team) => team.id === activeTeamId) ?? teamList[0] ?? emptyTeamPlaceholder;
  const hasTeams = teamList.length > 0;
  const currentTeamMember = activeTeam.members.find(
    (member) => member.name.toLowerCase() === userName.toLowerCase(),
  );
  const canManageTeamRoles = activeTeam.members.length === 0 || currentTeamMember?.role === 'Admin';

  const teamTasks = useMemo(() => tasks.slice(0, 5), [tasks]);

  const visibleTeams = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return teamList;
    }

    return teamList.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.description.toLowerCase().includes(query) ||
        team.members.some((member) => member.name.toLowerCase().includes(query)),
    );
  }, [searchQuery, teamList]);

  const handleCreateTeam = () => {
    const trimmedTeamName = newTeam.name.trim();

    if (!trimmedTeamName) {
      setTeamError('Team name is required');
      return;
    }

    if (trimmedTeamName.length < 3) {
      setTeamError('Team name must be at least 3 characters');
      return;
    }

    const createdTeam: TeamSummary = {
      id: Date.now(),
      name: trimmedTeamName,
      description: newTeam.description.trim() || 'Newly created team workspace.',
      focus: 'Fresh team workspace for upcoming collaboration',
      productivity: 0,
      completed: 0,
      pending: 0,
      members: [],
      activity: [
        {
          id: Date.now() + 1,
          message: `${userName} created this team`,
          time: 'Just now',
        },
      ],
    };

    setTeamList((current) => [createdTeam, ...current]);
    setActiveTeamId(createdTeam.id);
    setShowCreateTeam(false);
    setTeamError('');
    setNewTeam({ name: '', description: '' });
  };

  const handleInviteViaEmail = () => {
    if (!hasTeams || activeTeam.id === 0 || activeTeam.members.length === 0) {
      return;
    }

    const recipients = activeTeam.members.map((member) => member.email).filter(Boolean);
    const subject = encodeURIComponent(`TaskFlow invite: ${activeTeam.name}`);
    const body = encodeURIComponent(
      `Hello team,\n\nYou are invited to collaborate in the ${activeTeam.name} workspace on TaskFlow.\n\nFocus: ${activeTeam.focus}\n\nPlease review your assigned work and stay aligned on deadlines.\n\nRegards,\n${userName}`,
    );

    if (typeof window !== 'undefined') {
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
          recipients.join(','),
        )}&su=${subject}&body=${body}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  const handleAddMember = () => {
    if (!hasTeams || activeTeam.id === 0) {
      setMemberError('Create a team before adding members');
      return;
    }

    const trimmedName = newMember.name.trim();
    const trimmedEmail = newMember.email.trim().toLowerCase();
    const selectedRole = newMember.role;

    if (trimmedName.length < 2) {
      setMemberError('Member name is required');
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setMemberError('Invalid Mail Id');
      return;
    }

    if (activeTeam.members.some((member) => member.email.toLowerCase() === trimmedEmail)) {
      setMemberError('User already exists in team');
      return;
    }

    if (!allowedTeamRoles.includes(selectedRole)) {
      setMemberError('Invalid role');
      return;
    }

    if (!canManageTeamRoles && selectedRole !== 'Member') {
      setMemberError('Only Admin can change roles');
      return;
    }

    const createdMember: TeamMember = {
      id: Date.now(),
      name: trimmedName,
      email: trimmedEmail,
      phoneNumber: newMember.phoneNumber.trim(),
      reportingManager: newMember.reportingManager.trim() || 'Not assigned',
      assignedWork: newMember.assignedWork.trim() || 'No work assigned yet',
      deadline: newMember.deadline,
      priority: newMember.priority,
      role: selectedRole,
      initials: trimmedName.charAt(0).toUpperCase(),
    };

    setTeamList((current) =>
      current.map((team) =>
        team.id === activeTeam.id
          ? {
              ...team,
              pending: team.pending + 1,
              members: [...team.members, createdMember],
              activity: [
                {
                  id: Date.now() + 1,
                  message: `${userName} added ${trimmedName} and assigned '${createdMember.assignedWork}'`,
                  time: 'Just now',
                },
                ...team.activity,
              ],
            }
          : team,
      ),
    );

    if (typeof window !== 'undefined') {
      const subject = encodeURIComponent(`TaskFlow assignment: ${createdMember.assignedWork}`);
      const body = encodeURIComponent(
        `Hello ${createdMember.name},\n\nYou have been added to ${activeTeam.name} on TaskFlow.\n\nAssigned work: ${createdMember.assignedWork}\nReporting Manager: ${createdMember.reportingManager}\nDeadline: ${createdMember.deadline}\nPriority: ${createdMember.priority}\nPhone: ${createdMember.phoneNumber || 'Not provided'}\n\nRegards,\n${userName}`,
      );
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
          createdMember.email,
        )}&su=${subject}&body=${body}`,
        '_blank',
        'noopener,noreferrer',
      );
    }

    setMemberError('');
    setShowAddMember(false);
    setNewMember({
      name: '',
      email: '',
      phoneNumber: '',
      reportingManager: '',
      assignedWork: '',
      deadline: '2026-04-28',
      priority: 'Medium',
      role: 'Member',
    });
  };

  return (
    <main className="dashboard-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="spark spark-top" />
      <div className="spark spark-bottom" />

      <AppSidebar
        activeScreen="teams"
        onNavigate={onNavigate}
        onLogout={onLogout}
        userName={userName}
      />

      <section className="dashboard-main teams-main">
        <header className="teams-header">
          <div>
            <p className="section-kicker">Team Collaboration</p>
            <h1>Teams</h1>
          </div>

          <div className="teams-toolbar">
            <div className="search-field">
              <span className="search-icon" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search teams or members"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="primary-button teams-cta"
              onClick={() => setShowCreateTeam((value) => !value)}
            >
              Create Team
            </button>
            <button type="button" className="icon-pill" aria-label="Notifications">
              <span className="bell-icon" />
            </button>
            <button type="button" className="profile-pill" aria-label="User profile">
              <span>{userName.trim().charAt(0).toUpperCase() || 'U'}</span>
            </button>
          </div>
        </header>

        <div className="teams-layout">
          <aside className="dashboard-card teams-list-panel">
            <div className="panel-head">
              <h3>All Teams</h3>
              <p>{visibleTeams.length} available</p>
            </div>

            <div className="teams-list">
              {visibleTeams.length > 0 ? (
                visibleTeams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    className={team.id === activeTeam.id ? 'team-card active' : 'team-card'}
                    onClick={() => setActiveTeamId(team.id)}
                  >
                    <div className="team-card-icon">{team.name.charAt(0)}</div>
                    <div className="team-card-copy">
                      <strong>{team.name}</strong>
                      <p>{team.description}</p>
                      <span>{team.members.length} members</span>
                    </div>
                  </button>
                ))
              ) : (
                <article className="team-empty-card">
                  <strong>No teams created yet</strong>
                  <p>Create Team to start building your workspace.</p>
                </article>
              )}
            </div>
          </aside>

          <section className="dashboard-card team-detail-panel">
            <div className="team-detail-top">
              <div>
                <h2>{activeTeam.name}</h2>
                <p>{activeTeam.focus}</p>
              </div>

              <div className="team-top-actions">
                <button
                  type="button"
                  className="secondary-pill"
                  disabled={!hasTeams || activeTeam.members.length === 0}
                  onClick={handleInviteViaEmail}
                >
                  Invite via Mail Id
                </button>
                <div className="stacked-avatars" aria-hidden="true">
                  {activeTeam.members.slice(0, 3).map((member) => (
                    <span key={member.id}>{member.initials}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="team-tabs">
              {(['members', 'tasks', 'activity', 'analytics'] as TeamTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={activeTab === tab ? 'team-tab active' : 'team-tab'}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'members'
                    ? 'Members'
                    : tab === 'tasks'
                      ? 'Tasks'
                      : tab === 'activity'
                        ? 'Activity'
                        : 'Analytics'}
                </button>
              ))}
            </div>

            {activeTab === 'members' && (
              <div className="team-tab-panel">
                <div className="panel-head">
                  <h3>Members</h3>
                  <button
                    type="button"
                    className="secondary-pill"
                    disabled={!hasTeams}
                    onClick={() => setShowAddMember((value) => !value)}
                  >
                    Add Member
                  </button>
                </div>
                {showAddMember && (
                  <section className="dashboard-card create-team-panel nested-team-panel">
                    <div className="assign-grid">
                      <div className="field-group">
                        <label htmlFor="memberFullName" className="required-label">
                          Name
                        </label>
                        <input
                          id="memberFullName"
                          type="text"
                          value={newMember.name}
                          onChange={(event) => {
                            setMemberError('');
                            setNewMember((current) => ({ ...current, name: event.target.value }));
                          }}
                          placeholder="Enter member name"
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor="memberEmail" className="required-label">
                          Mail Id
                        </label>
                        <input
                          id="memberEmail"
                          type="email"
                          value={newMember.email}
                          onChange={(event) => {
                            setMemberError('');
                            setNewMember((current) => ({ ...current, email: event.target.value }));
                          }}
                          placeholder="member@example.com"
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor="memberPhoneNumber">Phone No</label>
                        <input
                          id="memberPhoneNumber"
                          type="tel"
                          value={newMember.phoneNumber}
                          onChange={(event) =>
                            setNewMember((current) => ({
                              ...current,
                              phoneNumber: event.target.value,
                            }))
                          }
                          placeholder="+91 98765 43210"
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor="memberRole">Role</label>
                        <select
                          id="memberRole"
                          value={newMember.role}
                          onChange={(event) => {
                            setMemberError('');
                            setNewMember((current) => ({
                              ...current,
                              role: event.target.value as TeamMember['role'],
                            }));
                          }}
                        >
                          {allowedTeamRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        {!canManageTeamRoles && (
                          <span className="field-hint">Only Admin can change roles</span>
                        )}
                      </div>

                      <div className="field-group field-span-2">
                        <label htmlFor="memberReportingManager">Reporting Manager</label>
                        <input
                          id="memberReportingManager"
                          type="text"
                          value={newMember.reportingManager}
                          onChange={(event) =>
                            setNewMember((current) => ({
                              ...current,
                              reportingManager: event.target.value,
                            }))
                          }
                          placeholder="Enter reporting manager name"
                        />
                      </div>

                      <div className="field-group field-span-2">
                        <label htmlFor="memberAssignedWork">Assign Work</label>
                        <textarea
                          id="memberAssignedWork"
                          className="member-work-textarea"
                          rows={5}
                          value={newMember.assignedWork}
                          onChange={(event) =>
                            setNewMember((current) => ({
                              ...current,
                              assignedWork: event.target.value,
                            }))
                          }
                          placeholder="Write the assigned work details here..."
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor="memberDeadlineTeam">Deadline</label>
                        <input
                          id="memberDeadlineTeam"
                          type="date"
                          value={newMember.deadline}
                          onChange={(event) =>
                            setNewMember((current) => ({
                              ...current,
                              deadline: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor="memberPriorityTeam">Priority</label>
                        <select
                          id="memberPriorityTeam"
                          value={newMember.priority}
                          onChange={(event) =>
                            setNewMember((current) => ({
                              ...current,
                              priority: event.target.value as TeamMember['priority'],
                            }))
                          }
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>
                    {memberError && <p className="form-error">{memberError}</p>}
                    <div className="task-footer-actions">
                      <button
                        type="button"
                        className="ghost-action"
                        onClick={() => setShowAddMember(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="primary-button teams-cta"
                        onClick={handleAddMember}
                      >
                        Save Member
                      </button>
                    </div>
                  </section>
                )}
                <div className="member-grid">
                  {activeTeam.members.length > 0 ? (
                    activeTeam.members.map((member) => (
                      <article key={member.id} className="member-card">
                        <div className="member-avatar">{member.initials}</div>
                        <div className="member-card-top">
                          <div>
                            <strong>{member.name}</strong>
                            <p>{member.role}</p>
                            <span className="member-meta-line">{member.email}</span>
                            <span className="member-meta-line">
                              Reporting Manager: {member.reportingManager || 'Not assigned'}
                            </span>
                            <span className="member-meta-line">
                              {member.assignedWork} - {member.deadline} - {member.priority}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="team-empty-card team-empty-card-wide">
                      <strong>No members yet</strong>
                      <p>Add members after creating a team to see them here.</p>
                    </article>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="team-tab-panel">
                <div className="panel-head">
                  <h3>Tasks</h3>
                  <p>Mini team board</p>
                </div>
                <div className="team-task-board">
                  {teamTasks.length > 0 ? (
                    teamTasks.map((task) => (
                      <article key={task.id} className="team-task-card">
                        <div className="team-task-top">
                          <strong>{task.title}</strong>
                          <span className={`priority-pill ${task.priority.toLowerCase()}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p>{task.description || 'Task details will appear here.'}</p>
                        <div className="team-task-meta">
                          <span className="mini-avatar">{task.assignee.charAt(0).toUpperCase()}</span>
                          <span>Deadline: {task.deadline}</span>
                          <span className="task-status-tag">{task.status}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="team-empty-card team-empty-card-wide">
                      <strong>No team tasks yet</strong>
                      <p>Tasks will appear here when your workspace starts moving.</p>
                    </article>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="team-tab-panel">
                <div className="panel-head">
                  <h3>Activity</h3>
                  <p>Latest updates</p>
                </div>
                <div className="activity-timeline">
                  {activeTeam.activity.map((item) => (
                    <article key={item.id} className="timeline-item">
                      <span className="timeline-dot" />
                      <div>
                        <strong>{item.message}</strong>
                        <p>{item.time}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="team-tab-panel">
                <div className="analytics-cards">
                  <article className="analytics-summary-card">
                    <p>Tasks Completed</p>
                    <h3>{activeTeam.completed}</h3>
                  </article>
                  <article className="analytics-summary-card">
                    <p>Pending Tasks</p>
                    <h3>{activeTeam.pending}</h3>
                  </article>
                  <article className="analytics-summary-card">
                    <p>Productivity</p>
                    <h3>{activeTeam.productivity}%</h3>
                  </article>
                </div>

                <div className="team-analytics-grid">
                  <article className="mini-chart team-chart-card">
                    <h4>Productivity Trend</h4>
                    <div className="line-chart">
                      <svg viewBox="0 0 180 100" aria-hidden="true">
                        <path d="M5 78 C28 56, 46 60, 68 48 S108 15, 132 32 S160 72, 175 26" />
                      </svg>
                    </div>
                  </article>

                  <article className="mini-chart team-chart-card">
                    <h4>Completion Split</h4>
                    <div className="donut-chart" />
                    <p>
                      {hasTeams
                        ? 'This view will become richer as your team activity grows.'
                        : 'Create a team first to start seeing analytics here.'}
                    </p>
                  </article>
                </div>
              </div>
            )}
          </section>
        </div>

        {showCreateTeam && (
          <section className="dashboard-card create-team-panel">
            <div className="panel-head">
              <h3>Create Team</h3>
              <p>Set up a new collaboration space</p>
            </div>
            <div className="assign-grid">
              <div className="field-group">
                <label htmlFor="teamName" className="required-label">
                  Team name
                </label>
                <input
                  id="teamName"
                  type="text"
                  value={newTeam.name}
                  onChange={(event) => {
                    setTeamError('');
                    setNewTeam((current) => ({ ...current, name: event.target.value }));
                  }}
                  placeholder="Enter team name"
                />
              </div>

              <div className="field-group field-span-2">
                <label htmlFor="teamDescription">Description</label>
                <textarea
                  id="teamDescription"
                  rows={3}
                  value={newTeam.description}
                  onChange={(event) =>
                    setNewTeam((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="What is this team focused on?"
                />
              </div>
            </div>
            {teamError && <p className="form-error">{teamError}</p>}
            <div className="task-footer-actions">
              <button
                type="button"
                className="ghost-action"
                onClick={() => setShowCreateTeam(false)}
              >
                Cancel
              </button>
              <button type="button" className="primary-button teams-cta" onClick={handleCreateTeam}>
                Save Team
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default TeamsPage;

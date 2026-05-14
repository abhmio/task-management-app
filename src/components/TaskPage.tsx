import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import AppSidebar from './AppSidebar';

export type TaskPriority = 'Low' | 'Medium' | 'High';

export type TaskStatus = 'To Do' | 'Pending' | 'In Progress' | 'Completed';
export type TaskReviewStatus = 'ongoing' | 'closed' | 'reopen';
export type TaskCategory = 'Work' | 'Personal' | 'Academic' | 'Finance' | 'Social';
export type WorkSequence = 'Study' | 'Design' | 'Frotened' | 'Backend' | 'testing' | 'documentation';

export type TaskItem = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  taskStatus: TaskReviewStatus;
  priority: TaskPriority;
  category: TaskCategory;
  deadline: string;
  progress: number;
  assignee: string;
  evaluationBy: string;
};

export type NotificationItem = {
  id: number;
  title: string;
  detail: string;
  audience: string;
  category?: 'tasks' | 'team' | 'reminders';
  createdAt?: string;
  isRead?: boolean;
  priority?: 'High' | 'Medium' | 'Low';
};

export type TaskViewFilter =
  | 'all'
  | 'completed'
  | 'pending'
  | 'todo'
  | 'in-progress';

const statusOptions: TaskStatus[] = ['To Do', 'Pending', 'In Progress', 'Completed'];
const taskStatusOptions: TaskReviewStatus[] = ['ongoing', 'closed', 'reopen'];
const priorityOptions: TaskPriority[] = ['Low', 'Medium', 'High'];
const categoryOptions: TaskCategory[] = ['Work', 'Personal', 'Academic', 'Finance', 'Social'];
const workSequenceOptions: WorkSequence[] = ['Study', 'Design', 'Frotened', 'Backend', 'testing', 'documentation'];
const filterOptions: { value: TaskViewFilter; label: string }[] = [
  { value: 'all', label: 'All Tasks' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
];

function formatTaskDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getTasksForFilter(tasks: TaskItem[], activeFilter: TaskViewFilter) {
  if (activeFilter === 'completed') {
    return tasks.filter((task) => task.status === 'Completed');
  }

  if (activeFilter === 'pending') {
    return tasks.filter(
      (task) =>
        task.status === 'Pending' || task.status === 'To Do' || task.status === 'In Progress',
    );
  }

  if (activeFilter === 'todo') {
    return tasks.filter((task) => task.status === 'To Do');
  }

  if (activeFilter === 'in-progress') {
    return tasks.filter((task) => task.status === 'In Progress');
  }

  return tasks;
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function isPastDate(date: string) {
  return Boolean(date) && date < todayDateValue();
}

function TaskPage({
  tasks,
  notifications,
  activeFilter,
  onAddTask,
  onDeleteTask,
  onUpdateTask,
  onChangeFilter,
  onAssignMember,
  onNavigate,
  userName,
  onLogout,
}: {
  tasks: TaskItem[];
  notifications: NotificationItem[];
  activeFilter: TaskViewFilter;
  onAddTask: (task: Omit<TaskItem, 'id'>) => void;
  onDeleteTask: (taskId: number) => void;
  onUpdateTask: (taskId: number, updates: Omit<TaskItem, 'id'>) => void;
  onChangeFilter: (filter: TaskViewFilter) => void;
  onAssignMember: (payload: {
    memberName: string;
    memberEmail: string;
    phoneNumber: string;
    work: string;
    workSequence: WorkSequence;
    deadline: string;
    priority: TaskPriority;
  }) => void;
  onNavigate: (screen: 'dashboard' | 'task' | 'teams' | 'notifications' | 'reports') => void;
  userName: string;
  onLogout?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [showAssignFields, setShowAssignFields] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(tasks[0]?.id ?? null);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [assignmentError, setAssignmentError] = useState('');
  const [taskErrors, setTaskErrors] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: '',
    category: '',
  });
  const [editErrors, setEditErrors] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: '',
    category: '',
  });
  const [mediaError, setMediaError] = useState('');
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video' | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    taskStatus: 'ongoing' as TaskReviewStatus,
    category: 'Work' as TaskCategory,
    deadline: '2026-03-24',
    assignee: 'You',
    evaluationBy: '',
  });
  const [mediaItems, setMediaItems] = useState<
    { id: number; name: string; url: string; type: 'audio' | 'video'; source: 'upload' | 'recording' }[]
  >([]);
  const [assignForm, setAssignForm] = useState({
    memberName: '',
    memberEmail: '',
    phoneNumber: '',
    work: '',
    workSequence: 'Study' as WorkSequence,
    deadline: '2026-03-22',
    priority: 'High' as TaskPriority,
  });

  const handleAssignSubmit = () => {
    const trimmedEmail = assignForm.memberEmail.trim().toLowerCase();

    if (!/^[^\s@]+@gmail\.com$/.test(trimmedEmail)) {
      setAssignmentError('Enter a valid Mail Id');
      return;
    }

    onAssignMember(assignForm);
    setAssignmentError('');
    setShowAssignFields(false);
    setAssignForm({
      memberName: '',
      memberEmail: '',
      phoneNumber: '',
      work: '',
      workSequence: 'Study',
      deadline: '2026-03-22',
      priority: 'High',
    });
  };

  const filteredTasks = getTasksForFilter(tasks, activeFilter);
  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null;
  const [editForm, setEditForm] = useState<Omit<TaskItem, 'id'>>(
    selectedTask
      ? {
          title: selectedTask.title,
          description: selectedTask.description,
          status: selectedTask.status,
          taskStatus: selectedTask.taskStatus,
          priority: selectedTask.priority,
          category: selectedTask.category,
          deadline: selectedTask.deadline,
          progress: selectedTask.progress,
          assignee: selectedTask.assignee,
          evaluationBy: selectedTask.evaluationBy,
        }
      : {
          title: '',
          description: '',
          status: 'To Do',
          taskStatus: 'ongoing',
          priority: 'Medium',
          category: 'Work',
          deadline: '2026-03-24',
          progress: 0,
          assignee: 'You',
          evaluationBy: '',
        },
  );

  useEffect(() => {
    const nextFilteredTasks = getTasksForFilter(tasks, activeFilter);
    const nextSelectedTask =
      nextFilteredTasks.find((task) => task.id === selectedTaskId) ?? nextFilteredTasks[0] ?? null;

    setSelectedTaskId(nextSelectedTask?.id ?? null);

    if (nextSelectedTask) {
      setEditForm({
        title: nextSelectedTask.title,
        description: nextSelectedTask.description,
        status: nextSelectedTask.status,
        taskStatus: nextSelectedTask.taskStatus,
        priority: nextSelectedTask.priority,
        category: nextSelectedTask.category,
        deadline: nextSelectedTask.deadline,
        progress: nextSelectedTask.progress,
        assignee: nextSelectedTask.assignee,
        evaluationBy: nextSelectedTask.evaluationBy,
      });
    }
  }, [tasks, activeFilter, selectedTaskId]);

  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => URL.revokeObjectURL(item.url));
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [mediaItems]);

  const addMediaFiles = (files: FileList | File[]) => {
    const nextItems = Array.from(files)
      .filter((file) => file.type.startsWith('audio/') || file.type.startsWith('video/'))
      .map((file) => ({
        id: Date.now() + Math.random(),
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('audio/') ? ('audio' as const) : ('video' as const),
        source: 'upload' as const,
      }));

    if (!nextItems.length) {
      setMediaError('Drop or upload audio/video files only');
      return;
    }

    setMediaError('');
    setMediaItems((current) => [...nextItems, ...current]);
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addMediaFiles(event.target.files);
      event.target.value = '';
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    addMediaFiles(event.dataTransfer.files);
  };

  const startRecording = async (mode: 'audio' | 'video') => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !window.MediaRecorder) {
      setMediaError('Recording is not supported in this browser');
      return;
    }

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia(
        mode === 'audio' ? { audio: true } : { audio: true, video: true },
      );
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      setRecordingMode(mode);
      setMediaError('');

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: mode === 'audio' ? 'audio/webm' : 'video/webm',
        });
        const url = URL.createObjectURL(blob);
        setMediaItems((current) => [
          {
            id: Date.now(),
            name: mode === 'audio' ? 'Voice recording.webm' : 'Video recording.webm',
            url,
            type: mode,
            source: 'recording',
          },
          ...current,
        ]);
        stream.getTracks().forEach((track) => track.stop());
        setRecordingMode(null);
      };

      recorder.start();
    } catch {
      setMediaError('Microphone or camera permission was denied');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const removeMediaItem = (mediaId: number) => {
    setMediaItems((current) => {
      const item = current.find((entry) => entry.id === mediaId);
      if (item) {
        URL.revokeObjectURL(item.url);
      }
      return current.filter((entry) => entry.id !== mediaId);
    });
  };

  const validateTaskPayload = (
    payload: {
      title: string;
      description: string;
      deadline: string;
      priority: TaskPriority | '';
      category: TaskCategory | '';
    },
    mode: 'create' | 'edit',
    editingTaskId?: number,
  ) => {
    const nextErrors = {
      title: '',
      description: '',
      deadline: '',
      priority: '',
      category: '',
    };
    const trimmedTitle = payload.title.trim();
    const duplicateTask = tasks.some(
      (task) =>
        task.title.trim().toLowerCase() === trimmedTitle.toLowerCase() &&
        task.id !== editingTaskId,
    );

    if (!trimmedTitle) {
      nextErrors.title = 'Task title is required';
    } else if (trimmedTitle.length < 3) {
      nextErrors.title = 'Task title must be at least 3 characters';
    } else if (duplicateTask) {
      nextErrors.title = 'Task title already exists';
    }

    if (payload.description.length > 250) {
      nextErrors.description = 'Description must be 250 characters or less';
    }

    if (!payload.deadline) {
      nextErrors.deadline = 'Deadline is required';
    } else if (isPastDate(payload.deadline)) {
      nextErrors.deadline = 'Deadline cannot be in the past';
    }

    if (!payload.priority) {
      nextErrors.priority = 'Please select priority';
    }

    if (!payload.category) {
      nextErrors.category = 'Please select category';
    }

    if (mode === 'create') {
      setTaskErrors(nextErrors);
    } else {
      setEditErrors(nextErrors);
    }

    return !Object.values(nextErrors).some(Boolean);
  };

  const handleTaskSubmit = () => {
    if (
      !validateTaskPayload({
        title: taskForm.title,
        description: taskForm.description,
        deadline: taskForm.deadline,
        priority,
        category: taskForm.category,
      }, 'create')
    ) {
      return;
    }

    onAddTask({
      title: taskForm.title.trim(),
      description: taskForm.description,
      status: 'To Do',
      taskStatus: taskForm.taskStatus,
      priority,
      category: taskForm.category,
      deadline: taskForm.deadline,
      progress: 0,
      assignee: taskForm.assignee || 'You',
      evaluationBy: taskForm.evaluationBy,
    });

    setTaskForm({
      title: '',
      description: '',
      taskStatus: 'ongoing',
      category: 'Work',
      deadline: '2026-03-24',
      assignee: 'You',
      evaluationBy: '',
    });
    setTaskErrors({
      title: '',
      description: '',
      deadline: '',
      priority: '',
      category: '',
    });
    setPriority('Medium');
    setShowAssignFields(false);
    onNavigate('dashboard');
  };

  const handleSelectTask = (task: TaskItem) => {
    setSelectedTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      status: task.status,
      taskStatus: task.taskStatus,
      priority: task.priority,
      category: task.category,
      deadline: task.deadline,
      progress: task.progress,
      assignee: task.assignee,
      evaluationBy: task.evaluationBy,
    });
  };

  const handleUpdateTask = () => {
    if (!selectedTask) {
      return;
    }

    if (
      !validateTaskPayload({
        title: editForm.title,
        description: editForm.description,
        deadline: editForm.deadline,
        priority: editForm.priority,
        category: editForm.category,
      }, 'edit', selectedTask.id)
    ) {
      return;
    }

    onUpdateTask(selectedTask.id, {
      ...editForm,
      title: editForm.title.trim(),
      progress: selectedTaskProgress,
    });
  };

  const handleDeleteTask = () => {
    if (!selectedTask) {
      return;
    }

    onDeleteTask(selectedTask.id);
  };

  const selectedTaskProgress =
    editForm.status === 'Completed'
      ? 100
      : editForm.status === 'In Progress'
        ? Math.max(editForm.progress, 60)
        : editForm.status === 'Pending'
          ? Math.max(editForm.progress, 25)
          : Math.min(editForm.progress, 25);

  const visibleSelectedTask = selectedTask;

  return (
    <main className="dashboard-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="spark spark-top" />
      <div className="spark spark-bottom" />

      <AppSidebar
        activeScreen="task"
        onNavigate={onNavigate}
        onOpenTasks={() => onChangeFilter('all')}
        onLogout={onLogout}
        userName={userName}
      />

      <section className="dashboard-main task-main">
        <div className="task-topbar">
          <div>
            <p className="section-kicker">Manage Tasks</p>
            <h1>Task Workspace</h1>
          </div>
          <button type="button" className="settings-button" aria-label="Settings">
            <span />
          </button>
        </div>

        <article className="dashboard-card task-filter-bar">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={activeFilter === option.value ? 'filter-chip active' : 'filter-chip'}
              onClick={() => onChangeFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </article>

        <div className="task-layout">
          <article className="dashboard-card task-builder-card">
            <div className="panel-head">
              <h3>Add New Task</h3>
              <p>Creates tasks that appear in the dashboard instantly</p>
            </div>
            <div className="task-form-grid">
              <div className="field-group field-span-2">
                <label htmlFor="taskTitle">Task Title</label>
                <input
                  id="taskTitle"
                  type="text"
                  value={taskForm.title}
                  onChange={(event) => {
                    setTaskErrors((current) => ({ ...current, title: '' }));
                    setTaskForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }));
                  }}
                  placeholder="Enter a clear task title (e.g., Finalize Project 1)"
                />
                {taskErrors.title && <p className="form-error">{taskErrors.title}</p>}
              </div>

              <div className="field-group field-span-2">
                <label htmlFor="taskDescription">Description (Optional)</label>
                <textarea
                  id="taskDescription"
                  rows={4}
                  value={taskForm.description}
                  maxLength={250}
                  onChange={(event) => {
                    setTaskErrors((current) => ({ ...current, description: '' }));
                    setTaskForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }));
                  }}
                  placeholder="Detailed task description..."
                />
                {taskErrors.description && <p className="form-error">{taskErrors.description}</p>}
                <span className="helper-copy">{taskForm.description.length}/250 characters</span>
              </div>

              <div className="field-group">
                <label htmlFor="taskPriority">Priority</label>
                <select
                  id="taskPriority"
                  value={priority}
                  onChange={(event) => {
                    setTaskErrors((current) => ({ ...current, priority: '' }));
                    setPriority(event.target.value as TaskPriority);
                  }}
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {taskErrors.priority && <p className="form-error">{taskErrors.priority}</p>}
              </div>

              <div className="field-group">
                <label htmlFor="taskCategory">Task Category</label>
                <select
                  id="taskCategory"
                  value={taskForm.category}
                  onChange={(event) => {
                    setTaskErrors((current) => ({ ...current, category: '' }));
                    setTaskForm((current) => ({
                      ...current,
                      category: event.target.value as TaskCategory,
                    }));
                  }}
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {taskErrors.category && <p className="form-error">{taskErrors.category}</p>}
              </div>

              <div className="field-group">
                <label htmlFor="taskReviewStatus">Task Status</label>
                <select
                  id="taskReviewStatus"
                  value={taskForm.taskStatus}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      taskStatus: event.target.value as TaskReviewStatus,
                    }))
                  }
                >
                  {taskStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="taskDeadline">Deadline</label>
                <input
                  id="taskDeadline"
                  type="date"
                  value={taskForm.deadline}
                  onChange={(event) => {
                    setTaskErrors((current) => ({ ...current, deadline: '' }));
                    setTaskForm((current) => ({
                      ...current,
                      deadline: event.target.value,
                    }));
                  }}
                />
                {taskForm.deadline === todayDateValue() && (
                  <span className="urgent-pill">Urgent: Due today</span>
                )}
                {taskErrors.deadline && <p className="form-error">{taskErrors.deadline}</p>}
              </div>

              <div className="field-group field-span-2">
                <label htmlFor="taskAssignee">Assignee</label>
                <input
                  id="taskAssignee"
                  type="text"
                  value={taskForm.assignee}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      assignee: event.target.value,
                    }))
                  }
                  placeholder="Who is responsible for this task?"
                />
              </div>

              <div className="field-group field-span-2">
                <label htmlFor="taskEvaluationBy">Evaluation By</label>
                <input
                  id="taskEvaluationBy"
                  type="text"
                  value={taskForm.evaluationBy}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      evaluationBy: event.target.value,
                    }))
                  }
                  placeholder="Who will evaluate this task?"
                />
              </div>
            </div>

            <div className="task-actions-row">
              <button
                type="button"
                className="secondary-pill"
                onClick={() => setShowAssignFields((value) => !value)}
              >
                Assign member...
              </button>
              <button
                type="button"
                className="primary-button task-submit"
                onClick={handleTaskSubmit}
              >
                Add Task
              </button>
            </div>

            {showAssignFields && (
              <div className="assign-panel">
                <div className="assign-panel-head">
                  <h3>Assign Member</h3>
                  <p>
                    This creates a notification for the assigned member and a
                    reminder for the task creator before the deadline.
                  </p>
                </div>

                <div className="assign-grid">
                  <div className="field-group">
                    <label htmlFor="memberName">Member name</label>
                    <input
                      id="memberName"
                      type="text"
                      value={assignForm.memberName}
                      onChange={(event) =>
                        setAssignForm((current) => ({
                          ...current,
                          memberName: event.target.value,
                        }))
                      }
                      placeholder="Assign to team member"
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="memberEmail" className="required-label">
                      Mail Id
                    </label>
                    <input
                      id="memberEmail"
                      type="email"
                      value={assignForm.memberEmail}
                      onChange={(event) => {
                        setAssignmentError('');
                        setAssignForm((current) => ({
                          ...current,
                          memberEmail: event.target.value,
                        }));
                      }}
                      placeholder="member@gmail.com"
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="memberPhone">Phone number</label>
                    <input
                      id="memberPhone"
                      type="tel"
                      value={assignForm.phoneNumber}
                      onChange={(event) =>
                        setAssignForm((current) => ({
                          ...current,
                          phoneNumber: event.target.value,
                        }))
                      }
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div className="field-group field-span-2">
                    <label htmlFor="memberWork">Work</label>
                    <input
                      id="memberWork"
                      type="text"
                      value={assignForm.work}
                      onChange={(event) =>
                        setAssignForm((current) => ({
                          ...current,
                          work: event.target.value,
                        }))
                      }
                      placeholder="What should this member do?"
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="memberWorkSequence">Work Sequence</label>
                    <select
                      id="memberWorkSequence"
                      value={assignForm.workSequence}
                      onChange={(event) =>
                        setAssignForm((current) => ({
                          ...current,
                          workSequence: event.target.value as WorkSequence,
                        }))
                      }
                    >
                      {workSequenceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label htmlFor="memberDeadline">Deadline</label>
                    <input
                      id="memberDeadline"
                      type="date"
                      value={assignForm.deadline}
                      onChange={(event) =>
                        setAssignForm((current) => ({
                          ...current,
                          deadline: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="memberPriority">Priority</label>
                    <select
                      id="memberPriority"
                      value={assignForm.priority}
                      onChange={(event) =>
                        setAssignForm((current) => ({
                          ...current,
                          priority: event.target.value as TaskPriority,
                        }))
                      }
                    >
                      {priorityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {assignmentError && <p className="form-error">{assignmentError}</p>}

                <div className="assign-actions">
                  <button
                    type="button"
                    className="ghost-action"
                    onClick={() => setShowAssignFields(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary-button assign-submit"
                    onClick={handleAssignSubmit}
                  >
                    Send Assignment
                  </button>
                </div>
              </div>
            )}
          </article>

          <aside className="dashboard-card task-side-card">
            <div className="panel-head">
              <h3>
                {filterOptions.find((option) => option.value === activeFilter)?.label ?? 'Tasks'}
              </h3>
              <p>{filteredTasks.length} task(s)</p>
            </div>
            <div className="task-record-list">
              {filteredTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={selectedTaskId === task.id ? 'task-record active' : 'task-record'}
                  onClick={() => handleSelectTask(task)}
                >
                  <div className="task-record-head">
                    <strong>{task.title}</strong>
                    <span className={`priority-pill ${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p>{task.description || 'No description added yet.'}</p>
                  <div className="task-record-meta">
                    <span>{task.status}</span>
                    <span>{task.taskStatus}</span>
                    <span>{task.category}</span>
                    <span>{formatTaskDate(task.deadline)}</span>
                    <span>{task.progress}%</span>
                    {task.evaluationBy && <span>Evaluation: {task.evaluationBy}</span>}
                  </div>
                </button>
              ))}
              {filteredTasks.length === 0 && (
                <p className="empty-state">No tasks available for this filter yet.</p>
              )}
            </div>

            <div className="panel-head">
              <h3>Voice / Video</h3>
              <p>Drop files or record directly</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              multiple
              hidden
              onChange={handleFileSelect}
            />
            <div
              className="media-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="media-icons">
                <span>V</span>
                <span>A</span>
              </div>
              <strong>Drop voice or video recording</strong>
              <p>Drag media here or click to upload recorded audio/video files.</p>
            </div>
            <div className="recording-actions">
              {recordingMode ? (
                <button type="button" className="primary-button task-submit" onClick={stopRecording}>
                  Stop {recordingMode === 'audio' ? 'Audio' : 'Video'} Recording
                </button>
              ) : (
                <>
                  <button type="button" className="secondary-pill" onClick={() => void startRecording('audio')}>
                    Record Voice
                  </button>
                  <button type="button" className="secondary-pill" onClick={() => void startRecording('video')}>
                    Record Video
                  </button>
                </>
              )}
            </div>
            {mediaError && <p className="form-error">{mediaError}</p>}
            {mediaItems.length > 0 && (
              <div className="media-preview-list">
                {mediaItems.map((item) => (
                  <article key={item.id} className="media-preview-card">
                    <div className="media-preview-head">
                      <strong>{item.name}</strong>
                      <button type="button" className="ghost-action" onClick={() => removeMediaItem(item.id)}>
                        Remove
                      </button>
                    </div>
                    {item.type === 'audio' ? (
                      <audio controls src={item.url} className="media-player" />
                    ) : (
                      <video controls src={item.url} className="media-player" />
                    )}
                  </article>
                ))}
              </div>
            )}

            <div className="panel-head">
              <h3>Update Task</h3>
              <p>Edit the selected task</p>
            </div>
            {visibleSelectedTask ? (
              <div className="task-edit-form">
                <div className="field-group">
                  <label htmlFor="editTitle">Task title</label>
                  <input
                    id="editTitle"
                    type="text"
                    value={editForm.title}
                    onChange={(event) => {
                      setEditErrors((current) => ({ ...current, title: '' }));
                      setEditForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }));
                    }}
                  />
                  {editErrors.title && <p className="form-error">{editErrors.title}</p>}
                </div>

                <div className="field-group">
                  <label htmlFor="editDescription">Description</label>
                  <textarea
                    id="editDescription"
                    rows={3}
                    value={editForm.description}
                    maxLength={250}
                    onChange={(event) => {
                      setEditErrors((current) => ({ ...current, description: '' }));
                      setEditForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }));
                    }}
                  />
                  {editErrors.description && <p className="form-error">{editErrors.description}</p>}
                  <span className="helper-copy">{editForm.description.length}/250 characters</span>
                </div>

                <div className="assign-grid">
                  <div className="field-group">
                    <label htmlFor="editStatus">Status</label>
                    <select
                      id="editStatus"
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          status: event.target.value as TaskStatus,
                        }))
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label htmlFor="editPriority">Priority</label>
                    <select
                      id="editPriority"
                      value={editForm.priority}
                      onChange={(event) => {
                        setEditErrors((current) => ({ ...current, priority: '' }));
                        setEditForm((current) => ({
                          ...current,
                          priority: event.target.value as TaskPriority,
                        }));
                      }}
                    >
                      {priorityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {editErrors.priority && <p className="form-error">{editErrors.priority}</p>}
                  </div>

                  <div className="field-group">
                    <label htmlFor="editCategory">Category</label>
                    <select
                      id="editCategory"
                      value={editForm.category}
                      onChange={(event) => {
                        setEditErrors((current) => ({ ...current, category: '' }));
                        setEditForm((current) => ({
                          ...current,
                          category: event.target.value as TaskCategory,
                        }));
                      }}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {editErrors.category && <p className="form-error">{editErrors.category}</p>}
                  </div>

                  <div className="field-group">
                    <label htmlFor="editTaskReviewStatus">Task Status</label>
                    <select
                      id="editTaskReviewStatus"
                      value={editForm.taskStatus}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          taskStatus: event.target.value as TaskReviewStatus,
                        }))
                      }
                    >
                      {taskStatusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label htmlFor="editDeadline">Deadline</label>
                    <input
                      id="editDeadline"
                      type="date"
                      value={editForm.deadline}
                      onChange={(event) => {
                        setEditErrors((current) => ({ ...current, deadline: '' }));
                        setEditForm((current) => ({
                          ...current,
                          deadline: event.target.value,
                        }));
                      }}
                    />
                    {editForm.deadline === todayDateValue() && (
                      <span className="urgent-pill">Urgent: Due today</span>
                    )}
                    {editErrors.deadline && <p className="form-error">{editErrors.deadline}</p>}
                  </div>

                  <div className="field-group">
                    <label htmlFor="editAssignee">Assignee</label>
                    <input
                      id="editAssignee"
                      type="text"
                      value={editForm.assignee}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          assignee: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="editEvaluationBy">Evaluation By</label>
                    <input
                      id="editEvaluationBy"
                      type="text"
                      value={editForm.evaluationBy}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          evaluationBy: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="task-footer-actions">
                  <button
                    type="button"
                    className="ghost-action"
                    onClick={() => handleSelectTask(selectedTask)}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="primary-button task-submit"
                    onClick={handleUpdateTask}
                  >
                    Update Task
                  </button>
                </div>
              </div>
            ) : (
              <p className="empty-state">Select a task from the list to update its information.</p>
            )}

            <div className="notifications-panel">
              <div className="panel-head">
                <h3>Notifications</h3>
                <p>{notifications.length} active</p>
              </div>
              <div className="notification-list">
                {notifications.map((notification) => (
                  <article key={notification.id} className="notification-card">
                    <strong>{notification.title}</strong>
                    <p>{notification.detail}</p>
                    <span>For: {notification.audience}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="task-footer-actions">
              <button
                type="button"
                className="ghost-action"
                onClick={() => onNavigate('dashboard')}
              >
                Cancel
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default TaskPage;

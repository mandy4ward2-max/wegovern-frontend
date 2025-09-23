import React, { useState, useEffect } from 'react';
import { getTasks, getTaskComments, addTaskComment, editComment, deleteComment } from '../api';
import { useWebSocket } from '../WebSocketContext';
import CommentsSection from '../components/CommentsSection';

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const { socket } = useWebSocket();
  
  // Modal state for task completion
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionTask, setCompletionTask] = useState(null);
  const [completionComment, setCompletionComment] = useState('');
  const [originalStatus, setOriginalStatus] = useState('');

  // Modal state for task details
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  // Fetch all tasks from backend
  useEffect(() => {
    async function fetchTasks() {
      try {
        const allTasks = await getTasks('all'); // Fetch all tasks
        setTasks(Array.isArray(allTasks) ? allTasks : []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setTasks([]);
      }
    }
    fetchTasks();
  }, []);

  // Listen for real-time task updates via WebSocket
  useEffect(() => {
    console.log('TasksKanban useEffect - socket:', socket);
    
    if (!socket) {
      console.log('No socket connection available');
      return;
    }

    console.log('Setting up taskUpdate listener');
    
    const handleTaskUpdate = (data) => {
      console.log('🔥 Received taskUpdate event:', data);
      // Refresh tasks whenever a task update occurs
      const fetchTasksAfterUpdate = async () => {
        try {
          console.log('Fetching fresh tasks after update...');
          const allTasks = await getTasks('all');
          console.log('Fresh tasks received:', allTasks);
          setTasks(Array.isArray(allTasks) ? allTasks : []);
        } catch (error) {
          console.error('Error fetching tasks after update:', error);
        }
      };
      fetchTasksAfterUpdate();
    };

    socket.on('taskUpdate', handleTaskUpdate);

    return () => {
      console.log('Cleaning up taskUpdate listener');
      socket.off('taskUpdate', handleTaskUpdate);
    };
  }, [socket]);

  // Filter tasks by status (excluding UNAPPROVED)
  const notStartedTasks = tasks.filter(task => task.status === 'NOT_STARTED');
  const inProgressTasks = tasks.filter(task => task.status === 'IN_PROGRESS');
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');

  // Get color based on due date
  const getDueDateColor = (dueDate) => {
    if (!dueDate) return '#e9ecef'; // Gray for no due date
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '#dc3545'; // Red - overdue
    if (diffDays <= 7) return '#ffc107'; // Yellow - due within a week
    return '#28a745'; // Green - due in over a week
  };

  // Format due date for display
  const formatDueDate = (dueDate) => {
    if (!dueDate) return 'No due date';
    return new Date(dueDate).toLocaleDateString();
  };

  // Check if current user can drag this task
  const canDragTask = (task) => {
    // Completed tasks are locked and cannot be dragged
    if (task.status === 'COMPLETED') {
      return false;
    }
    return currentUser && task.userId === currentUser.id;
  };

  // Handle drag start
  const handleDragStart = (e, task) => {
    if (!canDragTask(task)) {
      e.preventDefault();
      return;
    }
    
    console.log('Drag started for task:', task.id);
    
    // Set drag data first
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
    
    // Set dragged task with a small delay to ensure event is processed
    setTimeout(() => {
      setDraggedTask(task);
    }, 0);
    
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    console.log('Drag ended');
    e.currentTarget.style.opacity = '1';
    // Don't reset draggedTask here, let handleDrop do it
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drag enter
  const handleDragEnter = (e) => {
    e.preventDefault();
  };

  // Handle drop
  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // If dropping into COMPLETED column, show completion modal
    if (newStatus === 'COMPLETED') {
      setCompletionTask(draggedTask);
      setOriginalStatus(draggedTask.status);
      setCompletionComment('');
      setShowCompletionModal(true);
      setDraggedTask(null);
      return;
    }

    // For non-COMPLETED statuses, proceed normally
    try {
      console.log(`Updating task ${draggedTask.id} status from ${draggedTask.status} to ${newStatus}`);
      
      // Update task status via API
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api'}/tasks/${draggedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          status: newStatus,
        })
      });

      if (response.ok) {
        const updatedTask = await response.json();
        console.log('Task updated successfully:', updatedTask);
        
        // Update local state with the response from server
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === draggedTask.id 
              ? { ...task, ...updatedTask }
              : task
          )
        );
      } else {
        const errorData = await response.json();
        console.error('Failed to update task status:', errorData);
        alert('Failed to update task status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task. Please check your connection and try again.');
    }

    setDraggedTask(null);
  };

  // Handle task completion confirmation
  const handleCompleteTask = async () => {
    if (!completionTask) return;

    try {
      console.log(`Completing task ${completionTask.id} with comment: "${completionComment}"`);
      
      // Update task status to COMPLETED with completion comment
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api'}/tasks/${completionTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          status: 'COMPLETED',
          completeComment: completionComment,
          dateCompleted: new Date().toISOString()
        })
      });

      if (response.ok) {
        const updatedTask = await response.json();
        console.log('Task completed successfully:', updatedTask);
        
        // Update local state with the response from server
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === completionTask.id 
              ? { ...task, ...updatedTask }
              : task
          )
        );
        
        // Close modal
        setShowCompletionModal(false);
        setCompletionTask(null);
        setCompletionComment('');
        setOriginalStatus('');
      } else {
        const errorData = await response.json();
        console.error('Failed to complete task:', errorData);
        alert('Failed to complete task. Please try again.');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('An error occurred while completing the task. Please try again.');
    }
  };

  // Handle task completion cancellation
  const handleCancelCompletion = () => {
    // Close modal without saving
    setShowCompletionModal(false);
    setCompletionTask(null);
    setCompletionComment('');
    setOriginalStatus('');
    
    // Task stays in its original status - no API call needed
    console.log('Task completion cancelled');
  };

  // Handle opening task detail modal
  const handleOpenTaskModal = async (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
    
    // Fetch comments for this task
    try {
      const comments = await getTaskComments(task.id);
      setTaskComments(Array.isArray(comments) ? comments : []);
    } catch (error) {
      console.error('Error fetching task comments:', error);
      setTaskComments([]);
    }
  };

  // Handle closing task detail modal
  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
    setTaskComments([]);
  };

  // Comment handling functions for task modal
  const buildUsername = (comment) => {
    const userStr = localStorage.getItem('user');
    let localUser = null;
    try { localUser = userStr ? JSON.parse(userStr) : null; } catch {}
    return (
      comment?.username ||
      comment?.user?.name ||
      [comment?.user?.firstName, comment?.user?.lastName].filter(Boolean).join(' ').trim() ||
      [localUser?.firstName, localUser?.lastName].filter(Boolean).join(' ').trim() ||
      (currentUser?.id && comment?.userId === currentUser.id ? 'You' : '') ||
      'Unknown User'
    );
  };

  const normalizeComment = (c) => ({
    ...c,
    username: buildUsername(c),
    editable: currentUser?.id === c?.userId
  });

  const handleAddTaskComment = async (text) => {
    if (!selectedTask) return;
    
    try {
      const comment = await addTaskComment(selectedTask.id, text);
      if (comment.error) {
        alert('Failed to add comment: ' + comment.message);
      } else {
        const normalized = normalizeComment(comment);
        // Add to local state (avoid duplicate by id, coerce types)
        setTaskComments(prev => {
          if (prev.some(c => String(c.id) === String(normalized.id))) return prev;
          return [...prev, normalized];
        });
      }
    } catch (error) {
      console.error('Error adding task comment:', error);
      alert('Failed to add comment');
    }
  };

  const handleEditTaskComment = async (commentId, text) => {
    try {
      const updatedComment = await editComment(commentId, text);
      if (!updatedComment.error) {
        setTaskComments(prev => prev.map(comment => 
          comment.id === commentId ? updatedComment : comment
        ));
      } else {
        alert('Failed to edit comment: ' + updatedComment.message);
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      alert('Failed to edit comment');
    }
  };

  const handleDeleteTaskComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setTaskComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  const handleReplyToTaskComment = async (parentId, text) => {
    if (!selectedTask) return;
    
    try {
      const comment = await addTaskComment(selectedTask.id, text, parentId);
      if (comment.error) {
        alert('Failed to add reply: ' + comment.message);
      } else {
        const normalized = normalizeComment(comment);
        setTaskComments(prev => {
          if (prev.some(c => String(c.id) === String(normalized.id))) return prev;
          return [...prev, normalized];
        });
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      alert('Failed to add reply');
    }
  };

  // WebSocket: live updates for comments within the open task modal
  useEffect(() => {
    if (!socket || !showTaskModal || !selectedTask) return;

    const handleCommentEvent = (event) => {
      // Only process events for the currently opened task
      if (!event || event.taskId !== selectedTask.id) return;

      if (event.type === 'comment' && event.comment) {
        const c = normalizeComment(event.comment);
        setTaskComments(prev => {
          // avoid duplicates
          const exists = prev.some(item => String(item.id) === String(c.id));
          return exists ? prev : [...prev, c];
        });
      } else if (event.type === 'commentUpdated' && event.comment) {
        const c = normalizeComment(event.comment);
        setTaskComments(prev => prev.map(item => String(item.id) === String(c.id) ? { ...item, ...c } : item));
      } else if (event.type === 'commentDeleted' && event.commentId) {
        setTaskComments(prev => prev.filter(item => String(item.id) !== String(event.commentId)));
      }
    };

    socket.on('comment', handleCommentEvent);
    return () => socket.off('comment', handleCommentEvent);
  }, [socket, showTaskModal, selectedTask, currentUser?.id]);

  // Task Card Component
  const TaskCard = ({ task }) => {
    const isDraggable = canDragTask(task);
    const cardColor = getDueDateColor(task.due);
    const isCompleted = task.status === 'COMPLETED';
    
    return (
      <div
        draggable={isDraggable}
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        onDoubleClick={() => handleOpenTaskModal(task)}
        style={{
          backgroundColor: isCompleted ? '#f8f9fa' : '#fff',
          borderLeft: `8px solid ${isCompleted ? '#28a745' : cardColor}`,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: isCompleted ? '0 2px 4px rgba(0,0,0,0.05)' : '0 4px 8px rgba(0,0,0,0.1)',
          cursor: isDraggable ? 'grab' : 'pointer',
          opacity: isCompleted ? 0.85 : (isDraggable ? 1 : 0.7),
          position: 'relative',
          fontSize: '16px',
          userSelect: 'none',
          border: isCompleted ? '1px solid #e9ecef' : 'none'
        }}
      >
        {/* Icons removed per request (checkmark and lock) */}
        
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: '12px', 
          color: isCompleted ? '#6c757d' : '#333', 
          fontSize: '18px',
          textDecoration: 'none'
        }}>
          {task.action}
        </div>
        
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          Assigned to: {task.username || 'Unknown'}
        </div>
        
        {isCompleted ? (
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            Completed: {task.dateCompleted ? formatDueDate(task.dateCompleted) : '—'}
          </div>
        ) : (
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            Due: {formatDueDate(task.due)}
          </div>
        )}
        
        {task.motionTitle && (
          <div style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
            Motion: {task.motionTitle}
          </div>
        )}
        
        {task.completeComment && task.status === 'COMPLETED' && (
          <div style={{ fontSize: '14px', color: '#28a745', marginTop: '12px', fontStyle: 'italic' }}>
            "{task.completeComment}"
          </div>
        )}
        
        {/* Indicator removed per request */}
      </div>
    );
  };

  // Column Component
  const KanbanColumn = ({ title, tasks, status, color }) => (
    <div style={{ flex: 1, margin: '0 16px' }}>
      <div style={{
        backgroundColor: color,
        color: '#fff',
        padding: '24px',
        borderRadius: '8px 8px 0 0',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: '20px'
      }}>
        {title} ({tasks.length})
      </div>
      
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDrop={(e) => handleDrop(e, status)}
        style={{
          backgroundColor: '#f8f9fa',
          minHeight: '800px',
          padding: '32px',
          borderRadius: '0 0 8px 8px',
          border: '2px dashed #dee2e6'
        }}
      >
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6c757d', marginTop: '40px', fontSize: '18px' }}>
            No tasks
          </div>
        ) : (
          tasks.map(task => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 2400, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 64 }}>
      <h2 style={{ textAlign: 'center', marginBottom: '48px', fontSize: '32px' }}>Task Board</h2>
      
      <div style={{ display: 'flex', gap: '32px' }}>
        <KanbanColumn 
          title="Not Started" 
          tasks={notStartedTasks} 
          status="NOT_STARTED"
          color="#007bff"
        />
        <KanbanColumn 
          title="In Progress" 
          tasks={inProgressTasks} 
          status="IN_PROGRESS"
          color="#fd7e14"
        />
        <KanbanColumn 
          title="Completed" 
          tasks={completedTasks} 
          status="COMPLETED"
          color="#28a745"
        />
      </div>

      {/* Task Completion Modal */}
      {showCompletionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>
              Complete Task: {completionTask?.action}
            </h3>
            
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Are you sure you want to mark this task as completed? Once completed, the task will be locked.
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                Completion Comment (optional):
              </label>
              <textarea
                value={completionComment}
                onChange={(e) => setCompletionComment(e.target.value)}
                placeholder="Add any notes about task completion..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelCompletion}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                No, Cancel
              </button>
              <button
                onClick={handleCompleteTask}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Yes, Complete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showTaskModal && selectedTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            position: 'relative'
          }}>
            {/* Close button */}
            <button 
              onClick={handleCloseTaskModal}
              style={{ 
                position: 'absolute', 
                top: '16px', 
                right: '16px', 
                background: 'none', 
                border: 'none', 
                fontSize: '24px', 
                color: '#888', 
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1
              }}
            >
              ×
            </button>

            {/* Task Details */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '28px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                {selectedTask.action}
              </h2>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div>
                  <strong style={{ color: '#666', fontSize: '14px' }}>Status:</strong>
                  <div style={{ 
                    display: 'inline-block',
                    marginLeft: '8px',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: selectedTask.status === 'COMPLETED' ? '#28a745' : 
                                   selectedTask.status === 'IN_PROGRESS' ? '#fd7e14' : '#007bff',
                    color: 'white'
                  }}>
                    {selectedTask.status.replace('_', ' ')}
                  </div>
                </div>

                <div>
                  <strong style={{ color: '#666', fontSize: '14px' }}>Assigned to:</strong>
                  <div style={{ marginLeft: '8px', display: 'inline' }}>
                    {selectedTask.username || 'Unknown'}
                  </div>
                </div>

                <div>
                  <strong style={{ color: '#666', fontSize: '14px' }}>Due Date:</strong>
                  <div style={{ 
                    marginLeft: '8px', 
                    display: 'inline',
                    color: getDueDateColor(selectedTask.due),
                    fontWeight: selectedTask.due && new Date(selectedTask.due) < new Date() ? 'bold' : 'normal'
                  }}>
                    {formatDueDate(selectedTask.due)}
                  </div>
                </div>

                {selectedTask.motionTitle && (
                  <div>
                    <strong style={{ color: '#666', fontSize: '14px' }}>Related Motion:</strong>
                    <div style={{ marginLeft: '8px', display: 'inline', fontStyle: 'italic' }}>
                      {selectedTask.motionTitle}
                    </div>
                  </div>
                )}
              </div>

              {selectedTask.completeComment && selectedTask.status === 'COMPLETED' && (
                <div style={{ 
                  backgroundColor: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '16px'
                }}>
                  <strong style={{ color: '#155724' }}>Completion Note:</strong>
                  <div style={{ color: '#155724', marginTop: '8px', fontStyle: 'italic' }}>
                    "{selectedTask.completeComment}"
                  </div>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '24px' }}>
              <CommentsSection
                comments={taskComments}
                motionId={null}
                userId={currentUser?.id}
                onAddComment={handleAddTaskComment}
                onEditComment={handleEditTaskComment}
                onDeleteComment={handleDeleteTaskComment}
                onReplyToComment={handleReplyToTaskComment}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksPage;
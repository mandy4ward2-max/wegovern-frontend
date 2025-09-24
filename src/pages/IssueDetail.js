import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssueById, updateIssue, getUsers, getIssueComments, addIssueComment, editComment, deleteComment, getMotions, getTasks, closeIssue } from '../api';
import { useWebSocket } from '../WebSocketContext';
import CommentsSection from '../components/CommentsSection';

function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMotionsModal, setShowMotionsModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [relatedMotions, setRelatedMotions] = useState([]);
  const [relatedTasks, setRelatedTasks] = useState([]);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeResolution, setCloseResolution] = useState('');
  const [closing, setClosing] = useState(false);
  const { socket } = useWebSocket();

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    assignedToId: ''
  });

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  // Fetch issue details and comments
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [issueData, usersData] = await Promise.all([
          getIssueById(id),
          getUsers('all')
        ]);

        if (issueData && !issueData.error) {
          console.log('IssueDetail fetched issue:', issueData);
          setIssue(issueData);
          setEditForm({
            title: issueData.title,
            description: issueData.description || '',
            status: issueData.status,
            priority: issueData.priority,
            assignedToId: issueData.assignedToId || ''
          });
          
          // Fetch comments for this issue
          setCommentsLoading(true);
          const commentsData = await getIssueComments(id);
          setComments(Array.isArray(commentsData) ? commentsData : []);
          setCommentsLoading(false);
        } else {
          console.error('Error fetching issue:', issueData);
        }

        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Listen for real-time issue and comment updates
  useEffect(() => {
    if (!socket || !issue) return;

    const handleIssueUpdate = (data) => {
      if (data.type === 'ISSUE_UPDATED' && data.issue.id === issue.id) {
        setIssue(data.issue);
      }
    };

    const handleCommentUpdate = (data) => {
      if (data.issueId && data.issueId === issue.id) {
        if (data.type === 'comment') {
          setComments(prev => {
            // Check if comment already exists to avoid duplicates
            const exists = prev.some(comment => comment.id === data.comment.id);
            if (!exists) {
              return [...prev, data.comment];
            }
            return prev;
          });
        } else if (data.type === 'commentUpdated') {
          setComments(prev => prev.map(comment => 
            comment.id === data.comment.id ? data.comment : comment
          ));
        } else if (data.type === 'commentDeleted') {
          setComments(prev => prev.filter(comment => comment.id !== data.commentId));
        }
      }
    };

    socket.on('issueUpdate', handleIssueUpdate);
    socket.on('comment', handleCommentUpdate);

    return () => {
      socket.off('issueUpdate', handleIssueUpdate);
      socket.off('comment', handleCommentUpdate);
    };
  }, [socket, issue]);

  // If the issue becomes CLOSED, ensure we exit edit mode
  useEffect(() => {
    if (issue?.status === 'CLOSED' && editing) {
      setEditing(false);
    }
  }, [issue?.status]);

  // Handle save changes
  const handleSave = async () => {
    try {
      const updatedIssue = await updateIssue(id, editForm);
      
      if (!updatedIssue.error) {
        setIssue(updatedIssue);
        setEditing(false);
      } else {
        alert('Failed to update issue: ' + updatedIssue.message);
      }
    } catch (error) {
      console.error('Error updating issue:', error);
      alert('Failed to update issue');
    }
  };

  // Comment handling functions for CommentsSection component
  // Handle motions modal
  const handleOpenMotionsModal = async () => {
    // Use the motions already loaded with the issue
    setRelatedMotions(issue.Motion || []);
    setShowMotionsModal(true);
  };

  // Handle tasks modal
  const handleOpenTasksModal = async () => {
    // Use the combined tasks provided by backend (direct + via motion), fallback to direct Task
    const combined = Array.isArray(issue.allTasks) ? issue.allTasks : (issue.Task || []);
    setRelatedTasks(combined);
    setShowTasksModal(true);
  };

  // Handle motions and tasks navigation
  const handleMotionClick = (motionId, motionStatus) => {
    const status = (motionStatus || '').toLowerCase();
    const url = (status === 'passed' || status === 'defeated')
      ? `/completed-motion/${motionId}`
      : `/motion/${motionId}`;
    // Open in a new tab
    window.open(url, '_blank', 'noopener');
    setShowMotionsModal(false);
  };

  const handleAddComment = async (text) => {
    try {
      const comment = await addIssueComment(id, text);
      if (comment.error) {
        alert('Failed to add comment: ' + comment.message);
      }
      // Don't add to state here - let WebSocket handle it to avoid duplicates
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  };

  const handleEditComment = async (commentId, text) => {
    try {
      const updatedComment = await editComment(commentId, text);
      if (!updatedComment.error) {
        setComments(prev => prev.map(comment => 
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

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  const handleReplyToComment = async (parentId, text) => {
    try {
      const comment = await addIssueComment(id, text, parentId);
      if (comment.error) {
        alert('Failed to add reply: ' + comment.message);
      }
      // Don't add to state here - let WebSocket handle it to avoid duplicates
    } catch (error) {
      console.error('Error adding reply:', error);
      alert('Failed to add reply');
    }
  };

  // Priority badge colors
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return '#dc3545';
      case 'MEDIUM': return '#fd7e14';
      case 'LOW': return '#28a745';
      default: return '#6c757d';
    }
  };

  // Status badge colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#007bff';
      case 'IN_PROGRESS': return '#fd7e14';
      case 'RESOLVED': return '#28a745';
      case 'CLOSED': return '#6c757d';
      default: return '#6c757d';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading Issue...</h2>
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Issue not found</h2>
        <button onClick={() => navigate('/issues')}>← Back to Issues</button>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: 1000, 
      margin: '40px auto', 
      background: '#fff', 
      borderRadius: 8, 
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
      padding: '40px' 
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
        borderBottom: '2px solid #f8f9fa',
        paddingBottom: '20px'
      }}>
        <button
          onClick={() => navigate('/issues')}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          ← Back to Issues
        </button>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {issue.status !== 'CLOSED' && (!editing ? (
            <button
              onClick={() => setEditing(true)}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Edit Issue
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Save Changes
              </button>
            </>
          ))}
          {!editing && issue.status !== 'CLOSED' && (
            <button
              onClick={() => {
                setCloseResolution('');
                setShowCloseModal(true);
              }}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Close Issue
            </button>
          )}
        </div>
      </div>

      {/* Issue Content (editing disabled if CLOSED) */}
      {!editing || issue.status === 'CLOSED' ? (
        <>
          {/* Issue Title and Badges */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', color: '#333', flex: 1 }}>
                {issue.title}
              </h1>
              <span style={{
                backgroundColor: getPriorityColor(issue.priority),
                color: 'white',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {issue.priority}
              </span>
              <span style={{
                backgroundColor: getStatusColor(issue.status),
                color: 'white',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {issue.status.replace('_', ' ')}
              </span>
            </div>
            
            {/* Issue Meta */}
            <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              <div>Created by <strong>{issue.createdBy?.firstName} {issue.createdBy?.lastName}</strong> on {formatDate(issue.createdAt)}</div>
              {issue.assignedTo && (
                <div>Assigned to <strong>{issue.assignedTo.firstName} {issue.assignedTo.lastName}</strong></div>
              )}
              {issue.status === 'CLOSED' && (
                <div>
                  Closed by <strong>{issue.closedBy?.firstName} {issue.closedBy?.lastName}</strong> on {issue.closedAt ? formatDate(issue.closedAt) : '—'}
                </div>
              )}
              {issue.updatedAt !== issue.createdAt && (
                <div>Last updated {formatDate(issue.updatedAt)}</div>
              )}
            </div>
          </div>

          {/* Description */}
          {issue.description && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', color: '#333', marginBottom: '12px' }}>Description</h3>
              <div style={{ 
                background: '#f8f9fa', 
                border: '1px solid #e9ecef', 
                borderRadius: '6px', 
                padding: '20px',
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#495057',
                whiteSpace: 'pre-wrap'
              }}>
                {issue.description}
              </div>
            </div>
          )}

          {/* Resolution */}
          {issue.status === 'CLOSED' && issue.resolution && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', color: '#333', marginBottom: '12px' }}>Resolution</h3>
              <div style={{ 
                background: '#f8f9fa', 
                border: '1px solid #e9ecef', 
                borderRadius: '6px', 
                padding: '20px',
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#495057',
                whiteSpace: 'pre-wrap'
              }}>
                {issue.resolution}
              </div>
            </div>
          )}
        </>
      ) : (
  /* Edit Form */
  <div>
          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
              Title
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Status, Priority, Assignment Row */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                Priority
              </label>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                Assign To
              </label>
              <select
                value={editForm.assignedToId}
                onChange={(e) => setEditForm({ ...editForm, assignedToId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Related Content */}
      <div style={{ marginTop: '16px', borderTop: '1px solid #f1f3f5', paddingTop: '12px' }}>
        <h3 style={{ fontSize: '20px', color: '#333', marginBottom: '16px', textAlign: 'center' }}>Related Content</h3>
        
        {/* Clickable Statistics Boxes */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div 
            onClick={handleOpenMotionsModal}
            style={{ 
              background: '#e3f2fd', 
              borderRadius: '8px', 
              padding: '16px', 
              textAlign: 'center',
              minWidth: '120px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
              {issue.motionCount || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#1976d2' }}>Motions</div>
          </div>
          <div 
            onClick={handleOpenTasksModal}
            style={{ 
              background: '#fff3e0', 
              borderRadius: '8px', 
              padding: '16px', 
              textAlign: 'center',
              minWidth: '120px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
              {typeof issue.taskCount === 'number' ? issue.taskCount : (Array.isArray(issue.allTasks) ? issue.allTasks.length : (issue.Task?.length || 0))}
            </div>
            <div style={{ fontSize: '14px', color: '#f57c00' }}>Tasks</div>
          </div>
        </div>

        {/* Comments Section */}
        {issue.status !== 'CLOSED' && (
          <div style={{ marginTop: '40px', borderTop: '1px solid #e9ecef', paddingTop: '32px' }}>
            {commentsLoading ? (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                Loading comments...
              </div>
            ) : (
              <CommentsSection
                comments={comments}
                motionId={null}
                userId={currentUser?.id}
                onAddComment={handleAddComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                onReplyToComment={handleReplyToComment}
              />
            )}
          </div>
        )}
      </div>

      {/* Motions Modal */}
      {showMotionsModal && (
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
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Related Motions</h3>
              <button 
                onClick={() => setShowMotionsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {relatedMotions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  No motions found
                </div>
              ) : (
                relatedMotions.map(motion => (
                  <div 
                    key={motion.id}
                    onClick={() => handleMotionClick(motion.id, motion.status)}
                    style={{
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      padding: '16px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                  >
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                      {motion.motion || motion.summary}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      By {motion.User?.firstName} {motion.User?.lastName} • 
                      Status: <strong>{motion.status}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tasks Modal */}
      {showTasksModal && (
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
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Related Tasks</h3>
              <button 
                onClick={() => setShowTasksModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {relatedTasks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  No tasks found
                </div>
              ) : (
                relatedTasks.map(task => (
                  <div 
                    key={task.id}
                    style={{
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      padding: '16px',
                      backgroundColor: '#fff'
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                      {task.action || task.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                      {task.description && (
                        <>
                          {task.description}
                          <br />
                        </>
                      )}
                      Assigned to: {task.user?.firstName} {task.user?.lastName} • 
                      Status: <strong style={{ 
                        color: task.status === 'COMPLETED' ? '#28a745' : 
                              task.status === 'IN_PROGRESS' ? '#ffc107' : '#6c757d' 
                      }}>
                        {task.status?.replace('_', ' ')}
                      </strong>
                      {task.due && ` • Due: ${new Date(task.due).toLocaleDateString()}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close Issue Modal */}
      {showCloseModal && (
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
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '520px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Close Issue</h3>
              <button 
                onClick={() => setShowCloseModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: '12px', color: '#555' }}>
              Please provide a brief resolution summary. Are you sure you want to close this issue?
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Resolution</label>
              <textarea
                value={closeResolution}
                onChange={(e) => setCloseResolution(e.target.value)}
                placeholder="What was the outcome or reason for closing?"
                style={{ width: '100%', minHeight: 120, padding: 12, border: '1px solid #ddd', borderRadius: 6 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setShowCloseModal(false)}
                style={{ backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', cursor: 'pointer' }}
              >
                No, Keep Open
              </button>
              <button
                disabled={closing}
                onClick={async () => {
                  try {
                    setClosing(true);
                    // Simplify - just send resolution text
                    const result = await closeIssue(id, { resolution: closeResolution.trim() });
                    if (!result || result.error) {
                      alert('Failed to close issue' + (result?.message ? ': ' + result.message : ''));
                    } else {
                      setIssue(result);
                      setShowCloseModal(false);
                    }
                  } catch (e) {
                    alert('Failed to close issue');
                  } finally {
                    setClosing(false);
                  }
                }}
                style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', cursor: 'pointer', opacity: closing ? 0.7 : 1 }}
              >
                {closing ? 'Closing…' : 'Yes, Close Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IssueDetail;
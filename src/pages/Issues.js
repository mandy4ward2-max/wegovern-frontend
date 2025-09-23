import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIssues, createIssue, getUsers } from '../api';
import { useWebSocket } from '../WebSocketContext';

function Issues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const { socket } = useWebSocket();

  // New issue form state
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'OPEN',
    assignedToId: ''
  });

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  // Fetch issues
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        const [issuesData, usersData] = await Promise.all([
          getIssues(currentUser.orgId),
          getUsers('all')
        ]);
        
        setIssues(Array.isArray(issuesData) ? issuesData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIssues([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Listen for real-time issue updates via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleIssueUpdate = (data) => {
      console.log('Received issueUpdate:', data);
      
      if (data.type === 'ISSUE_CREATED') {
        setIssues(prevIssues => [data.issue, ...prevIssues]);
      } else if (data.type === 'ISSUE_UPDATED') {
        setIssues(prevIssues => 
          prevIssues.map(issue => 
            issue.id === data.issue.id ? data.issue : issue
          )
        );
      } else if (data.type === 'ISSUE_DELETED') {
        setIssues(prevIssues => 
          prevIssues.filter(issue => issue.id !== data.issueId)
        );
      }
    };

    const handleCommentUpdate = (data) => {
      console.log('Received comment update in Issues:', data);
      
      // Update comment count for the affected issue
      if (data.issueId && data.type === 'comment') {
        setIssues(prevIssues => 
          prevIssues.map(issue => {
            if (issue.id === data.issueId) {
              return {
                ...issue,
                commentCount: (issue.commentCount || 0) + 1
              };
            }
            return issue;
          })
        );
      } else if (data.issueId && data.type === 'commentDeleted') {
        setIssues(prevIssues => 
          prevIssues.map(issue => {
            if (issue.id === data.issueId) {
              return {
                ...issue,
                commentCount: Math.max(0, (issue.commentCount || 0) - 1)
              };
            }
            return issue;
          })
        );
      }
    };

    socket.on('issueUpdate', handleIssueUpdate);
    socket.on('comment', handleCommentUpdate);

    return () => {
      socket.off('issueUpdate', handleIssueUpdate);
      socket.off('comment', handleCommentUpdate);
    };
  }, [socket]);

  // Handle create issue
  const handleCreateIssue = async (e) => {
    e.preventDefault();
    
    if (!newIssue.title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      const createdIssue = await createIssue(
        newIssue.title,
        newIssue.description,
        newIssue.status,
        newIssue.priority,
        newIssue.assignedToId || null
      );

      if (!createdIssue.error) {
        setNewIssue({ title: '', description: '', priority: 'MEDIUM', status: 'OPEN', assignedToId: '' });
        setShowCreateModal(false);
        // Issue will be added via WebSocket
      } else {
        alert('Failed to create issue: ' + createdIssue.message);
      }
    } catch (error) {
      console.error('Error creating issue:', error);
      alert('Failed to create issue');
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading Issues...</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: 1200, 
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
        marginBottom: '32px' 
      }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>Issues</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,123,255,0.3)'
          }}
        >
          + Create Issue
        </button>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#666',
          fontSize: '18px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ marginBottom: '8px', color: '#333' }}>No Issues Yet</h3>
          <p>Create your first issue to start tracking and discussing topics.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {issues.map(issue => (
            <div
              key={issue.id}
              onClick={() => navigate(`/issue/${issue.id}`)}
              style={{
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = '#007bff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#e9ecef';
              }}
            >
              {/* Issue Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: '#333',
                  lineHeight: '1.3'
                }}>
                  {issue.title}
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Priority Badge */}
                  <span style={{
                    backgroundColor: getPriorityColor(issue.priority),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {issue.priority}
                  </span>
                  {/* Status Badge */}
                  <span style={{
                    backgroundColor: getStatusColor(issue.status),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {issue.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Issue Description */}
              {issue.description && (
                <p style={{ 
                  margin: '0 0 16px 0', 
                  color: '#666', 
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {issue.description.length > 200 
                    ? issue.description.substring(0, 200) + '...' 
                    : issue.description
                  }
                </p>
              )}

              {/* Issue Stats */}
              <div style={{ 
                display: 'flex', 
                gap: '24px', 
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '13px' }}>
                  <span>📄</span>
                  <span>{issue.motionCount} Motion{issue.motionCount !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '13px' }}>
                  <span>✅</span>
                  <span>{issue.taskCount} Task{issue.taskCount !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '13px' }}>
                  <span>💬</span>
                  <span>{issue.commentCount} Comment{issue.commentCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Issue Meta */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '12px',
                color: '#999',
                borderTop: '1px solid #f8f9fa',
                paddingTop: '12px'
              }}>
                <div>
                  Created by <strong>{issue.createdBy?.firstName} {issue.createdBy?.lastName}</strong>
                  {issue.assignedTo && (
                    <span> • Assigned to <strong>{issue.assignedTo.firstName} {issue.assignedTo.lastName}</strong></span>
                  )}
                </div>
                <div>
                  {formatDate(issue.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Issue Modal */}
      {showCreateModal && (
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
            padding: '32px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#333' }}>Create New Issue</h2>
            
            <form onSubmit={handleCreateIssue}>
              {/* Title */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600', 
                  color: '#555' 
                }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={newIssue.title}
                  onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter issue title..."
                  required
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600', 
                  color: '#555' 
                }}>
                  Description
                </label>
                <textarea
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                  placeholder="Describe the issue in detail..."
                />
              </div>

              {/* Priority and Status Row */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600', 
                    color: '#555' 
                  }}>
                    Priority
                  </label>
                  <select
                    value={newIssue.priority}
                    onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
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
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600', 
                    color: '#555' 
                  }}>
                    Assign To
                  </label>
                  <select
                    value={newIssue.assignedToId}
                    onChange={(e) => setNewIssue({ ...newIssue, assignedToId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
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

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Create Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Issues;
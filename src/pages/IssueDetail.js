import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssueById, updateIssue, getUsers } from '../api';
import { useWebSocket } from '../WebSocketContext';

function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { socket } = useWebSocket();

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

  // Fetch issue details
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [issueData, usersData] = await Promise.all([
          getIssueById(id),
          getUsers('all')
        ]);

        if (issueData && !issueData.error) {
          setIssue(issueData);
          setEditForm({
            title: issueData.title,
            description: issueData.description || '',
            status: issueData.status,
            priority: issueData.priority,
            assignedToId: issueData.assignedToId || ''
          });
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

  // Listen for real-time issue updates
  useEffect(() => {
    if (!socket || !issue) return;

    const handleIssueUpdate = (data) => {
      if (data.type === 'ISSUE_UPDATED' && data.issue.id === issue.id) {
        setIssue(data.issue);
      }
    };

    socket.on('issueUpdate', handleIssueUpdate);

    return () => {
      socket.off('issueUpdate', handleIssueUpdate);
    };
  }, [socket, issue]);

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
          {!editing ? (
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
          )}
        </div>
      </div>

      {/* Issue Content */}
      {!editing ? (
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
      <div style={{ marginTop: '40px', borderTop: '2px solid #f8f9fa', paddingTop: '32px' }}>
        <h3 style={{ fontSize: '20px', color: '#333', marginBottom: '24px' }}>Related Content</h3>
        
        {/* Statistics */}
        <div style={{ display: 'flex', gap: '32px', marginBottom: '32px' }}>
          <div style={{ 
            background: '#e3f2fd', 
            borderRadius: '8px', 
            padding: '16px', 
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
              {issue.Motion?.length || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#1976d2' }}>Motions</div>
          </div>
          <div style={{ 
            background: '#fff3e0', 
            borderRadius: '8px', 
            padding: '16px', 
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
              {issue.Task?.length || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#f57c00' }}>Tasks</div>
          </div>
        </div>

        {/* Related Motions */}
        {issue.Motion && issue.Motion.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '16px', color: '#333', marginBottom: '16px' }}>Related Motions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {issue.Motion.map(motion => (
                <div 
                  key={motion.id}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    padding: '16px',
                    backgroundColor: '#fff'
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    {motion.motion}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    By {motion.User.firstName} {motion.User.lastName} • 
                    {motion._count.votes} votes • 
                    {motion._count.comments} comments • 
                    Status: <strong>{motion.status}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Tasks */}
        {issue.Task && issue.Task.length > 0 && (
          <div>
            <h4 style={{ fontSize: '16px', color: '#333', marginBottom: '16px' }}>Related Tasks</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {issue.Task.map(task => (
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
                    {task.action}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    Assigned to {task.user.firstName} {task.user.lastName} • 
                    Status: <strong>{task.status.replace('_', ' ')}</strong>
                    {task.due && ` • Due: ${new Date(task.due).toLocaleDateString()}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IssueDetail;
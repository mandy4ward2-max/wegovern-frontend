
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FilePreview from '../components/FilePreview';
import CommentsSection from '../components/CommentsSection';
import { getMotionById, getComments, addComment, editComment, deleteComment, getUsers } from '../api';
import { useWebSocket } from '../WebSocketContext';


function CompletedMotionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [motion, setMotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const { socket, connected } = useWebSocket();

  // Fetch comments helper
  const fetchComments = useCallback(async () => {
    if (!id) return;
    const commentsRes = await getComments(id);
    if (commentsRes && Array.isArray(commentsRes)) setComments(commentsRes);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    
    async function fetchMotion() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMotionById(id);
        if (data && data.status !== 'error') {
          setMotion(data);
          setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        } else {
          setError('Motion not found.');
        }
      } catch (err) {
        setError('Failed to load motion.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchMotion();
    fetchComments();
  }, [id, fetchComments]);

  // Load organization users for @mentions (same behavior as Issue/Motion pages)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getUsers(); // hits /users/org/all
        if (!cancelled && Array.isArray(data)) setUsers(data);
      } catch (_) {
        if (!cancelled) setUsers([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Listen for WebSocket comment events
  useEffect(() => {
    if (!socket || !connected || !id) return;

    const handleComment = (data) => {
      if (data.motionId === parseInt(id)) {
        fetchComments();
      }
    };

    socket.on('comment', handleComment);

    return () => {
      socket.off('comment', handleComment);
    };
  }, [socket, connected, id, fetchComments]);

  // Comment handlers
  const handleAddComment = async (text, taggedUserIds = []) => {
    if (!text.trim()) return;
    // addComment expects: (text, { motionId | issueId | taskId }, parentId)
    await addComment(text, { motionId: Number(id) }, null, taggedUserIds);
    if (socket && connected) {
      socket.emit('comment', { type: 'comment', motionId: parseInt(id) });
    }
    await fetchComments();
  };

  const handleReplyToComment = async (parentId, text, taggedUserIds = []) => {
    if (!text.trim()) return;
    // addComment expects: (text, { motionId | issueId | taskId }, parentId)
    await addComment(text, { motionId: Number(id) }, parentId, taggedUserIds);
    if (socket && connected) {
      socket.emit('comment', { type: 'comment', motionId: parseInt(id) });
    }
    await fetchComments();
  };

  const handleEditComment = async (commentId, text) => {
    await editComment(commentId, text);
    if (socket && connected) {
      socket.emit('comment', { type: 'commentUpdated', motionId: parseInt(id), commentId });
    }
    await fetchComments();
  };

  const handleDeleteComment = async (commentId) => {
    await deleteComment(commentId);
    if (socket && connected) {
      socket.emit('comment', { type: 'commentDeleted', motionId: parseInt(id), commentId });
    }
    await fetchComments();
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }
  if (error || !motion) {
    return <div style={{ padding: 40, textAlign: 'center' }}>{error || 'Motion not found.'}</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', padding: '48px 48px 40px 48px', maxWidth: '700px', width: '100%', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', boxSizing: 'border-box' }}>
        <button onClick={() => navigate('/motions')} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: '28px', color: '#888', cursor: 'pointer', zIndex: 2 }} title="Close">×</button>
        
        {/* Voting Results Display (No buttons, just results) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ 
            background: '#28a745', 
            color: '#fff', 
            fontWeight: 'bold', 
            borderRadius: '4px', 
            padding: '10px 24px', 
            fontSize: '16px',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            Votes For ({motion.votesForCount || 0})
            {motion.votesForUsers && motion.votesForUsers.length > 0 && (
              <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'normal' }}>
                {motion.votesForUsers.map(user => user.name).join(', ')}
              </div>
            )}
          </div>
          <div style={{ 
            background: '#dc3545', 
            color: '#fff', 
            fontWeight: 'bold', 
            borderRadius: '4px', 
            padding: '10px 24px', 
            fontSize: '16px',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            Votes Against ({motion.votesAgainstCount || 0})
            {motion.votesAgainstUsers && motion.votesAgainstUsers.length > 0 && (
              <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'normal' }}>
                {motion.votesAgainstUsers.map(user => user.name).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Motion info */}
        <h2>{motion.title}</h2>
        <div style={{ marginBottom: '8px', color: '#555' }}><b>Motion:</b> {motion.motion}</div>
        
        {/* Tasks Section */}
        <div style={{ marginBottom: '16px' }}>
          <b>Tasks:</b>
          {Array.isArray(tasks) && tasks.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'none' }}>
              {tasks.map((task, idx) => (
                <li key={task.id || idx}>
                  <span style={{ fontWeight: 'bold' }}>{task.action}</span>
                  {task.user && (<> — {task.user.firstName} {task.user.lastName}</>)}
                  {task.due && <> (Due: {new Date(task.due).toLocaleDateString()})</>}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#888', fontStyle: 'italic', marginTop: 4 }}>No tasks assigned to this motion.</div>
          )}
        </div>
        
        <div style={{ marginBottom: '16px', color: '#555' }}><b>Description:</b> <span dangerouslySetInnerHTML={{ __html: motion.description }} /></div>
        
        {/* Status and Completion Info */}
        <div style={{ marginBottom: '16px' }}>
          <b>Status:</b> <span style={{ 
            color: motion.status === 'passed' ? '#28a745' : motion.status === 'defeated' ? '#dc3545' : '#666',
            fontWeight: 'bold',
            marginLeft: '8px'
          }}>
            {motion.status}
          </span>
        </div>
        
        <div style={{ marginBottom: '16px', color: '#555' }}>
          <b>Completed Date:</b> {motion.completedDate ? new Date(motion.completedDate).toLocaleDateString() : 'N/A'}
        </div>
        
        {/* Attachments */}
        <div style={{ marginBottom: '24px' }}>
          <b>Attachments:</b>
          <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
            {(motion.attachments || []).map((att, idx) => {
              const backendBase = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
              let fileUrl = '';
              if (att.entityId && att.filename) {
                // Use the new consolidated attachment system
                fileUrl = backendBase.replace(/\/$/, '') + `/api/attachments/download/${att.entityType || 'motion'}/${att.entityId}/${encodeURIComponent(att.filename)}`;
              } else if (att.motionId && att.filename) {
                // Legacy format fallback
                fileUrl = backendBase.replace(/\/$/, '') + `/api/attachments/download/${att.motionId}/${encodeURIComponent(att.filename)}`;
              } else if (att.url) {
                // Direct URL fallback - ensure proper concatenation
                const cleanBackend = backendBase.replace(/\/$/, '');
                const cleanUrl = att.url.replace(/^\//, '');
                fileUrl = cleanBackend + '/' + cleanUrl;
              }
              return (
                <li key={att.id || idx} style={{ marginBottom: '8px' }}>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#007bff', textDecoration: 'underline', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={e => {
                      const token = localStorage.getItem('token');
                      if (token) {
                        e.preventDefault();
                        fetch(fileUrl, {
                          method: 'GET',
                          headers: { 'Authorization': `Bearer ${token}` },
                          credentials: 'include',
                        })
                          .then(res => res.blob())
                          .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            window.open(url, '_blank');
                          });
                      }
                    }}
                  >
                    {att.desc || att.name || att.filename || att.url || `Attachment ${idx+1}`}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        
        {/* Facebook-style Comments Section */}
        <CommentsSection
          comments={comments}
          motionId={id}
          userId={(() => {
            try {
              return JSON.parse(localStorage.getItem('user') || '{}').id || null;
            } catch {
              return null;
            }
          })()}
          users={users}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onReplyToComment={handleReplyToComment}
        />
      </div>
    </div>
  );
}

function TextFilePreview({ url }) {
  const [textContent, setTextContent] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then(res => {
        if (res.headers.get('Content-Type')?.startsWith('text/plain')) {
          return res.text();
        }
        return null;
      })
      .then(text => {
        if (!cancelled && text) setTextContent(text);
      });
    return () => { cancelled = true; };
  }, [url]);
  if (textContent) {
    return <pre style={{ width: '70vw', maxHeight: '60vh', overflow: 'auto', background: '#fafbfc', borderRadius: 8, padding: 12 }}>{textContent}</pre>;
  }
  return null;
}

export default CompletedMotionPage;

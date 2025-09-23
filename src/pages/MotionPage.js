import React, { useState, useEffect, useCallback } from 'react';
import FilePreview from '../components/FilePreview';
import CommentsSection from '../components/CommentsSection';
import { useParams, useNavigate } from 'react-router-dom';
import { getMotionById, getComments, addComment, editComment, deleteComment, getVoteTally, createVote, getVotesByMotion } from '../api';
import { useWebSocket } from '../WebSocketContext';

function MotionPage() {
  // useParams must be the very first line to ensure 'id' is initialized before any use
  const { id } = useParams();

  // Fetch motion on mount or id change
  useEffect(() => {
    if (!id) return;
    getMotionById(id).then(m => {
      if (m) {
        setMotion(m);
        setTasks(Array.isArray(m.tasks) ? m.tasks : []);
      } else {
        setMotion(null);
        setTasks([]);
      }
    });
  }, [id]);

  // Fetch comments on mount or id change
  useEffect(() => {
    if (!id) return;
    const loadComments = async () => {
      const commentsRes = await getComments(id);
      if (commentsRes && Array.isArray(commentsRes)) setComments(commentsRes);
    };
    loadComments();
  }, [id]);

  // All other hooks and logic below
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();
  const [motion, setMotion] = useState(null);
  const [comments, setComments] = useState([]);
  const [showAttachment, setShowAttachment] = useState(null);
  const [votes, setVotes] = useState({ for: 0, against: 0 });
  const [showForPopup, setShowForPopup] = useState(false);
  const [showAgainstPopup, setShowAgainstPopup] = useState(false);
  // Helper to ensure only one popup is visible at a time
  const handleForHover = (show) => {
    setShowForPopup(show);
    if (show) setShowAgainstPopup(false);
  };
  const handleAgainstHover = (show) => {
    setShowAgainstPopup(show);
    if (show) setShowForPopup(false);
  };
  const popupTimeout = React.useRef();
  const [userVoted, setUserVoted] = useState(false);
  const [userVoteType, setUserVoteType] = useState(null);
  const { socket, connected } = useWebSocket();

  // Fetch comments helper for use throughout the component (after id is defined)
  const fetchComments = useCallback(async () => {
    if (!id) return;
    const commentsRes = await getComments(id);
    if (commentsRes && Array.isArray(commentsRes)) setComments(commentsRes);
  }, [id]);

  // Listen for WebSocket comment and vote events
  useEffect(() => {
    if (!socket || !connected || !id) return;

    const handleComment = (data) => {
      if (data.motionId === parseInt(id)) {
        fetchComments();
      }
    };

    const handleVote = (data) => {
      if (data.motionId === parseInt(id)) {
        // Refresh vote tally and user vote
        const userStr = localStorage.getItem('user');
        let userId = null;
        if (userStr) {
          try { userId = JSON.parse(userStr).id; } catch {}
        }
        
        // Update vote tally
        getVoteTally(id, userId).then(tallyRes => {
          if (tallyRes && tallyRes.tally) setVotes(tallyRes.tally);
          if (tallyRes && tallyRes.userVote) {
            setUserVoted(true);
            setUserVoteType(tallyRes.userVote);
          } else {
            setUserVoted(false);
            setUserVoteType(null);
          }
        });

        // Also refresh the motion data to get updated vote counts on buttons
        getMotionById(id).then(m => {
          if (m) {
            setMotion(m);
            // Update the votes state to reflect the new counts
            setVotes({
              for: m.votesForCount || 0,
              against: m.votesAgainstCount || 0
            });
          }
        });
      }
    };

    socket.on('comment', handleComment);
    socket.on('vote', handleVote);

    return () => {
      socket.off('comment', handleComment);
      socket.off('vote', handleVote);
    };
  }, [socket, connected, id, fetchComments]);

  // Comment/reply handlers
  const handleAddComment = async (text) => {
    if (!text.trim()) return;
    // addComment expects: (text, { motionId | issueId | taskId }, parentId)
    await addComment(text, { motionId: Number(id) }, null); // parentId null for top-level
    // Broadcast to WebSocket
    if (socket && connected) {
      socket.emit('comment', { type: 'comment', motionId: parseInt(id) });
    }
    await fetchComments();
  };

  const handleReplyToComment = async (parentId, text) => {
    if (!text.trim()) return;
    // addComment expects: (text, { motionId | issueId | taskId }, parentId)
    await addComment(text, { motionId: Number(id) }, parentId); // pass parentId for nesting
    // Broadcast to WebSocket
    if (socket && connected) {
      socket.emit('comment', { type: 'comment', motionId: parseInt(id) });
    }
    await fetchComments();
  };

  const handleEditComment = async (commentId, text) => {
    await editComment(commentId, text);
    // Broadcast to WebSocket
    if (socket && connected) {
      socket.emit('comment', { type: 'commentUpdated', motionId: parseInt(id), commentId });
    }
    await fetchComments();
  };

  const handleDeleteComment = async (commentId) => {
    await deleteComment(commentId);
    // Broadcast to WebSocket
    if (socket && connected) {
      socket.emit('comment', { type: 'commentDeleted', motionId: parseInt(id), commentId });
    }
    await fetchComments();
  };

  // Voting logic
  const handleVote = async (type) => {
    if (userVoted) return;
    const userStr = localStorage.getItem('user');
    let userId = null;
    if (userStr) {
      try { userId = JSON.parse(userStr).id; } catch {}
    }
    if (!userId) return;
    
    const res = await createVote(id, userId, type);
    if (!res.error) {
      // Immediately update local state for responsive UI
      setUserVoted(true);
      setUserVoteType(type);
      
      // Optimistically update vote counts
      setMotion(prevMotion => ({
        ...prevMotion,
        votesForCount: type === 'for' ? (prevMotion.votesForCount || 0) + 1 : prevMotion.votesForCount || 0,
        votesAgainstCount: type === 'against' ? (prevMotion.votesAgainstCount || 0) + 1 : prevMotion.votesAgainstCount || 0
      }));
      
      // Broadcast vote event to other users
      if (socket && connected) {
        socket.emit('vote', { type: 'vote', motionId: parseInt(id) });
      }
      
      // Refresh accurate data from server
      const tallyRes = await getVoteTally(id, userId);
      if (tallyRes && tallyRes.tally) {
        setVotes(tallyRes.tally);
      }
      
      // Also refresh the motion to get accurate vote counts
      getMotionById(id).then(m => {
        if (m) {
          setMotion(m);
          setVotes({
            for: m.votesForCount || 0,
            against: m.votesAgainstCount || 0
          });
        }
      });
    }
  };

  if (!motion) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Motion not found.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', padding: '48px 48px 40px 48px', maxWidth: '700px', width: '100%', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', boxSizing: 'border-box' }}>
        <button onClick={() => navigate('/motions')} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: '28px', color: '#888', cursor: 'pointer', zIndex: 2 }} title="Close">×</button>
        {/* Vote buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px', position: 'relative', overflow: 'visible', zIndex: 20 }}>
          {/* Vote For Button and Popup */}
          <div
            style={{ position: 'relative', overflow: 'visible', zIndex: 21, display: 'inline-block' }}
            onMouseEnter={() => { clearTimeout(popupTimeout.current); handleForHover(true); }}
            onMouseLeave={() => { popupTimeout.current = setTimeout(() => handleForHover(false), 120); }}
          >
            <button
              onClick={() => handleVote('for')}
              style={{ background: '#28a745', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '4px', padding: '10px 24px', fontSize: '16px', cursor: userVoted ? 'not-allowed' : 'pointer', opacity: userVoted ? 0.6 : 1 }}
              disabled={userVoted}
            >
              Vote For ({motion.votesForCount || 0})
              {userVoteType === 'for' && <span style={{ marginLeft: 8, color: '#fff', fontWeight: 'bold' }}>✓</span>}
            </button>
            {showForPopup && (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '110%',
                  transform: 'translateX(-50%)',
                  background: '#fff',
                  color: '#333',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  padding: '10px 16px',
                  minWidth: '180px',
                  zIndex: 1000,
                  fontSize: '15px',
                  fontWeight: 400,
                  pointerEvents: 'auto',
                  whiteSpace: 'pre-line',
                }}
                onMouseEnter={() => { clearTimeout(popupTimeout.current); handleForHover(true); }}
                onMouseLeave={() => { popupTimeout.current = setTimeout(() => handleForHover(false), 120); }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Voted For:</div>
                {motion.votesForUsers && motion.votesForUsers.length > 0 ? (
                  motion.votesForUsers.map((user, idx) => (
                    <div key={idx} style={{ padding: '2px 0' }}>{user.name}</div>
                  ))
                ) : (
                  <div style={{ color: '#888' }}>No votes yet</div>
                )}
              </div>
            )}
          </div>
          {/* Vote Against Button and Popup */}
          <div
            style={{ position: 'relative', overflow: 'visible', zIndex: 21, display: 'inline-block' }}
            onMouseEnter={() => { clearTimeout(popupTimeout.current); handleAgainstHover(true); }}
            onMouseLeave={() => { popupTimeout.current = setTimeout(() => handleAgainstHover(false), 120); }}
          >
            <button
              onClick={() => handleVote('against')}
              style={{ background: '#dc3545', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '4px', padding: '10px 24px', fontSize: '16px', cursor: userVoted ? 'not-allowed' : 'pointer', opacity: userVoted ? 0.6 : 1 }}
              disabled={userVoted}
            >
              Vote Against ({motion.votesAgainstCount || 0})
              {userVoteType === 'against' && <span style={{ marginLeft: 8, color: '#fff', fontWeight: 'bold' }}>✓</span>}
            </button>
            {showAgainstPopup && (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '110%',
                  transform: 'translateX(-50%)',
                  background: '#fff',
                  color: '#333',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  padding: '10px 16px',
                  minWidth: '180px',
                  zIndex: 1000,
                  fontSize: '15px',
                  fontWeight: 400,
                  pointerEvents: 'auto',
                  whiteSpace: 'pre-line',
                }}
                onMouseEnter={() => { clearTimeout(popupTimeout.current); handleAgainstHover(true); }}
                onMouseLeave={() => { popupTimeout.current = setTimeout(() => handleAgainstHover(false), 120); }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Voted Against:</div>
                {motion.votesAgainstUsers && motion.votesAgainstUsers.length > 0 ? (
                  motion.votesAgainstUsers.map((user, idx) => (
                    <div key={idx} style={{ padding: '2px 0' }}>{user.name}</div>
                  ))
                ) : (
                  <div style={{ color: '#888' }}>No votes yet</div>
                )}
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
        {/* Attachments */}
        <div style={{ marginBottom: '24px' }}>
          <b>Attachments:</b>
          <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
            {(motion.attachments || []).map((att, idx) => {
              // Use new backend download route for attachments
              const backendBase = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
              let fileUrl = '';
              if (att.motionId && att.filename) {
                fileUrl = backendBase.replace(/\/$/, '') + `/api/attachments/download/${att.motionId}/${encodeURIComponent(att.filename)}`;
              } else if (att.url) {
                // fallback to old url if needed
                fileUrl = backendBase.replace(/\/$/, '') + (att.url.startsWith('/') ? '' : '/') + att.url.replace(/^\//, '');
              }
              return (
                <li key={att.id || idx} style={{ marginBottom: '8px' }}>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#007bff', textDecoration: 'underline', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={e => {
                      // For direct navigation, let browser handle it
                      // For programmatic fetch, send credentials
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
        {/* Attachment popup removed: links now open in new tab directly */}
        
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

export default MotionPage;

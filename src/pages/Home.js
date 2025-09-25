import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useEffect } from 'react';
import { getMotions, getVoteTally } from '../api';
import { useWebSocket } from '../WebSocketContext';


function Home() {
  const navigate = useNavigate();
  const { socket, connected } = useWebSocket();
  const [completedFilters, setCompletedFilters] = useState({
    title: '',
    date: { from: '', to: '', show: false },
    submittedBy: '',
    votesFor: '',
    votesAgainst: '',
    status: '',
    completedDate: { from: '', to: '', show: false }
  });
  const [motionFilters, setMotionFilters] = useState({
    title: '',
    date: { from: '', to: '', show: false },
    submittedBy: '',
    votesFor: '',
    votesAgainst: '',
    userVoted: ''
  });
  const [outstandingMotions, setOutstandingMotions] = useState([]);
  const [completedMotions, setCompletedMotions] = useState([]);

  const fetchMotions = async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let orgId = null;
    let userId = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        orgId = user.orgId || (user.org && user.org.id);
        userId = user.id;
      } catch {}
    }
    if (!orgId || !token) {
      setOutstandingMotions([]);
      setCompletedMotions([]);
      return;
    }
    
    try {
      console.log('🔍 Fetching pending motions...', { orgId, userId, token: token ? 'present' : 'missing' });
      
      // Fetch outstanding motions (both unapproved and pending)
      const outstandingResponse = await fetch(
        `http://localhost:3000/api/motions?orgId=${orgId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('📡 Outstanding response status:', outstandingResponse.status, outstandingResponse.statusText);
      
      let allMotions = await outstandingResponse.json();
      console.log('📋 Raw motions from API:', allMotions);
      
      if (Array.isArray(allMotions) && userId) {
        // Filter motions into outstanding (pending only) and completed
        const outstandingMotions = allMotions.filter(motion => 
          motion.status === 'pending'
        );
        const completedMotions = allMotions.filter(motion => 
          motion.status === 'passed' || motion.status === 'defeated'
        );
        // For each outstanding motion, check if user voted
        const processedOutstandingMotions = await Promise.all(outstandingMotions.map(async m => {
          const tally = await getVoteTally(m.id, userId);
          return { ...m, userVoted: !!tally.userVote };
        }));
        
        console.log('✅ Final outstanding motions after processing:', processedOutstandingMotions);
        setOutstandingMotions(Array.isArray(processedOutstandingMotions) ? processedOutstandingMotions : []);
        
        // Set completed motions (no need to fetch again, we already have them)
        console.log('✅ Completed motions:', completedMotions);
        setCompletedMotions(Array.isArray(completedMotions) ? completedMotions : []);
      } else {
        setOutstandingMotions([]);
        setCompletedMotions([]);
      }
    } catch (e) {
      setOutstandingMotions([]);
      setCompletedMotions([]);
    }
  };

  useEffect(() => {
    fetchMotions();
  }, []);

  // WebSocket listener for real-time motion updates
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewMotion = async (data) => {
      if (data.type === 'MOTION_CREATED' && data.motion) {
        let newMotion = data.motion;
        
        // Format motion data to match the structure expected by the frontend
        newMotion = {
          ...newMotion,
          date: newMotion.createdAt || newMotion.dateSubmitted,
          createdByName: newMotion.submittedBy ? 
            `${newMotion.submittedBy.firstName || ''} ${newMotion.submittedBy.lastName || ''}`.trim() : ''
        };
        
        // Only add to outstanding motions if it's pending status
        if (newMotion.status === 'pending') {
          const userStr = localStorage.getItem('user');
          let userId = null;
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              userId = user.id;
            } catch {}
          }

          // Check if user voted on this motion
          if (userId) {
            const tally = await getVoteTally(newMotion.id, userId);
            newMotion.userVoted = !!tally.userVote;
          }

          setOutstandingMotions(prev => {
            // Check if motion already exists to prevent duplicates
            const exists = prev.some(motion => motion.id === newMotion.id);
            if (!exists) {
              return [newMotion, ...prev];
            }
            return prev;
          });
        }
      }
    };

    socket.on('newMotion', handleNewMotion);

    return () => {
      socket.off('newMotion', handleNewMotion);
    };
  }, [socket, connected]);

  // Refresh when user returns to the tab or window gets focus
  useEffect(() => {
    const handleFocus = () => {
      fetchMotions();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMotions();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-refresh every 10 seconds if there are outstanding motions
  useEffect(() => {
    let interval;
    if (outstandingMotions.length > 0) {
      interval = setInterval(() => {
        fetchMotions();
      }, 10000); // Check every 10 seconds if there are pending motions
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [outstandingMotions.length]);

  // Helper function to get submittedBy name as string
  const getSubmittedByName = (motion) => {
    if (typeof motion.submittedBy === 'string') {
      return motion.submittedBy;
    }
    if (motion.submittedBy && typeof motion.submittedBy === 'object') {
      return `${motion.submittedBy.firstName || ''} ${motion.submittedBy.lastName || ''}`.trim();
    }
    return '';
  };

  const filteredCompleted = completedMotions.filter(motion => {
    const titleMatch = (motion.title || '').toLowerCase().includes((completedFilters.title || '').toLowerCase());
    const submittedByMatch = getSubmittedByName(motion).toLowerCase().includes((completedFilters.submittedBy || '').toLowerCase());
    const votesForMatch = completedFilters.votesFor === '' || (motion.votesFor !== undefined && motion.votesFor !== null && motion.votesFor.toString().includes(completedFilters.votesFor));
    const votesAgainstMatch = completedFilters.votesAgainst === '' || (motion.votesAgainst !== undefined && motion.votesAgainst !== null && motion.votesAgainst.toString().includes(completedFilters.votesAgainst));
    const statusMatch = completedFilters.status === '' || (motion.status || '').toLowerCase().includes((completedFilters.status || '').toLowerCase());
    let dateMatch = true;
    if (completedFilters.date.from && completedFilters.date.to) {
      dateMatch = motion.date && motion.date >= completedFilters.date.from && motion.date <= completedFilters.date.to;
    }
    let completedDateMatch = true;
    if (completedFilters.completedDate.from && completedFilters.completedDate.to) {
      completedDateMatch = motion.completedDate && motion.completedDate >= completedFilters.completedDate.from && motion.completedDate <= completedFilters.completedDate.to;
    }
    return titleMatch && submittedByMatch && votesForMatch && votesAgainstMatch && statusMatch && dateMatch && completedDateMatch;
  });
  const filteredMotions = outstandingMotions.filter(motion => {
    const titleMatch = (motion.title || '').toLowerCase().includes((motionFilters.title || '').toLowerCase());
    const submittedByMatch = getSubmittedByName(motion).toLowerCase().includes((motionFilters.submittedBy || '').toLowerCase());
    const votesForMatch = motionFilters.votesFor === '' || (motion.votesFor !== undefined && motion.votesFor !== null && motion.votesFor.toString().includes(motionFilters.votesFor));
    const votesAgainstMatch = motionFilters.votesAgainst === '' || (motion.votesAgainst !== undefined && motion.votesAgainst !== null && motion.votesAgainst.toString().includes(motionFilters.votesAgainst));
    const userVotedMatch = motionFilters.userVoted === '' || ((motion.userVoted ? 'yes' : 'no').includes((motionFilters.userVoted || '').toLowerCase()));
    let dateMatch = true;
    if (motionFilters.date.from && motionFilters.date.to) {
      dateMatch = motion.date && motion.date >= motionFilters.date.from && motion.date <= motionFilters.date.to;
    }
    return titleMatch && submittedByMatch && votesForMatch && votesAgainstMatch && userVotedMatch && dateMatch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '40px' }}>
      {/* Centered New Motion Button */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <button
          style={{ padding: '14px 64px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
          onClick={() => navigate('/new-motion')}
        >
          New Motion
        </button>
      </div>
  <div style={{ padding: '32px', maxWidth: '700px', width: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', paddingBottom: '48px' }}>
        <h2 style={{ textAlign: 'center', width: '100%' }}>Outstanding Motions</h2>
  <div style={{ width: '100%', maxHeight: 300, overflowY: 'auto', marginTop: '16px', marginBottom: '48px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f6fa' }}>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'left', position: 'relative' }}>Date Submitted</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Submitted By</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Votes For</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Votes Against</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>I Voted</th>
              </tr>
              {/* Filter Row */}
              <tr>
                <th><input value={motionFilters.title} onChange={e => setMotionFilters(f => ({ ...f, title: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
                <th style={{ position: 'relative' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <input value={motionFilters.date.from && motionFilters.date.to ? `${motionFilters.date.from} to ${motionFilters.date.to}` : ''} readOnly placeholder="Filter..." style={{ width: '70%' }} />
                    <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setMotionFilters(f => ({ ...f, date: { ...f.date, show: !f.date.show } }))} title="Filter by date">
                      📅
                    </span>
                  </span>
                  {motionFilters.date.show && (
                    <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: 10, zIndex: 20, marginTop: 4 }}>
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 13 }}>From: <input type="date" value={motionFilters.date.from} onChange={e => setMotionFilters(f => ({ ...f, date: { ...f.date, from: e.target.value } }))} /></label>
                      </div>
                      <div>
                        <label style={{ fontSize: 13 }}>To: <input type="date" value={motionFilters.date.to} onChange={e => setMotionFilters(f => ({ ...f, date: { ...f.date, to: e.target.value } }))} /></label>
                      </div>
                      <button style={{ marginTop: 6, fontSize: 13 }} onClick={() => setMotionFilters(f => ({ ...f, date: { ...f.date, show: false } }))}>OK</button>
                    </div>
                  )}
                </th>
                <th><input value={motionFilters.submittedBy} onChange={e => setMotionFilters(f => ({ ...f, submittedBy: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
                <th><input value={motionFilters.votesFor} onChange={e => setMotionFilters(f => ({ ...f, votesFor: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
                <th><input value={motionFilters.votesAgainst} onChange={e => setMotionFilters(f => ({ ...f, votesAgainst: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
                <th><input value={motionFilters.userVoted} onChange={e => setMotionFilters(f => ({ ...f, userVoted: e.target.value }))} placeholder="yes/no" style={{ width: '90%' }} /></th>
              </tr>
            </thead>
            <tbody>
              {filteredMotions.map(motion => (
                <tr key={motion.id}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    <Link to={`/motion/${motion.id}`} style={{ color: '#007bff', textDecoration: 'underline' }}>{motion.title}</Link>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    {motion.date ? new Date(motion.date).toLocaleDateString() : ''}
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    {motion.createdByName || ''}
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'center', position: 'relative' }}>
                    <span
                      style={{ cursor: 'pointer', position: 'relative' }}
                      onMouseEnter={e => {
                        const popup = e.currentTarget.querySelector('.popup');
                        if (popup) popup.style.display = 'block';
                      }}
                      onMouseLeave={e => {
                        const popup = e.currentTarget.querySelector('.popup');
                        if (popup) popup.style.display = 'none';
                      }}
                    >
                      {typeof motion.votesForCount === 'number' ? motion.votesForCount : 0}
                      <span className="popup" style={{ display: 'none', position: 'absolute', top: 'auto', bottom: '28px', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: '10px', zIndex: 10, minWidth: '120px', color: '#333', fontSize: '14px' }}>
                        <b>Voted For:</b>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {(motion.votesForUsers || []).map((name, idx) => <li key={idx}>{name}</li>)}
                        </ul>
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'center', position: 'relative' }}>
                    <span
                      style={{ cursor: 'pointer', position: 'relative' }}
                      onMouseEnter={e => {
                        const popup = e.currentTarget.querySelector('.popup');
                        if (popup) popup.style.display = 'block';
                      }}
                      onMouseLeave={e => {
                        const popup = e.currentTarget.querySelector('.popup');
                        if (popup) popup.style.display = 'none';
                      }}
                    >
                      {typeof motion.votesAgainstCount === 'number' ? motion.votesAgainstCount : 0}
                      <span className="popup" style={{ display: 'none', position: 'absolute', top: 'auto', bottom: '28px', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: '10px', zIndex: 10, minWidth: '120px', color: '#333', fontSize: '14px' }}>
                        <b>Voted Against:</b>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {(motion.votesAgainstUsers || []).map((name, idx) => <li key={idx}>{name}</li>)}
                        </ul>
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    {motion.userVoted ? <span title="You voted" style={{ color: 'green', fontSize: '20px' }}>✔</span> : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Completed Motions Report */}
      <div style={{
        padding: '32px',
        maxWidth: '700px',
        width: '100%',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: '64px'
      }}>
        <h2 style={{ textAlign: 'center', width: '100%' }}>Completed Motions</h2>
  <div style={{ width: '100%', maxHeight: 300, overflowY: 'auto', marginTop: '16px', marginBottom: '96px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f6fa' }}>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'left', position: 'relative' }}>Date Submitted</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Submitted By</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Votes For</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Votes Against</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', position: 'relative' }}>Completed Date</th>
              </tr>
              {/* Filter Row */}
              <tr>
                <th><input value={completedFilters.title} onChange={e => setCompletedFilters(f => ({ ...f, title: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
                <th style={{ position: 'relative' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <input value={completedFilters.date.from && completedFilters.date.to ? `${completedFilters.date.from} to ${completedFilters.date.to}` : ''} readOnly placeholder="Filter..." style={{ width: '70%' }} />
                    <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setCompletedFilters(f => ({ ...f, date: { ...f.date, show: !f.date.show } }))} title="Filter by date">
                      📅
                    </span>
                  </span>
                  {completedFilters.date.show && (
                    <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: 10, zIndex: 20, marginTop: 4 }}>
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 13 }}>From: <input type="date" value={completedFilters.date.from} onChange={e => setCompletedFilters(f => ({ ...f, date: { ...f.date, from: e.target.value } }))} /></label>
                      </div>
                      <div>
                        <label style={{ fontSize: 13 }}>To: <input type="date" value={completedFilters.date.to} onChange={e => setCompletedFilters(f => ({ ...f, date: { ...f.date, to: e.target.value } }))} /></label>
                      </div>
                      <button style={{ marginTop: 6, fontSize: 13 }} onClick={() => setCompletedFilters(f => ({ ...f, date: { ...f.date, show: false } }))}>OK</button>
                    </div>
                  )}
                </th>
                <th><input value={completedFilters.submittedBy} onChange={e => setCompletedFilters(f => ({ ...f, submittedBy: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
                <th><input value={completedFilters.votesFor} onChange={e => setCompletedFilters(f => ({ ...f, votesFor: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
                <th><input value={completedFilters.votesAgainst} onChange={e => setCompletedFilters(f => ({ ...f, votesAgainst: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
                <th><input value={completedFilters.status} onChange={e => setCompletedFilters(f => ({ ...f, status: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
                <th style={{ position: 'relative' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <input value={completedFilters.completedDate.from && completedFilters.completedDate.to ? `${completedFilters.completedDate.from} to ${completedFilters.completedDate.to}` : ''} readOnly placeholder="Filter..." style={{ width: '70%' }} />
                    <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setCompletedFilters(f => ({ ...f, completedDate: { ...f.completedDate, show: !f.completedDate.show } }))} title="Filter by completed date">
                      📅
                    </span>
                  </span>
                  {completedFilters.completedDate.show && (
                    <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: 10, zIndex: 20, marginTop: 4 }}>
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 13 }}>From: <input type="date" value={completedFilters.completedDate.from} onChange={e => setCompletedFilters(f => ({ ...f, completedDate: { ...f.completedDate, from: e.target.value } }))} /></label>
                      </div>
                      <div>
                        <label style={{ fontSize: 13 }}>To: <input type="date" value={completedFilters.completedDate.to} onChange={e => setCompletedFilters(f => ({ ...f, completedDate: { ...f.completedDate, to: e.target.value } }))} /></label>
                      </div>
                      <button style={{ marginTop: 6, fontSize: 13 }} onClick={() => setCompletedFilters(f => ({ ...f, completedDate: { ...f.completedDate, show: false } }))}>OK</button>
                    </div>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCompleted.map(motion => (
                <tr key={motion.id}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    <Link to={`/completed-motion/${motion.id}`} style={{ color: '#007bff', textDecoration: 'underline' }}>{motion.title}</Link>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{motion.date ? new Date(motion.date).toLocaleDateString('en-US') : ''}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{motion.submittedBy}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'center', position: 'relative' }}>
                    <span
                      style={{ cursor: 'pointer', position: 'relative' }}
                      onMouseEnter={e => {
                        const popup = e.currentTarget.querySelector('.popup');
                        if (popup) popup.style.display = 'block';
                      }}
                      onMouseLeave={e => {
                        const popup = e.currentTarget.querySelector('.popup');
                        if (popup) popup.style.display = 'none';
                      }}
                    >
                      {typeof motion.votesFor === 'number' ? motion.votesFor : 0}
                      <span className="popup" style={{ display: 'none', position: 'absolute', top: 'auto', bottom: '28px', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: '10px', zIndex: 10, minWidth: '120px', color: '#333', fontSize: '14px' }}>
                        <b>Voted For:</b>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {(motion.votesForUsers || []).map((name, idx) => <li key={idx}>{name}</li>)}
                        </ul>
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'center', position: 'relative' }}>
                    <span
                      style={{ cursor: 'pointer', position: 'relative' }}
                      onMouseEnter={e => {
                        const popup = e.currentTarget.querySelector('.popup');
                        if (popup) popup.style.display = 'block';
                      }}
                      onMouseLeave={e => {
                        const popup = e.currentTarget.querySelector('.popup');
                        if (popup) popup.style.display = 'none';
                      }}
                    >
                      {typeof motion.votesAgainst === 'number' ? motion.votesAgainst : 0}
                      <span className="popup" style={{ display: 'none', position: 'absolute', top: 'auto', bottom: '28px', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: '10px', zIndex: 10, minWidth: '120px', color: '#333', fontSize: '14px' }}>
                        <b>Voted Against:</b>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {(motion.votesAgainstUsers || []).map((name, idx) => <li key={idx}>{name}</li>)}
                        </ul>
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <span style={{ 
                      color: motion.status === 'passed' ? '#28a745' : motion.status === 'defeated' ? '#dc3545' : '#666',
                      fontWeight: 'bold'
                    }}>
                      {motion.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{motion.completedDate ? new Date(motion.completedDate).toLocaleDateString('en-US') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Home;

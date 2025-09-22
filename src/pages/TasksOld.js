import React, { useState, useEffect } from 'react';
import { getTasks, completeTask } from '../api';

function TasksPage() {
  // Filter state for outstanding and completed tasks
  const [outstandingFilters, setOutstandingFilters] = useState({
    action: '',
    person: '',
    due: { from: '', to: '', show: false },
    motionTitle: '',
    status: ''
  });
  const [completedFilters, setCompletedFilters] = useState({
    action: '',
    person: '',
    due: { from: '', to: '', show: false },
    motionTitle: '',
    dateCompleted: { from: '', to: '', show: false }
  });
  // Mark completed popup state
  const [showCompletePopup, setShowCompletePopup] = useState(false);
  const [completePopupIdx, setCompletePopupIdx] = useState(null);
  const [completeComment, setCompleteComment] = useState('');
  const [completeDate, setCompleteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [completedTasks, setCompletedTasks] = useState([]);
  const [outstandingTasks, setOutstandingTasks] = useState([]);

  // Fetch tasks from backend

  useEffect(() => {
    async function fetchTasks() {
      const outstanding = await getTasks('outstanding');
      const completed = await getTasks('completed');
      setOutstandingTasks(Array.isArray(outstanding) ? outstanding : []);
      setCompletedTasks(Array.isArray(completed) ? completed : []);
    }
    fetchTasks();
  }, []);

  // Filtering logic for outstanding tasks
  const filteredOutstanding = (Array.isArray(outstandingTasks) ? outstandingTasks : []).filter(task => {
    const actionMatch = (task.action || '').toLowerCase().includes((outstandingFilters.action || '').toLowerCase());
    const personMatch = (task.username || task.person || '').toLowerCase().includes((outstandingFilters.person || '').toLowerCase());
    let dueMatch = true;
    if (outstandingFilters.due.from && outstandingFilters.due.to) {
      dueMatch = task.due >= outstandingFilters.due.from && task.due <= outstandingFilters.due.to;
    }
    const motionTitleMatch = (task.motionTitle || '').toLowerCase().includes((outstandingFilters.motionTitle || '').toLowerCase());
    const statusMatch = !outstandingFilters.status || task.status === outstandingFilters.status;
    return actionMatch && personMatch && dueMatch && motionTitleMatch && statusMatch;
  });
  // Filtering logic for completed tasks
  const filteredCompleted = (Array.isArray(completedTasks) ? completedTasks : []).filter(task => {
    const actionMatch = (task.action || '').toLowerCase().includes((completedFilters.action || '').toLowerCase());
    const personMatch = (task.username || task.person || '').toLowerCase().includes((completedFilters.person || '').toLowerCase());
    let dueMatch = true;
    if (completedFilters.due.from && completedFilters.due.to) {
      dueMatch = task.due >= completedFilters.due.from && task.due <= completedFilters.due.to;
    }
    const motionTitleMatch = (task.motionTitle || '').toLowerCase().includes((completedFilters.motionTitle || '').toLowerCase());
    let dateCompletedMatch = true;
    if (completedFilters.dateCompleted.from && completedFilters.dateCompleted.to) {
      dateCompletedMatch = (task.dateCompleted || '') >= completedFilters.dateCompleted.from && (task.dateCompleted || '') <= completedFilters.dateCompleted.to;
    }
    return actionMatch && personMatch && dueMatch && motionTitleMatch && dateCompletedMatch;
  });

  // Handler to open mark completed popup
  const handleCompleteTask = (taskIdx) => {
    setShowCompletePopup(true);
    setCompletePopupIdx(taskIdx);
    setCompleteComment('');
    setCompleteDate(new Date().toISOString().slice(0, 10));
  };
  // Handler to submit mark completed
  const handleSubmitComplete = async () => {
    const task = outstandingTasks[completePopupIdx];
    await completeTask(task.id, completeComment, completeDate);
    // Refresh tasks
    const outstanding = await getTasks('outstanding');
    const completed = await getTasks('completed');
    setOutstandingTasks(outstanding);
    setCompletedTasks(completed);
    setShowCompletePopup(false);
    setCompletePopupIdx(null);
    setCompleteComment('');
    setCompleteDate(new Date().toISOString().slice(0, 10));
  };

  // Handler to update task status
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        // Refresh tasks
        const outstanding = await getTasks('outstanding');
        const completed = await getTasks('completed');
        setOutstandingTasks(outstanding);
        setCompletedTasks(completed);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Helper function to format status for display
  const formatStatus = (status) => {
    switch (status) {
      case 'UNAPPROVED': return 'Unapproved';
      case 'NOT_STARTED': return 'Not Started';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      default: return status;
    }
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'UNAPPROVED': return '#6c757d';
      case 'NOT_STARTED': return '#007bff';
      case 'IN_PROGRESS': return '#fd7e14';
      case 'COMPLETED': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 32 }}>
      <h2>Outstanding Tasks</h2>
      <table style={{ width: '100%', marginBottom: 32, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f5f6fa' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Task</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Assigned To</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Due</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Motion</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Action</th>
          </tr>
          {/* Filter Row */}
          <tr>
            <th><input value={outstandingFilters.action} onChange={e => setOutstandingFilters(f => ({ ...f, action: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
            <th><input value={outstandingFilters.person} onChange={e => setOutstandingFilters(f => ({ ...f, person: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
            <th style={{ position: 'relative' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <input value={outstandingFilters.due.from && outstandingFilters.due.to ? `${outstandingFilters.due.from} to ${outstandingFilters.due.to}` : ''} readOnly placeholder="Filter..." style={{ width: '70%' }} />
                <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setOutstandingFilters(f => ({ ...f, due: { ...f.due, show: !f.due.show } }))} title="Filter by date">📅</span>
              </span>
              {outstandingFilters.due.show && (
                <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: 10, zIndex: 20, marginTop: 4 }}>
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 13 }}>From: <input type="date" value={outstandingFilters.due.from} onChange={e => setOutstandingFilters(f => ({ ...f, due: { ...f.due, from: e.target.value } }))} /></label>
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>To: <input type="date" value={outstandingFilters.due.to} onChange={e => setOutstandingFilters(f => ({ ...f, due: { ...f.due, to: e.target.value } }))} /></label>
                  </div>
                  <button style={{ marginTop: 6, fontSize: 13 }} onClick={() => setOutstandingFilters(f => ({ ...f, due: { ...f.due, show: false } }))}>OK</button>
                </div>
              )}
            </th>
            <th><input value={outstandingFilters.motionTitle} onChange={e => setOutstandingFilters(f => ({ ...f, motionTitle: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
            <th>
              <select value={outstandingFilters.status} onChange={e => setOutstandingFilters(f => ({ ...f, status: e.target.value }))} style={{ width: '90%' }}>
                <option value="">All</option>
                <option value="UNAPPROVED">Unapproved</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
              </select>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredOutstanding.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No outstanding tasks.</td></tr>
          )}
          {filteredOutstanding.map((task, idx) => (
            <tr key={task.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{task.action}</td>
              <td style={{ padding: 8 }}>{task.username || task.person}</td>
              <td style={{ padding: 8 }}>{task.due}</td>
              <td style={{ padding: 8 }}>{task.motionTitle}</td>
              <td style={{ padding: 8 }}>
                <select 
                  value={task.status || 'UNAPPROVED'} 
                  onChange={e => handleStatusChange(task.id, e.target.value)}
                  style={{ 
                    color: getStatusColor(task.status), 
                    fontWeight: 'bold',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    padding: 4
                  }}
                >
                  <option value="UNAPPROVED">Unapproved</option>
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </td>
              <td style={{ padding: 8 }}>
                {task.status !== 'COMPLETED' && (
                  <button onClick={() => handleCompleteTask(idx)} style={{ color: 'green', fontWeight: 'bold', border: 'none', background: 'none', cursor: 'pointer' }}>Mark Completed</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Completed Tasks</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f5f6fa' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Task</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Assigned To</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Due</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Motion</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Date Completed</th>
          </tr>
          {/* Filter Row */}
          <tr>
            <th><input value={completedFilters.action} onChange={e => setCompletedFilters(f => ({ ...f, action: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
            <th><input value={completedFilters.person} onChange={e => setCompletedFilters(f => ({ ...f, person: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
            <th style={{ position: 'relative' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <input value={completedFilters.due.from && completedFilters.due.to ? `${completedFilters.due.from} to ${completedFilters.due.to}` : ''} readOnly placeholder="Filter..." style={{ width: '70%' }} />
                <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setCompletedFilters(f => ({ ...f, due: { ...f.due, show: !f.due.show } }))} title="Filter by date">📅</span>
              </span>
              {completedFilters.due.show && (
                <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: 10, zIndex: 20, marginTop: 4 }}>
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 13 }}>From: <input type="date" value={completedFilters.due.from} onChange={e => setCompletedFilters(f => ({ ...f, due: { ...f.due, from: e.target.value } }))} /></label>
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>To: <input type="date" value={completedFilters.due.to} onChange={e => setCompletedFilters(f => ({ ...f, due: { ...f.due, to: e.target.value } }))} /></label>
                  </div>
                  <button style={{ marginTop: 6, fontSize: 13 }} onClick={() => setCompletedFilters(f => ({ ...f, due: { ...f.due, show: false } }))}>OK</button>
                </div>
              )}
            </th>
            <th><input value={completedFilters.motionTitle} onChange={e => setCompletedFilters(f => ({ ...f, motionTitle: e.target.value }))} placeholder="Filter..." style={{ width: '90%' }} /></th>
            <th style={{ position: 'relative' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <input value={completedFilters.dateCompleted.from && completedFilters.dateCompleted.to ? `${completedFilters.dateCompleted.from} to ${completedFilters.dateCompleted.to}` : ''} readOnly placeholder="Filter..." style={{ width: '70%' }} />
                <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setCompletedFilters(f => ({ ...f, dateCompleted: { ...f.dateCompleted, show: !f.dateCompleted.show } }))} title="Filter by date">📅</span>
              </span>
              {completedFilters.dateCompleted.show && (
                <div style={{ position: 'absolute', background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: 10, zIndex: 20, marginTop: 4 }}>
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 13 }}>From: <input type="date" value={completedFilters.dateCompleted.from} onChange={e => setCompletedFilters(f => ({ ...f, dateCompleted: { ...f.dateCompleted, from: e.target.value } }))} /></label>
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>To: <input type="date" value={completedFilters.dateCompleted.to} onChange={e => setCompletedFilters(f => ({ ...f, dateCompleted: { ...f.dateCompleted, to: e.target.value } }))} /></label>
                  </div>
                  <button style={{ marginTop: 6, fontSize: 13 }} onClick={() => setCompletedFilters(f => ({ ...f, dateCompleted: { ...f.dateCompleted, show: false } }))}>OK</button>
                </div>
              )}
            </th>
      {/* Mark Completed Popup */}
      {showCompletePopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ position: 'relative', background: '#fff', borderRadius: '10px', padding: '32px 24px 24px 24px', minWidth: '320px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            <button onClick={() => setShowCompletePopup(false)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }} title="Close">×</button>
            <h3 style={{ marginTop: 0, marginBottom: '18px', color: '#007bff' }}>Complete Task</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: 'bold' }}>Comment:</label>
              <textarea value={completeComment} onChange={e => setCompleteComment(e.target.value)} style={{ width: '100%', minHeight: 60, marginTop: 4 }} placeholder="Add a comment..." />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 'bold' }}>Date Completed:</label>
              <input type="date" value={completeDate} onChange={e => setCompleteDate(e.target.value)} style={{ marginLeft: 8 }} />
            </div>
            <button onClick={handleSubmitComplete} style={{ background: '#28a745', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '4px', padding: '10px 24px', fontSize: '16px', cursor: 'pointer' }}>Submit</button>
          </div>
        </div>
      )}
          </tr>
        </thead>
        <tbody>
          {filteredCompleted.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>No completed tasks.</td></tr>
          )}
          {filteredCompleted.map((task, idx) => (
            <tr key={task.id || idx} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{task.action}</td>
              <td style={{ padding: 8 }}>{task.username || task.person}</td>
              <td style={{ padding: 8 }}>{task.due}</td>
              <td style={{ padding: 8 }}>{task.motionTitle}</td>
              <td style={{ padding: 8 }}>{task.dateCompleted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TasksPage;

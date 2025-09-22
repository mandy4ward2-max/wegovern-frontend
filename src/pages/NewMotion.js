import React, { useState, useRef, useEffect } from 'react';
import draftToHtml from 'draftjs-to-html';
import { useMotions } from '../MotionsContext';
import { useNavigate } from 'react-router-dom';
import { Editor, EditorState, RichUtils, convertToRaw } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { getUserProfile } from '../api.settings';

function NewMotion() {
  const [attachments, setAttachments] = useState([]);
  const { outstandingMotions, setOutstandingMotions } = useMotions();
  const [title, setTitle] = useState("");
  const [motion, setMotion] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [issues, setIssues] = useState([]);
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  // Fetch user and org info on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const userData = await getUserProfile();
        setUser(userData && !userData.error ? userData : null);
      } catch (e) {
        setUser(null);
        alert('Failed to load user profile.');
      }
      // Fetch org info using JWT
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api'}/orgs/organization`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch organization');
        }
        const orgData = await res.json();
        setOrg(orgData && !orgData.error ? orgData : null);
        
        // If we have an org, fetch its issues
        if (orgData && orgData.id) {
          try {
            const issuesRes = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api'}/orgs/${orgData.id}/issues`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (issuesRes.ok) {
              const issuesData = await issuesRes.json();
              setIssues(Array.isArray(issuesData) ? issuesData : []);
            }
          } catch (e) {
            console.error('Failed to fetch issues:', e);
            setIssues([]);
          }
        }
      } catch (e) {
        setOrg(null);
        setIssues([]);
        alert('Failed to load organization info.');
      }
    }
    fetchData();
  }, []);
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [showPopup, setShowPopup] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [attachmentDesc, setAttachmentDesc] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskEdit, setTaskEdit] = useState(null); // {idx, action, person, due}
  const [newTask, setNewTask] = useState({ action: '', person: '', due: '' });
  const fileInputRef = useRef();
  const navigate = useNavigate();
  // Users for task assignment dropdown
  const [orgUsers, setOrgUsers] = useState([]);
  useEffect(() => {
    async function fetchOrgUsers() {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api'}/users/org/all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
        if (res.ok) {
          const users = await res.json();
          setOrgUsers(Array.isArray(users) ? users : []);
        } else {
          setOrgUsers([]);
        }
      } catch (e) {
        setOrgUsers([]);
      }
    }
    fetchOrgUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
  const content = editorState.getCurrentContent();
  const rawContent = convertToRaw(content);
  const html = draftToHtml(rawContent);
    const token = localStorage.getItem('token');
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';
    const postUrl = `${apiBaseUrl}/motions`;
    if (!user || !org || !org.id) {
      alert('User or organization info not loaded.');
      return;
    }
    if (!token) {
      alert('No token provided. Please log in again.');
      return;
    }
    const payload = {
      title,
      motion: motion,
      orgId: org.id,
      status: 'pending', // or use another appropriate default/status value
      createdBy: user.id,
      description: html,
      issueId: selectedIssueId ? Number(selectedIssueId) : null,
      tasks: [],
      attachments: []
    };
    try {
      let res;
      try {
        res = await fetch(postUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } catch (fetchErr) {
        alert([
          'Network error: Could not reach backend.',
          `POST URL: ${postUrl}`,
          `Payload: ${JSON.stringify(payload, null, 2)}`,
          `Error: ${fetchErr && fetchErr.message}`
        ].filter(Boolean).join('\n'));
        return;
      }
      if (!res.ok) {
        let errData = {};
        let errText = '';
        try {
          errData = await res.json();
        } catch (jsonErr) {
          try {
            errText = await res.text();
          } catch (textErr) {
            errText = '[No response body]';
          }
        }
        const errorMsg = [
          'Failed to create motion.',
          `Status: ${res.status} ${res.statusText}`,
          `POST URL: ${postUrl}`,
          `Payload: ${JSON.stringify(payload, null, 2)}`,
          errData.message ? `Error: ${errData.message}` : '',
          errText && !errData.message ? `Raw response: ${errText}` : ''
        ].filter(Boolean).join('\n');
        alert(errorMsg);
        return;
      }
      const data = await res.json();
      if (data && !data.error && data.id) {
        // Post each task to /api/tasks
        const userId = user && user.id;
        const orgId = org && org.id;
        for (const task of tasks) {
          try {
            await fetch(`${apiBaseUrl}/tasks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                motionId: data.id,
                action: task.action,
                person: orgUsers.find(u => String(u.id) === String(task.person))?.fullName || '',
                userId: Number(task.person),
                due: task.due ? new Date(task.due).toISOString() : undefined
              })
            });
          } catch (err) {
            // Optionally handle task post error
          }
        }

        // Upload all attachments with the new motion ID
        for (const att of attachments) {
          const formData = new FormData();
          formData.append('file', att.file);
          formData.append('desc', att.desc);
          try {
            await fetch(`${apiBaseUrl}/attachments/upload/${data.id}`, {
              method: 'POST',
              body: formData,
              credentials: 'include',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (err) {
            alert('Failed to upload one or more attachments.');
            // Optionally: break or continue
          }
        }
        navigate('/motions');
      } else {
        alert([
          'Failed to create motion.',
          data && data.message ? `Error: ${data.message}` : '',
          `POST URL: ${postUrl}`,
          `Payload: ${JSON.stringify(payload, null, 2)}`
        ].filter(Boolean).join('\n'));
      }
    } catch (err) {
      alert([
        'Failed to create motion (unexpected error).',
        err && err.message ? `Error: ${err.message}` : '',
        `POST URL: ${postUrl}`,
        `Payload: ${JSON.stringify(payload, null, 2)}`
      ].filter(Boolean).join('\n'));
    }
  };

  // Upload attachment to backend and store returned attachment object
  const handleAttach = async (e) => {
  e.preventDefault();
  if (!attachmentFile) return;
  // Store file and description in local state only
  const newAttachments = [...attachments, { file: attachmentFile, desc: attachmentDesc }];
  setAttachments(newAttachments);
  setAttachmentDesc("");
  setAttachmentFile(null);
  if (fileInputRef.current) fileInputRef.current.value = "";
    setDragActive(false);
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAttachmentFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
      <div style={{ position: 'relative', padding: '32px', maxWidth: '600px', width: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Attachment icon (paper clip) */}
        <button onClick={() => setShowPopup(true)} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', cursor: 'pointer' }} title="Add Attachment">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.5 6.5L8.207 14.793a3 3 0 1 0 4.243 4.243l7.071-7.071a5 5 0 0 0-7.071-7.071l-9.192 9.192a7 7 0 0 0 9.899 9.899l7.071-7.071" stroke="#007bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 style={{ textAlign: 'center', width: '100%' }}>Create New Motion</h2>
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '16px', width: '100%' }}>
            <label>Motion Title:</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
          </div>
          <div style={{ marginBottom: '16px', width: '100%' }}>
            <label>Motion:</label>
            <input type="text" value={motion} onChange={e => setMotion(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
          </div>
          <div style={{ marginBottom: '16px', width: '100%' }}>
            <label>Related Issue (optional):</label>
            <select 
              value={selectedIssueId} 
              onChange={e => setSelectedIssueId(e.target.value)} 
              style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">Select an issue (optional)</option>
              {issues.map(issue => (
                <option key={issue.id} value={issue.id}>
                  {issue.title} - {issue.status} ({issue.priority})
                </option>
              ))}
            </select>
            {issues.length === 0 && (
              <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                No issues available for this organization.
              </small>
            )}
          </div>
          <div style={{ marginBottom: '16px', width: '100%' }}>
            <label>Description:</label>
            <div style={{ border: '1px solid #ccc', borderRadius: '4px', minHeight: '100px', padding: '8px', background: '#fafbfc' }}>
              <Editor
                editorState={editorState}
                onChange={setEditorState}
                placeholder="Enter rich text description"
                handleKeyCommand={command => {
                  const newState = RichUtils.handleKeyCommand(editorState, command);
                  if (newState) {
                    setEditorState(newState);
                    return 'handled';
                  }
                  return 'not-handled';
                }}
              />
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setEditorState(RichUtils.toggleInlineStyle(editorState, 'BOLD'))} style={{ fontWeight: 'bold', padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}>B</button>
              <button type="button" onClick={() => setEditorState(RichUtils.toggleInlineStyle(editorState, 'ITALIC'))} style={{ fontStyle: 'italic', padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}>I</button>
              <button type="button" onClick={() => setEditorState(RichUtils.toggleInlineStyle(editorState, 'UNDERLINE'))} style={{ textDecoration: 'underline', padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}>U</button>
            </div>
          </div>
          {/* Tasks Section */}
          <div style={{ width: '100%', margin: '24px 0', background: '#f5f6fa', borderRadius: 8, padding: '18px 18px 12px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: '#1976d2' }}>Tasks</h4>
              <button type="button" onClick={() => setTaskEdit({ idx: null, ...newTask })} style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>Add Task</button>
            </div>
            <div style={{ width: '100%' }}>
              {tasks.length === 0 && (
                <div style={{ color: '#888', textAlign: 'center', padding: 12 }}>No tasks added.</div>
              )}
              {tasks.map((task, idx) => (
                <div key={idx} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', background: idx % 2 === 0 ? '#fff' : '#f5f6fa', borderRadius: 6, marginBottom: 6, padding: '8px 0' }}>
                  <div style={{ flex: 2, minWidth: 120, padding: '0 8px' }}>{task.action}</div>
                  <div style={{ flex: 1, minWidth: 100, padding: '0 8px' }}>{task.person}</div>
                  <div style={{ flex: 1, minWidth: 110, padding: '0 8px' }}>{task.due}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
                    <button type="button" onClick={() => setTaskEdit({ idx, ...task })} style={{ background: 'none', border: 'none', color: '#1976d2', fontSize: 18, cursor: 'pointer' }} title="Edit">✎</button>
                    <button type="button" onClick={() => setTasks(ts => ts.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: 18, cursor: 'pointer' }} title="Delete">🗑</button>
                  </div>
                </div>
              ))}
            </div>
            {/* Task Add/Edit Popup */}
            {taskEdit && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                <div style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 320, boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
                  <h4 style={{ marginTop: 0, color: '#1976d2' }}>{taskEdit.idx === null ? 'Add Task' : 'Edit Task'}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <label>Action
                      <input type="text" value={taskEdit.action} onChange={e => setTaskEdit(te => ({ ...te, action: e.target.value }))} required style={{ width: '100%', padding: 8, marginTop: 4 }} />
                    </label>
                    <label>Assignee
                      <select value={taskEdit.person} onChange={e => setTaskEdit(te => ({ ...te, person: e.target.value }))} required style={{ width: '100%', padding: 8, marginTop: 4 }}>
                        <option value="">Select person...</option>
                        {orgUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.fullName}</option>
                        ))}
                      </select>
                    </label>
                    <label>Due Date
                      <input type="date" value={taskEdit.due} onChange={e => setTaskEdit(te => ({ ...te, due: e.target.value }))} required style={{ width: '100%', padding: 8, marginTop: 4 }} />
                    </label>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <button type="button" style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 24px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}
                        onClick={() => {
                          if (!taskEdit.action || !taskEdit.person || !taskEdit.due) return;
                          if (taskEdit.idx === null) {
                            setTasks(ts => {
                              const updated = [...ts, { action: taskEdit.action, person: taskEdit.person, due: taskEdit.due }];
                              setTimeout(() => setTaskEdit(null), 0);
                              return updated;
                            });
                          } else {
                            setTasks(ts => {
                              const updated = ts.map((t, i) => i === taskEdit.idx ? { action: taskEdit.action, person: taskEdit.person, due: taskEdit.due } : t);
                              setTimeout(() => setTaskEdit(null), 0);
                              return updated;
                            });
                          }
                        }}
                      >Save</button>
                      <button type="button" onClick={() => setTaskEdit(null)} style={{ background: '#ccc', color: '#333', border: 'none', borderRadius: 4, padding: '8px 24px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Submit/Cancel Buttons */}
          <div style={{ display: 'flex', width: '100%', gap: '12px', marginTop: '8px' }}>
            <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#007bff', color: '#fff', border:'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '16px' }}>
              Submit
            </button>
            <button
              type="button"
              style={{ flex: 1, padding: '10px', backgroundColor: '#ccc', color: '#333', border:'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '16px' }}
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </button>
        {/* Cancel Confirmation Popup */}
        {showCancelConfirm && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ background: '#fff', borderRadius: '10px', padding: '32px 24px 24px 24px', minWidth: '320px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', textAlign: 'center' }}>
              <h3 style={{ marginTop: 0, marginBottom: '18px', color: '#dc3545' }}>Cancel Motion?</h3>
              <p style={{ marginBottom: '24px' }}>Are you sure you want to cancel? All unsaved changes will be lost.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '18px' }}>
                <button onClick={() => { setShowCancelConfirm(false); navigate('/motions'); }} style={{ padding: '10px 24px', backgroundColor: '#dc3545', color: '#fff', border:'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '16px' }}>Yes</button>
                <button onClick={() => setShowCancelConfirm(false)} style={{ padding: '10px 24px', backgroundColor: '#ccc', color: '#333', border:'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '16px' }}>No</button>
              </div>
            </div>
          </div>
        )}
          </div>
        </form>
        {/* Attachment List */}
        <div style={{ width: '100%', marginTop: '32px' }}>
          <h4>Attachments</h4>
          {attachments.length === 0 && <p style={{ color: '#888' }}>No attachments added.</p>}
          <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
            {attachments.map((att, idx) => (
              <li key={idx} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '12px', color: '#007bff' }}>📎</span>
                <span style={{ marginRight: '8px' }}>{att.desc}</span>
                <span style={{ color: '#888', fontSize: '13px' }}>{att.file?.name}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Attachment Popup */}
        {showPopup && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ position: 'relative', background: '#fff', borderRadius: '10px', padding: '32px 24px 24px 24px', minWidth: '320px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
              {/* X close */}
              <button onClick={() => setShowPopup(false)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }} title="Close">×</button>
              <h3 style={{ marginTop: 0, marginBottom: '18px', color: '#007bff' }}>Add Attachment</h3>
              <form onSubmit={handleAttach} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label>Description:</label>
                  <input type="text" value={attachmentDesc} onChange={e => setAttachmentDesc(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                </div>
                <div>
                  <label>File:</label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    style={{
                      border: dragActive ? '2px solid #007bff' : '2px dashed #bbb',
                      borderRadius: 8,
                      padding: '24px 12px',
                      textAlign: 'center',
                      background: dragActive ? '#eaf2ff' : '#fafbfc',
                      marginTop: 8,
                      marginBottom: 8,
                      position: 'relative',
                      transition: 'border 0.2s, background 0.2s',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      style={{ display: 'none' }}
                      onChange={e => setAttachmentFile(e.target.files[0])}
                      id="file-upload-input"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 8 }}
                    >
                      Choose file
                    </button>
                    <div style={{ color: '#888', margin: '8px 0' }}>or drag'n'drop here</div>
                    <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
                      File size upload limit: {attachmentFile ? (attachmentFile.size / 1024 / 1024).toFixed(2) : '0.00'} / 50 MB
                    </div>
                    {attachmentFile && (
                      <div style={{ color: '#007bff', marginTop: 8, fontSize: 14 }}>{attachmentFile.name}</div>
                    )}
                  </div>
                </div>
                <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: '#fff', border:'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '16px', marginTop: '8px' }}>
                  Attach
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewMotion;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getUserProfile,
  updateUserProfile,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationUsers,
  updateUserRole,
  deleteUser
} from '../api.settings';

function Settings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [users, setUsers] = useState([]);
  const [showDeleteOrg, setShowDeleteOrg] = useState(false);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showSSOPopup, setShowSSOPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [pendingRoleChanges, setPendingRoleChanges] = useState({});
  const ssoOptions = ['Google', 'Facebook', 'Microsoft'];

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const [userData, orgData, orgUsers] = await Promise.all([
          getUserProfile(),
          getOrganization(),
          getOrganizationUsers()
        ]);
        // Check for error responses from API fallbacks
        if (userData?.error || orgData?.error) {
          setError('Failed to load settings from server.');
          setUser(null);
          setOrg(null);
          setUsers([]);
        } else {
          setUser(userData);
          setOrg(orgData);
          setUsers(Array.isArray(orgUsers) ? orgUsers : []);
        }
      } catch (err) {
        setError('Failed to load settings.');
        setUser(null);
        setOrg(null);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // User Settings handlers
  const handleUserChange = (field, value) => setUser(u => ({ ...u, [field]: value }));
  const handleUserSave = async () => {
    setLoading(true);
    setError(null);
    
    // Basic validation
    if (!user.firstName?.trim() || !user.lastName?.trim() || !user.email?.trim()) {
      setError('First Name, Last Name, and Email are required.');
      setLoading(false);
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }
    
    try {
      const result = await updateUserProfile(user);
      if (result.error) {
        setError(`Failed to update user profile: ${result.message || 'Unknown error'}`);
      } else {
        // Update the local user state with the response from server
        setUser(result);
        // Show success message briefly
        setError(null);
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to update user profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  // SSO change handler
  const handleSSOChange = provider => {
    setUser(u => ({ ...u, ssoProvider: provider }));
    setShowSSOPopup(false);
  };
  // Org Settings handlers
  const handleOrgChange = (field, value) => setOrg(o => ({ ...o, [field]: value }));
  const handleOrgSave = async () => {
    setLoading(true);
    setError(null);
    
    // Basic validation for organization
    if (!org.name?.trim()) {
      setError('Organization name is required.');
      setLoading(false);
      return;
    }
    
    if (org.majorityVoteNumber && org.majorityVoteNumber < 1) {
      setError('Majority vote number must be at least 1.');
      setLoading(false);
      return;
    }
    
    try {
      const result = await updateOrganization(org);
      if (result.error) {
        setError(`Failed to update organization: ${result.message || 'Unknown error'}`);
      } else {
        // Update the local org state with the response from server
        setOrg(result);
        setError(null);
        setSuccessMessage('Organization updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to update organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteOrg = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await deleteOrganization(org.id);
      if (result.error) {
        setError(`Failed to delete organization: ${result.message || 'Unknown error'}`);
      } else {
        setShowDeleteOrg(false);
        setSuccessMessage('Organization deleted successfully! Redirecting...');
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err) {
      setError('Failed to delete organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  // Security Settings handlers
  const handleRoleChange = (id, role) => {
    setPendingRoleChanges(prev => ({ ...prev, [id]: role }));
  };
  
  const handleSaveRole = async (id) => {
    const newRole = pendingRoleChanges[id];
    if (!newRole) return;
    
    setLoading(true);
    try {
      await updateUserRole(id, newRole);
      setUsers(us => us.map(u => u.id === id ? { ...u, role: newRole } : u));
      setPendingRoleChanges(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      setSuccessMessage('User role updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update user role.');
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteUser = async id => {
    setUserToDelete(id);
    setShowDeleteUserConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setLoading(true);
    setShowDeleteUserConfirm(false);
    try {
      await deleteUser(userToDelete);
      // Update the user's role to "Deleted" in the frontend
      setUsers(us => us.map(u => u.id === userToDelete ? { ...u, role: 'Deleted' } : u));
      setSuccessMessage('User has been deleted successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to delete user.');
    } finally {
      setLoading(false);
      setUserToDelete(null);
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteUserConfirm(false);
    setUserToDelete(null);
  };

  // Only SuperUser and Owner can see org/security tabs
  const isAdmin = user && (user.role === 'SuperUser' || user.role === 'Owner');

  // SSO icon button for popup
  const SSOIconButton = ({ provider, onClick }) => {
    const icon = {
      Google: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g>
            <path d="M21.805 10.023h-9.765v3.977h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.227s2.75-6.227 6.125-6.227c1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.703-1.57-3.906-2.523-6.656-2.523-5.523 0-10 4.477-10 10s4.477 10 10 10c5.75 0 9.547-4.023 9.547-9.695 0-.652-.07-1.148-.156-1.593z" fill="#4285F4"/>
            <path d="M3.153 7.345l3.289 2.412c.898-1.789 2.617-2.977 4.598-2.977 1.125 0 2.125.391 2.914 1.031l2.766-2.695c-1.703-1.57-3.906-2.523-6.656-2.523-3.984 0-7.344 2.672-8.672 6.252z" fill="#34A853"/>
            <path d="M12 22c2.672 0 4.922-.883 6.563-2.406l-3.047-2.492c-.844.57-1.922.914-3.516.914-2.844 0-5.258-1.914-6.125-4.477l-3.289 2.543c1.617 3.523 5.406 5.918 9.414 5.918z" fill="#FBBC05"/>
            <path d="M21.805 10.023h-9.765v3.977h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.227s2.75-6.227 6.125-6.227c1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.703-1.57-3.906-2.523-6.656-2.523-5.523 0-10 4.477-10 10s4.477 10 10 10c5.75 0 9.547-4.023 9.547-9.695 0-.652-.07-1.148-.156-1.593z" fill="#EA4335" fillOpacity=".7"/>
          </g>
        </svg>
      ),
      Facebook: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0" fill="#1877f3"/>
        </svg>
      ),
      Microsoft: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="9" height="9" fill="#F35325"/>
          <rect x="13" y="2" width="9" height="9" fill="#81BC06"/>
          <rect x="2" y="13" width="9" height="9" fill="#05A6F0"/>
          <rect x="13" y="13" width="9" height="9" fill="#FFBA08"/>
        </svg>
      ),
    };
    return (
      <button type="button" title={`Connect with ${provider}`} onClick={onClick} style={{
        width: 44, height: 44, background: '#fff', border: '1px solid #ddd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, cursor: 'pointer', margin: 8
      }}>{icon[provider]}</button>
    );
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', fontSize: 20 }}>Loading settings...</div>;
  }
  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red', fontSize: 18 }}>{error}<br/><span style={{ color: '#888', fontSize: 14 }}>Please check your connection or try again later.</span></div>;
  }
  if (!user || !org) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 18 }}>No settings data found.<br/>Please ensure your backend is running and accessible.</div>;
  }

  return (
    <div style={{ position: 'relative', maxWidth: 900, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 32 }}>
      {/* X button to close settings */}
      <button onClick={() => navigate('/motions')} title="Close Settings" style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', color: '#888', fontSize: 28, fontWeight: 'bold', cursor: 'pointer', zIndex: 10, lineHeight: 1 }}>×</button>
        <h2 style={{ marginBottom: 24 }}>Settings</h2>
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <button onClick={() => setTab('profile')} style={{ padding: '10px 24px', borderRadius: 6, border: tab === 'profile' ? '2px solid #007bff' : '1px solid #ccc', background: tab === 'profile' ? '#eaf2ff' : '#fff', color: tab === 'profile' ? '#007bff' : '#333', fontWeight: tab === 'profile' ? 'bold' : 'normal', cursor: 'pointer' }}>Profile Settings</button>
          {isAdmin && <button onClick={() => setTab('org')} style={{ padding: '10px 24px', borderRadius: 6, border: tab === 'org' ? '2px solid #007bff' : '1px solid #ccc', background: tab === 'org' ? '#eaf2ff' : '#fff', color: tab === 'org' ? '#007bff' : '#333', fontWeight: tab === 'org' ? 'bold' : 'normal', cursor: 'pointer' }}>Organization Settings</button>}
          {isAdmin && <button onClick={() => setTab('security')} style={{ padding: '10px 24px', borderRadius: 6, border: tab === 'security' ? '2px solid #007bff' : '1px solid #ccc', background: tab === 'security' ? '#eaf2ff' : '#fff', color: tab === 'security' ? '#007bff' : '#333', fontWeight: tab === 'security' ? 'bold' : 'normal', cursor: 'pointer' }}>Security Settings</button>}
        </div>
        {/* Tab Content */}
        <div style={{ width: '100%' }}>
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <h3>Profile Settings</h3>
              {successMessage && (
                <div style={{ marginBottom: 16, padding: '12px 16px', background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: 4, fontSize: 14 }}>
                  {successMessage}
                </div>
              )}
              <form style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, width: '100%', alignItems: 'center', margin: '0 auto' }} onSubmit={e => { e.preventDefault(); handleUserSave(); }}>
                <label style={{ width: '100%' }}>First Name
                  <input type="text" value={user.firstName || ''} onChange={e => handleUserChange('firstName', e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                </label>
                <label style={{ width: '100%' }}>Last Name
                  <input type="text" value={user.lastName || ''} onChange={e => handleUserChange('lastName', e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                </label>
                <label style={{ width: '100%' }}>Email
                  <input type="email" value={user.email || ''} onChange={e => handleUserChange('email', e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                </label>
                <label style={{ width: '100%' }}>SSO Provider
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                    <input type="text" value={user.ssoProvider || 'None'} readOnly style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 4, background: '#f9f9f9' }} />
                    <button type="button" onClick={() => setShowSSOPopup(true)} style={{ marginLeft: 8, padding: '8px 12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Change</button>
                  </div>
                </label>
                <button type="submit" disabled={loading} style={{ marginTop: 12, background: loading ? '#6c757d' : '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 0', fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
              
              {/* SSO Selection Popup */}
              {showSSOPopup && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', maxWidth: 350, textAlign: 'center' }}>
                    <h4>Choose SSO Provider</h4>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                      {ssoOptions.map(provider => (
                        <SSOIconButton key={provider} provider={provider} onClick={() => handleSSOChange(provider)} />
                      ))}
                    </div>
                    <button onClick={() => setShowSSOPopup(false)} style={{ marginTop: 16, background: '#ccc', color: '#333', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'org' && isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <h3>Organization Settings</h3>
              {successMessage && (
                <div style={{ marginBottom: 16, padding: '12px 16px', background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: 4, fontSize: 14 }}>
                  {successMessage}
                </div>
              )}
              <form style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, width: '100%', alignItems: 'center', margin: '0 auto' }} onSubmit={e => { e.preventDefault(); handleOrgSave(); }}>
                <label style={{ width: '100%' }}>Organization Name
                  <input type="text" value={org.name || ''} onChange={e => handleOrgChange('name', e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                </label>
                <label style={{ width: '100%' }}>Owner
                  <select value={org.ownerUserId || ''} onChange={e => handleOrgChange('ownerUserId', Number(e.target.value))} style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 4 }}>
                    <option value="">Select owner...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                    ))}
                  </select>
                </label>
                <label style={{ width: '100%' }}>Majority Vote Number
                  <input type="number" min={1} value={org.majorityVoteNumber || 1} onChange={e => handleOrgChange('majorityVoteNumber', Number(e.target.value))} style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 4 }} />
                </label>
                <button type="submit" disabled={loading} style={{ marginTop: 12, background: loading ? '#6c757d' : '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 0', fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
              <div style={{ marginTop: 32, textAlign: 'center' }}>
                <button type="button" onClick={() => setShowDeleteOrg(true)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '12px 24px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>Delete Organization</button>
                {showDeleteOrg && (
                  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', maxWidth: 350, textAlign: 'center' }}>
                      <h4 style={{ color: '#e74c3c' }}>Delete Organization?</h4>
                      <p>This action is <b>permanent</b> and will soft delete your organization. You can recover it within 30 days.</p>
                      <p>Are you really sure?</p>
                      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
                        <button onClick={handleDeleteOrg} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Yes, Delete</button>
                        <button onClick={() => setShowDeleteOrg(false)} style={{ background: '#ccc', color: '#333', border: 'none', borderRadius: 4, padding: '8px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === 'security' && isAdmin && (
            <div>
              <h3>Security Settings</h3>
              {successMessage && (
                <div style={{ marginBottom: 16, padding: '12px 16px', background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: 4, fontSize: 14 }}>
                  {successMessage}
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                <thead>
                  <tr style={{ background: '#f5f6fa' }}>
                    <th style={{ padding: 8, borderBottom: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: 8, borderBottom: '1px solid #ddd', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: 8, borderBottom: '1px solid #ddd', textAlign: 'center' }}>Role</th>
                    <th style={{ padding: 8, borderBottom: '1px solid #ddd', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{u.firstName} {u.lastName}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{u.email}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <select
                            value={pendingRoleChanges[u.id] || u.role || 'Member'}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }}
                          >
                            <option value="Member">Member</option>
                            <option value="Board">Board</option>
                            <option value="SuperUser">SuperUser</option>
                            <option value="Owner">Owner</option>
                          </select>
                          <button 
                            onClick={() => handleSaveRole(u.id)} 
                            title="Save role change"
                            style={{ 
                              background: '#fff', 
                              border: `2px solid ${(pendingRoleChanges[u.id] && pendingRoleChanges[u.id] !== u.role) ? '#28a745' : '#007bff'}`, 
                              color: (pendingRoleChanges[u.id] && pendingRoleChanges[u.id] !== u.role) ? '#28a745' : '#007bff', 
                              borderRadius: 4,
                              padding: '4px 8px',
                              fontSize: 14,
                              cursor: 'pointer',
                              opacity: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            💾
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'center' }}>
                        <button onClick={() => handleDeleteUser(u.id)} title="Delete user" style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: 20, cursor: 'pointer' }}>
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Delete User Confirmation Dialog */}
      {showDeleteUserConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Confirm User Deletion</h3>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>
              Are you sure you want to delete this user? This will revoke their access to the organization 
              but preserve their historical records for audit purposes.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={cancelDeleteUser}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  color: '#333',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteUser}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: '#e74c3c',
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getMeetingById, createMeeting, updateMeeting, getMotions, getOrgUsers, deleteMeeting } from '../api';
import AgendaBuilder from '../components/AgendaBuilder';

function MeetingDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = Boolean(id) && !location.pathname.includes('/new');
  
  const [loading, setLoading] = useState(isEdit);
  const [motions, setMotions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [orgUsers, setOrgUsers] = useState([]);
  const [showInviteesModal, setShowInviteesModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    agendaItems: [],
    invitees: []
  });

  // Helper function to format datetime for datetime-local input
  const formatDateTimeForInput = (dateTimeString) => {
    if (!dateTimeString) return '';
    
    const date = new Date(dateTimeString);
    // Get the local date and time components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Check if user can view meetings (Board, Owner, SuperUser)
  const canViewMeetings = () => {
    if (!currentUser) return false;
    const roles = Array.isArray(currentUser.role)
      ? currentUser.role
      : (typeof currentUser.role === 'string' ? [currentUser.role] : []);
    return roles.some(r =>
      typeof r === 'string' && ['owner', 'super_user', 'board'].includes(r.toLowerCase())
    );
  };

  // Check if user has permission to manage meetings (create, edit, delete) - only Owner and SuperUser
  const canManageMeetings = () => {
    if (!currentUser) return false;
    const roles = Array.isArray(currentUser.role)
      ? currentUser.role
      : (typeof currentUser.role === 'string' ? [currentUser.role] : []);
    return roles.some(r =>
      typeof r === 'string' && ['owner', 'super_user'].includes(r.toLowerCase())
    );
  };

  // Check if user has access to this page
  useEffect(() => {
    if (currentUser && !canViewMeetings()) {
      navigate('/');
    }
    // For new meetings, only managers can access
    if (currentUser && !isEdit && !canManageMeetings()) {
      navigate('/meetings');
    }
  }, [currentUser, navigate, isEdit]);

  // Fetch meeting data if editing
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        // Fetch motions for agenda item dropdown
        const motionsData = await getMotions();
        setMotions(Array.isArray(motionsData) ? motionsData : []);

        // Fetch organization users for invitees
        console.log('🔍 Fetching organization users...');
        const usersData = await getOrgUsers();
        console.log('👥 Received users data:', usersData);
        
        if (usersData && usersData.error) {
          console.error('❌ Error fetching users:', usersData.message);
          setOrgUsers([]);
        } else {
          setOrgUsers(Array.isArray(usersData) ? usersData : []);
        }

        if (isEdit) {
          setLoading(true);
          const meetingData = await getMeetingById(id);
          if (meetingData && !meetingData.error) {
            console.log('📅 Meeting data received:', meetingData);
            
            // Handle both new format (startDateTime/endDateTime) and old format (startDate/startTime)
            let startDateTime = '';
            let endDateTime = '';
            
            if (meetingData.startDateTime) {
              // New format: consolidated datetime
              startDateTime = formatDateTimeForInput(meetingData.startDateTime);
            } else if (meetingData.startDate && meetingData.startTime) {
              // Old format: separate date and time
              startDateTime = `${meetingData.startDate}T${meetingData.startTime}`;
            }
            
            if (meetingData.endDateTime) {
              // New format: consolidated datetime
              endDateTime = formatDateTimeForInput(meetingData.endDateTime);
            } else if (meetingData.endDate && meetingData.endTime) {
              // Old format: separate date and time
              endDateTime = `${meetingData.endDate}T${meetingData.endTime}`;
            }
            
            console.log('📅 Converted datetimes:', { startDateTime, endDateTime });
            
            // Extract invitee user IDs
            const inviteeIds = meetingData.invitees ? 
              meetingData.invitees.map(invite => invite.user.id) : [];

            setFormData({
              name: meetingData.name,
              description: meetingData.description || '',
              startDateTime,
              endDateTime,
              agendaItems: meetingData.agendaItems || [],
              invitees: inviteeIds
            });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, id, isEdit]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAgendaItemChange = (index, field, value) => {
    const newAgendaItems = [...formData.agendaItems];
    newAgendaItems[index] = {
      ...newAgendaItems[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      agendaItems: newAgendaItems
    }));
  };

  const addAgendaItem = () => {
    setFormData(prev => ({
      ...prev,
      agendaItems: [
        ...prev.agendaItems,
        {
          agendaItem: '',
          description: '',
          motionId: null,
          sortOrder: prev.agendaItems.length
        }
      ]
    }));
  };

  const removeAgendaItem = (index) => {
    setFormData(prev => ({
      ...prev,
      agendaItems: prev.agendaItems.filter((_, i) => i !== index)
    }));
  };

  const moveAgendaItem = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= formData.agendaItems.length) return;
    
    const newAgendaItems = [...formData.agendaItems];
    const [movedItem] = newAgendaItems.splice(fromIndex, 1);
    newAgendaItems.splice(toIndex, 0, movedItem);
    
    // Update sort orders
    newAgendaItems.forEach((item, index) => {
      item.sortOrder = index;
    });
    
    setFormData(prev => ({
      ...prev,
      agendaItems: newAgendaItems
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.startDateTime || !formData.endDateTime) {
      alert('Please fill in all required fields');
      return;
    }

    console.log('📤 Submitting meeting data:', formData);
    console.log('📤 Start DateTime:', formData.startDateTime, 'End DateTime:', formData.endDateTime);

    try {
      if (isEdit) {
        await updateMeeting(id, formData);
      } else {
        await createMeeting(formData);
      }
      navigate('/meetings');
    } catch (error) {
      console.error('Error saving meeting:', error);
      alert('Error saving meeting. Please try again.');
    }
  };

  const handleDeleteMeeting = async () => {
    if (!isEdit || !id) return;
    
    try {
      await deleteMeeting(id);
      navigate('/meetings');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Error deleting meeting. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f5f6fa', 
      padding: '20px'
    }}>
      {/* Header with Tabs */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        overflow: 'hidden'
      }}>
        {/* Top Header */}
        <div style={{ 
          padding: '20px 20px 0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e9ecef'
        }}>
          <h1 style={{ margin: 0, color: '#333', fontSize: '24px', fontWeight: 'bold' }}>
            Meeting Details
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate('/meetings')}
              style={{
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            {canManageMeetings() && isEdit && (
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Delete
              </button>
            )}
            {canManageMeetings() && (
              <button
                onClick={handleSubmit}
                style={{
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex',
          padding: '0 20px',
          background: '#f8f9fa'
        }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              background: activeTab === 'details' ? '#fff' : 'transparent',
              border: 'none',
              padding: '15px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'details' ? 'bold' : 'normal',
              color: activeTab === 'details' ? '#333' : '#666',
              borderBottom: activeTab === 'details' ? '3px solid #007bff' : '3px solid transparent',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px'
            }}
          >
            Meeting Details
          </button>
          <button
            onClick={() => setActiveTab('agenda')}
            style={{
              background: activeTab === 'agenda' ? '#fff' : 'transparent',
              border: 'none',
              padding: '15px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'agenda' ? 'bold' : 'normal',
              color: activeTab === 'agenda' ? '#333' : '#666',
              borderBottom: activeTab === 'agenda' ? '3px solid #007bff' : '3px solid transparent',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px'
            }}
          >
            Agenda
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <form onSubmit={handleSubmit}>
        {activeTab === 'details' && (
          <div style={{ 
            background: '#fff', 
            padding: '30px', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            {/* Meeting Title */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: '#333',
                fontSize: '14px'
              }}>
                Meeting Title
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                readOnly={!canManageMeetings()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  backgroundColor: canManageMeetings() ? '#f8f9fa' : '#e9ecef'
                }}
                placeholder="Q1 Meeting - Copy"
                required
              />
            </div>

            {/* Date and Time Row */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '20px',
              marginBottom: '25px'
            }}>
              {/* Start Date */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600', 
                  color: '#333',
                  fontSize: '14px'
                }}>
                  Start Date & Time
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="datetime-local"
                    value={formData.startDateTime}
                    onChange={(e) => handleInputChange('startDateTime', e.target.value)}
                    readOnly={!canManageMeetings()}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      backgroundColor: canManageMeetings() ? '#f8f9fa' : '#e9ecef'
                    }}
                    required
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600', 
                  color: '#333',
                  fontSize: '14px'
                }}>
                  End Date & Time
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="datetime-local"
                    value={formData.endDateTime}
                    onChange={(e) => handleInputChange('endDateTime', e.target.value)}
                    readOnly={!canManageMeetings()}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      backgroundColor: canManageMeetings() ? '#f8f9fa' : '#e9ecef'
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Meeting Description */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: '#333',
                fontSize: '14px'
              }}>
                Meeting Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                readOnly={!canManageMeetings()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '16px',
                  minHeight: '120px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  backgroundColor: canManageMeetings() ? '#f8f9fa' : '#e9ecef',
                  fontFamily: 'inherit'
                }}
                placeholder="Enter meeting description..."
              />
            </div>

            {/* Invitees Section */}
            <div style={{ marginBottom: '25px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '12px' 
              }}>
                <span style={{ 
                  fontWeight: '600', 
                  color: '#333',
                  fontSize: '14px',
                  marginRight: '10px'
                }}>
                  {formData.invitees.length} Invitees
                </span>
                {canManageMeetings() && (
                  <button
                    type="button"
                    onClick={() => setShowInviteesModal(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#6c757d',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>⚙️</span> Manage Invitees
                  </button>
                )}
              </div>
              
              {/* Avatar row */}
              <div style={{ 
                display: 'flex', 
                gap: '8px',
                alignItems: 'center'
              }}>
                {formData.invitees.length === 0 ? (
                  <span style={{ color: '#6c757d', fontSize: '14px' }}>
                    No invitees selected
                  </span>
                ) : (
                  formData.invitees.map((userId, index) => {
                    const user = orgUsers.find(u => u.id === userId);
                    if (!user) return null;
                    
                    const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();
                    
                    return (
                      <div
                        key={userId}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#1877f2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                        title={`${user.firstName} ${user.lastName}`}
                      >
                        {initials}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agenda' && (
          <div style={{ 
            background: '#fff', 
            padding: '30px', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <AgendaBuilder />
          </div>
        )}
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', color: '#333' }}>Delete Meeting</h2>
            <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
              Are you sure you want to delete "{formData.name}"? This action cannot be undone.
            </p>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  handleDeleteMeeting();
                }}
                style={{
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitees Management Modal */}
      {showInviteesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '600px',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Manage Invitees</h2>
              <button
                onClick={() => setShowInviteesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
                Select organization members to invite to this meeting:
              </p>
              
              <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                {orgUsers.map(user => {
                  const isSelected = formData.invitees.includes(user.id);
                  
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        const newInvitees = isSelected 
                          ? formData.invitees.filter(id => id !== user.id)
                          : [...formData.invitees, user.id];
                        
                        handleInputChange('invitees', newInvitees);
                      }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #dee2e6',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#e3f2fd' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#1877f2' : '#1877f2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '14px' }}>
                            {user.firstName} {user.lastName}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div style={{ color: '#2196f3', fontSize: '16px' }}>✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ color: '#666', fontSize: '14px' }}>
                {formData.invitees.length} selected
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowInviteesModal(false)}
                  style={{
                    background: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowInviteesModal(false)}
                  style={{
                    background: '#28a745',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetingDetail;
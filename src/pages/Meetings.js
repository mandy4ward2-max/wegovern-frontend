import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeetings } from '../api';

function Meetings() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch meetings
  useEffect(() => {
    const fetchMeetings = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        const data = await getMeetings();
        setMeetings(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching meetings:', error);
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [currentUser]);

  // Group meetings by month and year
  const groupedMeetings = meetings.reduce((acc, meeting) => {
    const startDate = new Date(meeting.startDateTime || meeting.startDate);
    const monthYear = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(meeting);
    
    return acc;
  }, {});

  // Sort months/years and meetings within each month
  const sortedMonths = Object.keys(groupedMeetings).sort((a, b) => {
    const dateA = new Date(a + ' 1');
    const dateB = new Date(b + ' 1');
    return dateA - dateB; // Chronological order (earliest first)
  });

  sortedMonths.forEach(month => {
    groupedMeetings[month].sort((a, b) => {
      const dateA = new Date(a.startDateTime || a.startDate);
      const dateB = new Date(b.startDateTime || b.startDate);
      return dateA - dateB; // Chronological order within each month
    });
  });


  // Debug: log currentUser
  if (currentUser) {
    // eslint-disable-next-line
    console.log('Current user:', currentUser);
  }

  // Check if user has permission to manage meetings (robust for string/array/case)
  const canManageMeetings = () => {
    if (!currentUser) return false;
    const roles = Array.isArray(currentUser.role)
      ? currentUser.role
      : (typeof currentUser.role === 'string' ? [currentUser.role] : []);
    return roles.some(r =>
      typeof r === 'string' && ['owner', 'super_user'].includes(r.toLowerCase())
    );
  };

  // Check if meeting can be launched (1 hour before start to 1 hour after end)
  const canLaunchMeeting = (meeting) => {
    if (!canManageMeetings()) return false;
    
    const now = new Date();
    const startDate = new Date(meeting.startDateTime || meeting.startDate);
    const endDate = new Date(meeting.endDateTime || meeting.endDate);
    
    const oneHourBefore = new Date(startDate.getTime() - 60 * 60 * 1000);
    const oneHourAfter = new Date(endDate.getTime() + 60 * 60 * 1000);
    
    return now >= oneHourBefore && now <= oneHourAfter;
  };

  const formatMeetingDate = (meeting) => {
    const startDate = new Date(meeting.startDateTime || meeting.startDate);
    const endDate = new Date(meeting.endDateTime || meeting.endDate);
    
    const day = startDate.getDate();
    const month = startDate.toLocaleString('default', { month: 'short' });
    
    const startTime = startDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    
    let timeStr = startTime;
    
    // Add end time if different from start
    if (endDate && endDate.getTime() !== startDate.getTime()) {
      const endTime = endDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      
      // Check if it spans multiple days
      if (startDate.toDateString() !== endDate.toDateString()) {
        timeStr += ` - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${endTime}`;
      } else {
        timeStr += ` - ${endTime}`;
      }
    }
    
    return { day, month, timeStr };
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading meetings...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f5f6fa', 
      padding: '20px',
      marginLeft: '20px', // Add left margin to align with content area
      marginRight: '20px', // Add right margin for balance
      width: 'calc(100% - 40px)' // Adjust width to account for margins
    }}>
      {/* Header */}
      <div style={{ 
        background: '#fff', 
        padding: '20px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, color: '#333', fontSize: '28px', fontWeight: 'bold' }}>
          Meetings
        </h1>
        {canManageMeetings() && (
          <button
            onClick={() => navigate('/meetings/new')}
            style={{
              background: '#1565c0',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            + New Meeting
          </button>
        )}
      </div>

      {/* Meetings List */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {sortedMonths.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#666',
            fontSize: '16px'
          }}>
            No meetings scheduled. Click "New Meeting" to create your first meeting.
          </div>
        ) : (
          sortedMonths.map(monthYear => (
            <div key={monthYear}>
              {/* Month Header */}
              <div style={{ 
                background: '#1565c0', 
                padding: '15px 20px', 
                borderBottom: '1px solid #e9ecef',
                fontWeight: 'bold',
                fontSize: '18px',
                color: '#fff'
              }}>
                {monthYear}
              </div>
              
              {/* Meetings for this month */}
              {groupedMeetings[monthYear].map(meeting => {
                const { day, month, timeStr } = formatMeetingDate(meeting);
                
                return (
                  <div 
                    key={meeting.id}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      padding: '20px',
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Date Block */}
                    <div style={{ 
                      background: '#e3f2fd', 
                      borderRadius: '8px', 
                      padding: '15px',
                      textAlign: 'center',
                      marginRight: '20px',
                      minWidth: '80px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold', 
                        color: '#1565c0',
                        lineHeight: '1'
                      }}>
                        {day}
                        {day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        marginTop: '4px'
                      }}>
                        {month}
                      </div>
                    </div>
                    
                    {/* Meeting Details */}
                    <div 
                      style={{ flex: 1, cursor: 'pointer' }}
                      onClick={() => navigate(`/meetings/${meeting.id}`)}
                    >
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        color: '#333',
                        marginBottom: '4px'
                      }}>
                        {timeStr}
                      </div>
                      <div style={{ 
                        fontSize: '18px', 
                        color: '#1565c0',
                        marginBottom: '8px'
                      }}>
                        {meeting.name}
                      </div>
                      {meeting.description && (
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#666',
                          marginBottom: '8px'
                        }}>
                          {meeting.description}
                        </div>
                      )}
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#999',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px'
                      }}>
                        {meeting.agendaItems && meeting.agendaItems.length > 0 && (
                          <span>{meeting.agendaItems.length} agenda item{meeting.agendaItems.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {canManageMeetings() && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        marginLeft: '20px'
                      }}>
                        {/* Edit Meeting Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/meetings/${meeting.id}`);
                          }}
                          style={{
                            background: '#2196f3',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                          title="Edit Meeting"
                        >
                          Edit
                        </button>

                        {/* Launch Meeting Button */}
                        {canLaunchMeeting(meeting) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement launch meeting functionality
                              console.log('Launch meeting:', meeting.id);
                            }}
                            style={{
                              background: '#4caf50',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                            title="Launch Meeting"
                          >
                            Launch
                          </button>
                        )}
                      </div>
                    )}


                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Meetings;
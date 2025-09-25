import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApprovals, processApproval, getUsers } from '../api';
import { useWebSocket } from '../WebSocketContext';

function Approvals() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const { socket } = useWebSocket();

  // Filter states
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    submittedBy: 'all',
    dateFrom: '',
    dateTo: '',
    processedDateFrom: '',
    processedDateTo: ''
  });

  // Processing modal state
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [processingAction, setProcessingAction] = useState('');
  const [processingComments, setProcessingComments] = useState('');

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      
      // Check if user has permission to view approvals
      if (!['SuperUser', 'Owner'].includes(user.role)) {
        navigate('/');
        return;
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        const [approvalsData, usersData] = await Promise.all([
          getApprovals(filters),
          getUsers('all')
        ]);
        
        setApprovals(Array.isArray(approvalsData) ? approvalsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error('Error fetching approvals:', error);
        setApprovals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, filters]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      type: 'all',
      status: 'all',
      submittedBy: 'all',
      dateFrom: '',
      dateTo: '',
      processedDateFrom: '',
      processedDateTo: ''
    });
  };

  // Open processing modal
  const openProcessModal = (approval, action) => {
    setSelectedApproval(approval);
    setProcessingAction(action);
    setProcessingComments('');
    setShowProcessModal(true);
  };

  // Close processing modal
  const closeProcessModal = () => {
    setShowProcessModal(false);
    setSelectedApproval(null);
    setProcessingAction('');
    setProcessingComments('');
  };

  // Handle approval processing
  const handleProcessApproval = async () => {
    if (!selectedApproval) return;

    try {
      const result = await processApproval(selectedApproval.id, {
        action: processingAction,
        comments: processingComments
      });

      // Update the approval in the list
      setApprovals(prev => prev.map(approval => 
        approval.id === selectedApproval.id ? result : approval
      ));

      closeProcessModal();
      
      // Show success message
      alert(`Approval ${processingAction}d successfully!`);
    } catch (error) {
      console.error('Error processing approval:', error);
      alert(`Failed to ${processingAction} approval. Please try again.`);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get approval type display name
  const getApprovalTypeDisplay = (type) => {
    const typeMap = {
      'user_registration': 'User Registration',
      'motion_approval': 'Motion Approval',
      'task_approval': 'Task Approval'
    };
    return typeMap[type] || type;
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-dark';
      case 'approved':
        return 'bg-success text-white';
      case 'rejected':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        
        {/* Outstanding Approvals Report */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px', color: '#333', textAlign: 'center' }}>Outstanding Approvals</h3>
          
          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', color: '#666' }}>Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', color: '#666' }}>Date Submitted</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', color: '#666' }}>Submitted By</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', color: '#666' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', color: '#666' }}>Date Processed</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', color: '#666' }}>Processed By</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', color: '#666' }}>Actions</th>
                </tr>
                {/* Filter Row - directly under headers */}
                <tr>
                  <td style={{ padding: '8px' }}>
                    <select 
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                    >
                      <option value="all">Filter</option>
                      <option value="user_registration">User Registration</option>
                      <option value="motion_approval">Motion Approval</option>
                      <option value="task_approval">Task Approval</option>
                    </select>
                  </td>
                  <td style={{ padding: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <input 
                        type="date"
                        style={{ width: '100%', padding: '2px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '10px' }}
                        value={filters.dateFrom}
                        onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        placeholder="From..."
                        title="Date Submitted From"
                      />
                      <input 
                        type="date"
                        style={{ width: '100%', padding: '2px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '10px' }}
                        value={filters.dateTo}
                        onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        placeholder="To..."
                        title="Date Submitted To"
                      />
                    </div>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <select 
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                      value={filters.submittedBy}
                      onChange={(e) => handleFilterChange('submittedBy', e.target.value)}
                    >
                      <option value="all">Filter</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.fullName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <select 
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="all">Filter</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td style={{ padding: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <input 
                        type="date"
                        style={{ width: '100%', padding: '2px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '10px' }}
                        value={filters.processedDateFrom}
                        onChange={(e) => handleFilterChange('processedDateFrom', e.target.value)}
                        placeholder="From..."
                        title="Date Processed From"
                      />
                      <input 
                        type="date"
                        style={{ width: '100%', padding: '2px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '10px' }}
                        value={filters.processedDateTo}
                        onChange={(e) => handleFilterChange('processedDateTo', e.target.value)}
                        placeholder="To..."
                        title="Date Processed To"
                      />
                    </div>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <select style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}>
                      <option>Filter</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <select style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}>
                      <option>Process</option>
                    </select>
                  </td>
                </tr>
              </thead>
              <tbody>
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                      No approvals found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  approvals.map((approval, index) => (
                    <tr key={approval.id} style={{ 
                      borderBottom: '1px solid #eee', 
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f8f9fa'}
                    >
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          backgroundColor: '#007bff', 
                          color: 'white', 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 'bold' 
                        }}>
                          {getApprovalTypeDisplay(approval.type)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {new Date(approval.dateSubmitted).toLocaleDateString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td style={{ padding: '12px 8px' }}>{approval.submittedBy.fullName}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          backgroundColor: approval.status === 'pending' ? '#ffc107' : approval.status === 'approved' ? '#28a745' : '#dc3545',
                          color: approval.status === 'pending' ? '#000' : '#fff', 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 'bold' 
                        }}>
                          {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {approval.dateProcessed ? 
                          new Date(approval.dateProcessed).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric'
                          }) : '-'
                        }
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {approval.approvedBy ? approval.approvedBy.fullName : '-'}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {approval.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                              style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openProcessModal(approval, 'approve');
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                            >
                              Approve
                            </button>
                            <button
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openProcessModal(approval, 'reject');
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Processing Modal */}
      {showProcessModal && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {processingAction.charAt(0).toUpperCase() + processingAction.slice(1)} Approval
                </h5>
                <button type="button" className="btn-close" onClick={closeProcessModal}></button>
              </div>
              <div className="modal-body">
                {selectedApproval && (
                  <div>
                    <div className="mb-3">
                      <strong>Type:</strong> {getApprovalTypeDisplay(selectedApproval.type)}
                    </div>
                    <div className="mb-3">
                      <strong>Description:</strong> {selectedApproval.description || 'No description'}
                    </div>
                    <div className="mb-3">
                      <strong>Submitted by:</strong> {selectedApproval.submittedBy.fullName}
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Comments (optional):</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={processingComments}
                        onChange={(e) => setProcessingComments(e.target.value)}
                        placeholder="Add any comments about this decision..."
                      ></textarea>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeProcessModal}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={`btn ${processingAction === 'approve' ? 'btn-success' : 'btn-danger'}`}
                  onClick={handleProcessApproval}
                >
                  {processingAction.charAt(0).toUpperCase() + processingAction.slice(1)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal backdrop */}
      {showProcessModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

export default Approvals;
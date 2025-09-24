import React, { useState } from 'react';

const FacebookComment = ({ 
  comment, 
  level = 0, 
  onReply, 
  onEdit, 
  onDelete, 
  currentUserId, 
  allComments = [] 
}) => {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get replies to this comment
  const replies = allComments.filter(c => c.parentId === comment.id);

  const handleReply = async () => {
    if (replyText.trim()) {
      await onReply(comment.id, replyText);
      setReplyText('');
      setShowReplyBox(false);
    }
  };

  const handleEdit = async () => {
    if (editText.trim() && editText !== comment.text) {
      await onEdit(comment.id, editText);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await onDelete(comment.id);
    setShowDeleteConfirm(false);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now - commentDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return commentDate.toLocaleDateString();
  };

  const renderCommentText = (text) => {
    if (!text) return text;
    
    // Replace mention markup @[Name](id) with styled mentions
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add styled mention
      parts.push(
        <span
          key={match.index}
          style={{
            color: '#1877f2',
            fontWeight: 600,
            backgroundColor: 'rgba(24, 119, 242, 0.1)',
            padding: '1px 4px',
            borderRadius: 4
          }}
        >
          @{match[1]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 1 ? parts : text;
  };

  return (
    <div style={{ marginLeft: level * 20, marginBottom: 12 }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: 8,
        padding: '8px 12px',
        backgroundColor: level % 2 === 0 ? '#f0f2f5' : '#e4e6ea',
        borderRadius: 16,
        position: 'relative'
      }}>
        {/* User Avatar - Simple circle with initials */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: '#1877f2',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          flexShrink: 0
        }}>
          {(() => {
            const fallbackName = comment.userId === currentUserId ? 'You' : (comment.user?.name || [comment.user?.firstName, comment.user?.lastName].filter(Boolean).join(' '));
            const name = comment.username || fallbackName || 'U';
            return name
              .split(' ')
              .filter(Boolean)
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);
          })()}
        </div>
        
        <div style={{ flex: 1 }}>
          {/* Comment Header */}
          <div style={{ 
            backgroundColor: level % 2 === 0 ? '#e4e6ea' : '#d0d2d6',
            borderRadius: 16,
            padding: '8px 12px',
            marginBottom: 4
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 2 
            }}>
              <span style={{ 
                fontWeight: 600, 
                fontSize: 13, 
                color: '#050505' 
              }}>
                  {(() => {
                    const fallbackName = comment.userId === currentUserId ? 'You' : (comment.user?.name || [comment.user?.firstName, comment.user?.lastName].filter(Boolean).join(' ').trim());
                    return comment.username || fallbackName || 'Unknown User';
                  })()}
              </span>
              {comment.editable && (
                <div style={{ fontSize: 12, color: '#65676b' }}>
                  ⋯
                </div>
              )}
            </div>
            
            {/* Comment Text */}
            {isEditing ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: 8,
                    fontSize: 14,
                    backgroundColor: 'white'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleEdit()}
                />
                <button
                  onClick={handleEdit}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#1877f2',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.text);
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#65676b',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ 
                fontSize: 14, 
                color: '#050505', 
                lineHeight: 1.33
              }}>
                {renderCommentText(comment.text)}
                {comment.isEdited && (
                  <span style={{ 
                    fontSize: 12, 
                    color: '#65676b', 
                    marginLeft: 4,
                    fontStyle: 'italic'
                  }}>
                    (edited)
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Comment Actions */}
          <div style={{ 
            display: 'flex', 
            gap: 16, 
            fontSize: 12, 
            color: '#65676b',
            fontWeight: 600,
            paddingLeft: 12 
          }}>
            <span style={{ color: '#65676b' }}>
              {formatDate(comment.createdAt)}
            </span>
            
            <button
              onClick={() => setShowReplyBox(!showReplyBox)}
              style={{
                border: 'none',
                background: 'none',
                color: '#65676b',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                padding: 0
              }}
            >
              Reply
            </button>
            
            {comment.editable && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#65676b',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: 0
                  }}
                >
                  Edit
                </button>
                
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#65676b',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: 0
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Reply Box */}
      {showReplyBox && (
        <div style={{ 
          marginTop: 8, 
          marginLeft: 40,
          display: 'flex', 
          gap: 8, 
          alignItems: 'center' 
        }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: '#1877f2',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            You
          </div>
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            style={{
              flex: 1,
              border: '1px solid #ccd0d5',
              borderRadius: 16,
              padding: '6px 12px',
              fontSize: 14,
              outline: 'none'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleReply()}
          />
          <button
            onClick={handleReply}
            style={{
              backgroundColor: '#1877f2',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Reply
          </button>
          <button
            onClick={() => {
              setShowReplyBox(false);
              setReplyText('');
            }}
            style={{
              backgroundColor: '#e4e6ea',
              color: '#65676b',
              border: 'none',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      )}
      
      {/* Delete Confirmation */}
      {showDeleteConfirm && (
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
            backgroundColor: 'white',
            padding: 20,
            borderRadius: 8,
            maxWidth: 400,
            textAlign: 'center'
          }}>
            <h3>Delete Comment?</h3>
            <p>Are you sure you want to delete this comment? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={handleDelete}
                style={{
                  backgroundColor: '#e41e3f',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  backgroundColor: '#e4e6ea',
                  color: '#65676b',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Render Replies */}
      {replies.map(reply => (
        <FacebookComment
          key={reply.id}
          comment={reply}
          level={level + 1}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          currentUserId={currentUserId}
          allComments={allComments}
        />
      ))}
    </div>
  );
};

export default FacebookComment;
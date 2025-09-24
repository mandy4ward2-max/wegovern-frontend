import React, { useState, useEffect, useRef, forwardRef } from 'react';

const MentionPicker = forwardRef(({
  users = [],
  isVisible,
  position,
  onSelect,
  onClose,
  searchQuery = ''
}, ref) => {
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    // Filter users based on search query
    let filtered = users;
    if (searchQuery) {
      filtered = users.filter(user => {
        const fullName = (user.fullName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || email.includes(query);
      });
    }

    // Add "everyone" option at the beginning
    const everyoneOption = {
      id: 'everyone',
      firstName: 'Everyone',
      lastName: '',
      email: 'Tag everyone in the organization'
    };
    
    setFilteredUsers([everyoneOption, ...filtered]);
    setSelectedIndex(0);
  }, [users, searchQuery, isVisible]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isVisible) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredUsers.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredUsers.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredUsers[selectedIndex]) {
            onSelect(filteredUsers[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, filteredUsers, selectedIndex, onSelect, onClose]);

  if (!isVisible || filteredUsers.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        backgroundColor: 'white',
        border: '1px solid #e4e6ea',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        maxHeight: 200,
        overflowY: 'auto',
        zIndex: 1000,
        minWidth: 250
      }}
    >
      {filteredUsers.map((user, index) => (
        <div
          key={user.id}
          onClick={() => onSelect(user)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            backgroundColor: index === selectedIndex ? '#f0f2f5' : 'transparent',
            borderBottom: index < filteredUsers.length - 1 ? '1px solid #f0f2f5' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: user.id === 'everyone' ? '#42b883' : '#1877f2',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
              flexShrink: 0
            }}
          >
            {user.id === 'everyone' ? '@' : (() => {
              const firstInitial = (user.firstName || '').charAt(0);
              const lastInitial = (user.lastName || '').charAt(0);
              if (firstInitial && lastInitial) {
                return `${firstInitial}${lastInitial}`;
              }
              // Use first two letters of email if no firstName/lastName
              return (user.email || 'U').substring(0, 2).toUpperCase();
            })()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#050505' }}>
              {user.id === 'everyone' ? 'Everyone' : (user.fullName || user.email?.split('@')[0] || 'User')}
            </div>
            {user.id === 'everyone' && (
              <div style={{ fontSize: 12, color: '#65676b' }}>
                Tag everyone in the organization
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

export default MentionPicker;
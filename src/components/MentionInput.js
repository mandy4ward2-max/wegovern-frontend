import React, { useState, useRef, useEffect } from 'react';
import MentionPicker from './MentionPicker';

const MentionInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Write a comment...',
  users = [],
  disabled = false,
  styleOverrides = {}
}) => {
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [taggedUsers, setTaggedUsers] = useState([]);
  
  const inputRef = useRef(null);
  // Track whether the latest value change came from user typing vs programmatic updates
  const lastChangeSource = useRef('init'); // 'user' | 'mention' | 'external' | 'init'
  const mentionPickerRef = useRef(null);

  // Parse mentions from text (format: @[UserName](userId))
  const parseMentionsFromText = (text) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push({
        id: match[2],
        name: match[1],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    return mentions;
  };



  // Get tagged user IDs from text
  const getTaggedUserIds = (text) => {
    const mentions = parseMentionsFromText(text);
    return mentions.map(mention => mention.id === 'everyone' ? 'everyone' : mention.id);
  };

  // Render mentions with styled tags for contentEditable
  const renderMentionText = (text) => {
    if (!text) return '';
    
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let result = text;
    
    result = result.replace(mentionRegex, (match, name, id) => {
      return `<span class="mention-tag" contenteditable="false" data-mention-id="${id}" style="color: #1877f2; font-weight: 600; background-color: rgba(24, 119, 242, 0.1); padding: 2px 6px; border-radius: 4px; margin: 0 1px; display: inline-block; cursor: pointer;">@${name}</span>`;
    });
    
    return result;
  };

  const handleInputChange = (e) => {
    // Mark this change as coming from the user so we don't overwrite caret position
    lastChangeSource.current = 'user';
    const htmlContent = e.target.innerHTML;
    const textContent = e.target.textContent || '';
    
    // Convert HTML back to our mention format
    let newValue = htmlContent;
    
    // Replace mention spans back to markup format
    newValue = newValue.replace(/<span[^>]*class="mention-tag"[^>]*data-mention-id="([^"]*)"[^>]*>@([^<]*)<\/span>/g, '@[$2]($1)');
    
    // Remove any other HTML tags
    newValue = newValue.replace(/<[^>]*>/g, '');
    
    // Get cursor position (simplified for now)
    const selection = window.getSelection();
    const cursorPos = selection.rangeCount > 0 ? selection.getRangeAt(0).startOffset : 0;
    setCursorPosition(cursorPos);
    
    // Check if user typed @ to trigger mention picker
    const textBeforeCursor = textContent.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Check if there's a space or other special character after @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStartIndex(lastAtIndex);
        setMentionSearchQuery(textAfterAt);
        
        // Calculate position for mention picker - position it below the input
        const inputRect = inputRef.current.getBoundingClientRect();
        setMentionPosition({
          top: inputRect.bottom + 4,
          left: inputRect.left
        });
        
        setShowMentionPicker(true);
      } else {
        setShowMentionPicker(false);
      }
    } else {
      setShowMentionPicker(false);
    }
    
    onChange(newValue, getTaggedUserIds(newValue));
  };

  const handleKeyDown = (e) => {
    // Handle Enter key
    if (e.key === 'Enter' && !showMentionPicker) {
      e.preventDefault();
      onSubmit();
      return;
    }

    // Handle mention deletion with backspace/delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        
        // Check if we're about to delete a mention tag
        let mentionElement = null;
        if (startContainer.nodeType === Node.TEXT_NODE) {
          mentionElement = startContainer.parentElement;
        } else {
          mentionElement = startContainer;
        }
        
        if (mentionElement && mentionElement.classList && mentionElement.classList.contains('mention-tag')) {
          e.preventDefault();
          mentionElement.remove();
          
          // Update the value after deletion
          setTimeout(() => {
            const htmlContent = inputRef.current.innerHTML;
            let newValue = htmlContent.replace(/<span[^>]*class="mention-tag"[^>]*data-mention-id="([^"]*)"[^>]*>@([^<]*)<\/span>/g, '@[$2]($1)');
            newValue = newValue.replace(/<[^>]*>/g, '');
            onChange(newValue, getTaggedUserIds(newValue));
          }, 0);
        }
      }
    }
  };

  const handleMentionSelect = (user) => {
    if (mentionStartIndex === -1) return;
    
    const beforeMention = value.substring(0, mentionStartIndex);
    const afterMention = value.substring(cursorPosition);
    
    let mentionText;
    if (user.id === 'everyone') {
      mentionText = '@[Everyone](everyone)';
    } else {
      const displayName = user.fullName || user.email?.split('@')[0] || 'User';
      mentionText = `@[${displayName}](${user.id})`;
    }
    
    const newValue = beforeMention + mentionText + afterMention;
    const newCursorPosition = mentionStartIndex + mentionText.length;
    
  // Mark as programmatic so we can safely re-render formatted content
  lastChangeSource.current = 'mention';
  onChange(newValue, getTaggedUserIds(newValue));
    
    setShowMentionPicker(false);
    setMentionStartIndex(-1);
    setMentionSearchQuery('');
    
    // Focus back to input and update content
    setTimeout(() => {
      inputRef.current.focus();
      inputRef.current.innerHTML = renderMentionText(newValue);
      
      // Set cursor position after the mention
      const selection = window.getSelection();
      const range = document.createRange();
      const textNode = inputRef.current.lastChild;
      if (textNode) {
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }, 0);
  };



  const handleClickOutside = (e) => {
    // Don't close if clicking on the input
    if (inputRef.current && inputRef.current.contains(e.target)) {
      return;
    }
    
    // Don't close if clicking on the mention picker
    if (mentionPickerRef.current && mentionPickerRef.current.contains(e.target)) {
      return;
    }
    
    // Close the picker if clicking elsewhere
    setShowMentionPicker(false);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep the DOM in sync when value changes externally (e.g., cleared after submit or mention inserted)
  useEffect(() => {
    if (!inputRef.current) return;
    // For normal typing, do not reset innerHTML to preserve caret and typing direction
    const shouldSync = lastChangeSource.current !== 'user' || value === '';
    if (!shouldSync) return;
    const desired = renderMentionText(value);
    if (inputRef.current.innerHTML !== desired) {
      inputRef.current.innerHTML = desired;
    }
  }, [value]);

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div
        ref={inputRef}
        contentEditable
        suppressContentEditableWarning={true}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        disabled={disabled}
        dir="ltr"
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 16,
          padding: '8px 12px',
          fontSize: 14,
          outline: 'none',
          backgroundColor: 'white',
          minHeight: '20px',
          cursor: 'text',
          direction: 'ltr',
          textAlign: 'left',
          unicodeBidi: 'plaintext',
          ...styleOverrides
        }}
      />
      
      <MentionPicker
        ref={mentionPickerRef}
        users={users}
        isVisible={showMentionPicker}
        position={mentionPosition}
        searchQuery={mentionSearchQuery}
        onSelect={handleMentionSelect}
        onClose={() => setShowMentionPicker(false)}
      />
    </div>
  );
};

export default MentionInput;
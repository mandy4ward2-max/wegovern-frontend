import React, { useState, useEffect } from 'react';

const initialSections = [];

export default function AgendaBuilder({ meetingId }) {
  const [sections, setSections] = useState(initialSections);
  const [sectionId, setSectionId] = useState(1);
  const [draggedItem, setDraggedItem] = useState(null);
  const [infoItems, setInfoItems] = useState([]);
  const [infoItemId, setInfoItemId] = useState(1);
  const [editingInfoItem, setEditingInfoItem] = useState(null);
  const [showEditInfoModal, setShowEditInfoModal] = useState(false);
  const [motionItems, setMotionItems] = useState([]);
  const [motionItemId, setMotionItemId] = useState(1);
  const [newMotionItems, setNewMotionItems] = useState([]);
  const [newMotionItemId, setNewMotionItemId] = useState(1);
  const [editingNewMotion, setEditingNewMotion] = useState(null);
  const [showEditNewMotionModal, setShowEditNewMotionModal] = useState(false);
  const [showMotionDropdown, setShowMotionDropdown] = useState(false);
  const [availableMotions, setAvailableMotions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Save agenda to database
  const handleSaveAgenda = async () => {
    if (!meetingId) {
      alert('No meeting ID provided. Cannot save agenda.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/agenda`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sections,
          infoItems,
          motionItems,
          newMotionItems
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Agenda saved successfully! Created ${data.itemsCreated} agenda items.`);
      } else {
        alert(`Error saving agenda: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving agenda:', error);
      alert('Error saving agenda. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddInfoItem = (parentSectionId = null) => {
    const newItem = { 
      id: infoItemId, 
      content: '', 
      parentSectionId: parentSectionId,
      order: Date.now() // Use timestamp for initial ordering
    };
    setInfoItems([...infoItems, newItem]);
    setInfoItemId(infoItemId + 1);
  };

  const handleInfoItemChange = (id, value) => {
    setInfoItems(infoItems.map(item => item.id === id ? { ...item, content: value } : item));
  };

  const handleDeleteInfoItem = (id) => {
    setInfoItems(infoItems.filter(item => item.id !== id));
  };

  const handleEditInfoItem = (item) => {
    setEditingInfoItem({ ...item });
    setShowEditInfoModal(true);
  };

  const handleSaveEditInfoItem = () => {
    if (editingInfoItem) {
      setInfoItems(prev => prev.map(item => 
        item.id === editingInfoItem.id ? editingInfoItem : item
      ));
      setEditingInfoItem(null);
      setShowEditInfoModal(false);
    }
  };

  const handleCancelEditInfoItem = () => {
    setEditingInfoItem(null);
    setShowEditInfoModal(false);
  };

  // New Motion-related functions
  const handleAddNewMotion = (parentSectionId = null) => {
    console.log('handleAddNewMotion called', { parentSectionId, newMotionItemId, newMotionItems });
    const newItem = { 
      id: newMotionItemId, 
      title: '', 
      description: '',
      parentSectionId: parentSectionId,
      order: Date.now() // Use timestamp for initial ordering
    };
    setNewMotionItems([...newMotionItems, newItem]);
    setNewMotionItemId(newMotionItemId + 1);
    console.log('New motion item added', newItem);
  };

  const handleNewMotionChange = (id, field, value) => {
    setNewMotionItems(newMotionItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDeleteNewMotion = (id) => {
    setNewMotionItems(newMotionItems.filter(item => item.id !== id));
  };

  const handleEditNewMotion = (item) => {
    setEditingNewMotion({ ...item });
    setShowEditNewMotionModal(true);
  };

  const handleSaveEditNewMotion = () => {
    if (editingNewMotion) {
      setNewMotionItems(prev => prev.map(item => 
        item.id === editingNewMotion.id ? editingNewMotion : item
      ));
      setEditingNewMotion(null);
      setShowEditNewMotionModal(false);
    }
  };

  const handleCancelEditNewMotion = () => {
    setEditingNewMotion(null);
    setShowEditNewMotionModal(false);
  };

  // Motion-related functions
  useEffect(() => {
    fetchAvailableMotions();
    if (meetingId) {
      loadExistingAgenda();
    }
  }, [meetingId]);

  // Load existing agenda from database
  const loadExistingAgenda = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/agenda`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const agendaItems = await response.json();
        
        // Convert database items back to component state
        const loadedSections = [];
        const loadedInfoItems = [];
        const loadedMotionItems = [];
        const loadedNewMotionItems = [];
        
        let maxSectionId = 1;
        let maxInfoItemId = 1;
        let maxMotionItemId = 1;
        let maxNewMotionItemId = 1;

        agendaItems.forEach(item => {
          if (item.type === 'section') {
            loadedSections.push({
              id: item.id,
              title: item.title,
              isSub: item.isSubSection,
              parentId: item.parentSectionId
            });
            maxSectionId = Math.max(maxSectionId, item.id + 1);
          } else if (item.type === 'infoItem') {
            loadedInfoItems.push({
              id: item.id,
              content: item.agendaItem,
              parentSectionId: item.parentSectionId,
              order: item.sortOrder
            });
            maxInfoItemId = Math.max(maxInfoItemId, item.id + 1);
          } else if (item.type === 'motionItem') {
            loadedMotionItems.push({
              id: item.motionId,
              title: item.title,
              parentSectionId: item.parentSectionId,
              order: item.sortOrder
            });
            maxMotionItemId = Math.max(maxMotionItemId, item.motionId + 1);
          } else if (item.type === 'newMotion') {
            loadedNewMotionItems.push({
              id: item.id,
              title: item.title,
              description: item.description,
              parentSectionId: item.parentSectionId,
              order: item.sortOrder
            });
            maxNewMotionItemId = Math.max(maxNewMotionItemId, item.id + 1);
          }
        });

        // Update state with loaded items
        setSections(loadedSections);
        setInfoItems(loadedInfoItems);
        setMotionItems(loadedMotionItems);
        setNewMotionItems(loadedNewMotionItems);
        
        // Update ID counters
        setSectionId(maxSectionId);
        setInfoItemId(maxInfoItemId);
        setMotionItemId(maxMotionItemId);
        setNewMotionItemId(maxNewMotionItemId);

      }
    } catch (error) {
      console.error('Error loading agenda:', error);
    }
  };

  const fetchAvailableMotions = async () => {
    try {
      const response = await fetch('/api/motions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const motions = await response.json();
        const meetingMotions = motions.filter(motion => motion.status === 'meeting');
        setAvailableMotions(meetingMotions);
      }
    } catch (error) {
      console.error('Error fetching motions:', error);
    }
  };

  const handleAddMotionItem = (motion) => {
    const newMotionItem = {
      id: motionItemId,
      motionId: motion.id,
      title: motion.title,
      parentSectionId: null,
      order: Date.now() // Use timestamp for initial ordering
    };
    setMotionItems([...motionItems, newMotionItem]);
    setMotionItemId(motionItemId + 1);
    setShowMotionDropdown(false);
  };

  const handleDeleteMotionItem = (id) => {
    setMotionItems(motionItems.filter(item => item.id !== id));
  };

  const getMotionItemNumber = (item) => {
    if (!item.parentSectionId) {
      return 'MOTION';
    }
    
    const parentSection = sections.find(s => s.id === item.parentSectionId);
    if (!parentSection) return 'MOTION';
    
    const sectionNumber = getSectionNumber(parentSection, sections.indexOf(parentSection));
    
    // Get all items in this section (info + submitted motion + new motion) and sort by order
    const allItemsInSection = [
      ...infoItems.filter(i => i.parentSectionId === item.parentSectionId).map(i => ({ ...i, type: 'info' })),
      ...motionItems.filter(m => m.parentSectionId === item.parentSectionId).map(m => ({ ...m, type: 'motion' })),
      ...newMotionItems.filter(nm => nm.parentSectionId === item.parentSectionId).map(nm => ({ ...nm, type: 'newMotion' }))
    ].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const itemIndex = allItemsInSection.findIndex(i => i.type === 'motion' && i.id === item.id);
    
    return `${sectionNumber}.${itemIndex + 1}`;
  };

  const getNewMotionItemNumber = (item) => {
    if (!item.parentSectionId) {
      return 'NEW MOTION';
    }
    
    const parentSection = sections.find(s => s.id === item.parentSectionId);
    if (!parentSection) return 'NEW MOTION';
    
    const sectionNumber = getSectionNumber(parentSection, sections.indexOf(parentSection));
    
    // Get all items in this section (info + submitted motion + new motion) and sort by order
    const allItemsInSection = [
      ...infoItems.filter(i => i.parentSectionId === item.parentSectionId).map(i => ({ ...i, type: 'info' })),
      ...motionItems.filter(m => m.parentSectionId === item.parentSectionId).map(m => ({ ...m, type: 'motion' })),
      ...newMotionItems.filter(nm => nm.parentSectionId === item.parentSectionId).map(nm => ({ ...nm, type: 'newMotion' }))
    ].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const itemIndex = allItemsInSection.findIndex(i => i.type === 'newMotion' && i.id === item.id);
    
    return `${sectionNumber}.${itemIndex + 1}`;
  };

  const getInfoItemNumber = (infoItem) => {
    if (!infoItem.parentSectionId) return 'INFO';
    
    const parentSection = sections.find(s => s.id === infoItem.parentSectionId);
    if (!parentSection) return 'INFO';
    
    const parentIndex = sections.findIndex(s => s.id === infoItem.parentSectionId);
    const parentNumber = getSectionNumber(parentSection, parentIndex);
    
    // Get all items in this section (info + submitted motion + new motion) and sort by order
    const allItemsInSection = [
      ...infoItems.filter(i => i.parentSectionId === infoItem.parentSectionId).map(i => ({ ...i, type: 'info' })),
      ...motionItems.filter(m => m.parentSectionId === infoItem.parentSectionId).map(m => ({ ...m, type: 'motion' })),
      ...newMotionItems.filter(nm => nm.parentSectionId === infoItem.parentSectionId).map(nm => ({ ...nm, type: 'newMotion' }))
    ].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const itemIndex = allItemsInSection.findIndex(i => i.type === 'info' && i.id === infoItem.id);
    
    return `${parentNumber}.${itemIndex + 1}`;
  };

  const handleAddSubSection = (parentId) => {
    const parentIndex = sections.findIndex(s => s.id === parentId);
    if (parentIndex === -1) return;
    
    const newSection = { 
      id: sectionId, 
      title: '', 
      isSub: true, 
      parentId: parentId 
    };
    
    // Find the insertion point (after the parent and any existing subsections)
    let insertIndex = parentIndex + 1;
    while (insertIndex < sections.length && sections[insertIndex].parentId === parentId) {
      insertIndex++;
    }
    
    const newSections = [...sections];
    newSections.splice(insertIndex, 0, newSection);
    setSections(newSections);
    setSectionId(sectionId + 1);
  };

  const getSectionNumber = (section, index) => {
    if (section.isSub) {
      const parentIndex = sections.findIndex(s => s.id === section.parentId);
      const parentNumber = sections.filter((s, i) => i <= parentIndex && !s.isSub).length;
      const subIndex = sections.filter((s, i) => i <= index && s.parentId === section.parentId).length;
      return `${parentNumber}.${subIndex}`;
    } else {
      const mainSectionNumber = sections.filter((s, i) => i <= index && !s.isSub).length;
      return mainSectionNumber.toString();
    }
  };

  const handleAddSection = () => {
    setSections([
      ...sections,
      { id: sectionId, title: '', isSub: false, parentId: null }
    ]);
    setSectionId(sectionId + 1);
  };

  const handleTitleChange = (id, value) => {
    setSections(sections.map(s => s.id === id ? { ...s, title: value } : s));
  };

  const handleDelete = (id) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const handleMakeSub = (id) => {
    setSections(sections.map((s, idx) => {
      if (s.id === id && idx > 0) {
        return { ...s, isSub: !s.isSub };
      }
      return s;
    }));
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'section', index }));
  };

  const handleInfoItemDragStart = (e, itemId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'infoItem', id: itemId }));
  };

  const handleMotionItemDragStart = (e, itemId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'motionItem', id: itemId }));
  };

  const handleNewMotionItemDragStart = (e, itemId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'newMotionItem', id: itemId }));
  };

  const handleItemDrop = (e, targetItemId, targetItemType) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (dragData.type === 'infoItem' || dragData.type === 'motionItem' || dragData.type === 'newMotionItem') {
        // Find the target item to get its section and order
        let targetItem, targetParentSectionId, targetOrder;
        
        if (targetItemType === 'infoItem') {
          targetItem = infoItems.find(item => item.id === targetItemId);
        } else if (targetItemType === 'motionItem') {
          targetItem = motionItems.find(item => item.id === targetItemId);
        } else if (targetItemType === 'newMotionItem') {
          targetItem = newMotionItems.find(item => item.id === targetItemId);
        }
        
        if (!targetItem) return;
        
        targetParentSectionId = targetItem.parentSectionId;
        targetOrder = targetItem.order || 0;
        
        // Calculate new order to insert before target item
        const newOrder = targetOrder - 0.001;
        
        // Handle the reordering based on drag and drop types
        if (dragData.type === 'infoItem') {
          setInfoItems(prev => prev.map(item => 
            item.id === dragData.id 
              ? { ...item, parentSectionId: targetParentSectionId, order: newOrder }
              : item
          ));
        } else if (dragData.type === 'motionItem') {
          setMotionItems(prev => prev.map(item => 
            item.id === dragData.id 
              ? { ...item, parentSectionId: targetParentSectionId, order: newOrder }
              : item
          ));
        } else if (dragData.type === 'newMotionItem') {
          setNewMotionItems(prev => prev.map(item => 
            item.id === dragData.id 
              ? { ...item, parentSectionId: targetParentSectionId, order: newOrder }
              : item
          ));
        }
      }
    } catch (error) {
      console.error('Error in item drop:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (dragData.type === 'infoItem') {
        // Handle info item drop on section
        const targetSection = sections[dropIndex];
        if (targetSection) {
          setInfoItems(prev => prev.map(item => 
            item.id === dragData.id 
              ? { ...item, parentSectionId: targetSection.id }
              : item
          ));
        }
        return;
      } else if (dragData.type === 'motionItem') {
        // Handle motion item drop on section
        const targetSection = sections[dropIndex];
        if (targetSection) {
          setMotionItems(prev => prev.map(item => 
            item.id === dragData.id 
              ? { ...item, parentSectionId: targetSection.id }
              : item
          ));
        }
        return;
      } else if (dragData.type === 'newMotionItem') {
        // Handle new motion item drop on section
        const targetSection = sections[dropIndex];
        if (targetSection) {
          setNewMotionItems(prev => prev.map(item => 
            item.id === dragData.id 
              ? { ...item, parentSectionId: targetSection.id }
              : item
          ));
        }
        return;
      } else if (dragData.type === 'section') {
        // Handle section drop on another section (make it a subsection)
        const targetSection = sections[dropIndex];
        const draggedSection = sections[dragData.index];
        
        if (targetSection && draggedSection && dragData.index !== dropIndex) {
          // Make dragged section a subsection of target section
          setSections(prev => prev.map(section => 
            section.id === draggedSection.id
              ? { ...section, isSub: true, parentId: targetSection.id }
              : section
          ));
        }
        setDraggedItem(null);
      }
    } catch {
      // Fallback for old drag data format
      if (draggedItem === null || draggedItem === dropIndex) return;
      
      const newSections = [...sections];
      const draggedSection = newSections[draggedItem];
      newSections.splice(draggedItem, 1);
      newSections.splice(dropIndex, 0, draggedSection);
      
      setSections(newSections);
      setDraggedItem(null);
    }
  };

  const handleInfoItemDropToGlobal = (e) => {
    e.preventDefault();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (dragData.type === 'infoItem') {
        // Drop in global area (remove from any section)
        setInfoItems(prev => prev.map(item => 
          item.id === dragData.id 
            ? { ...item, parentSectionId: null }
            : item
        ));
      } else if (dragData.type === 'motionItem') {
        // Drop motion item in global area
        setMotionItems(prev => prev.map(item => 
          item.id === dragData.id 
            ? { ...item, parentSectionId: null }
            : item
        ));
      } else if (dragData.type === 'newMotionItem') {
        // Drop new motion item in global area
        setNewMotionItems(prev => prev.map(item => 
          item.id === dragData.id 
            ? { ...item, parentSectionId: null }
            : item
        ));
      }
    } catch {
      // Ignore non-JSON data
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    setSections(newSections);
  };

  const moveDown = (index) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    setSections(newSections);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 0' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <button 
          type="button"
          onClick={handleAddSection} 
          style={{ marginRight: 12, background: '#1565c0', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}
        >
          + Section
        </button>
        <button 
          type="button"
          onClick={() => handleAddInfoItem(null)} 
          style={{ marginRight: 12, background: '#ff9800', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}
        >
          + Information Item
        </button>
        <button 
          type="button"
          onClick={() => handleAddNewMotion(null)} 
          style={{ marginRight: 12, background: '#ffc107', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}
        >
          + New Motion
        </button>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button 
            type="button"
            onClick={() => setShowMotionDropdown(!showMotionDropdown)} 
            style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}
          >
            + Submitted Motion
          </button>
          {showMotionDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '2px solid #ddd',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 100,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {availableMotions.length === 0 ? (
                <div style={{ padding: '12px', color: '#666', fontStyle: 'italic' }}>
                  No motions with "meeting" status available
                </div>
              ) : (
                availableMotions.map((motion) => (
                  <div
                    key={motion.id}
                    onClick={() => handleAddMotionItem(motion)}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      ':hover': { backgroundColor: '#f5f5f5' }
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {motion.title}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Save Button */}
        <button 
          type="button"
          onClick={handleSaveAgenda}
          disabled={isSaving || !meetingId}
          style={{ 
            marginLeft: 20,
            background: isSaving ? '#ccc' : '#dc3545', 
            color: '#fff', 
            border: 'none', 
            padding: '10px 24px', 
            borderRadius: 6, 
            fontWeight: 'bold', 
            cursor: isSaving || !meetingId ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {isSaving ? 'Saving...' : 'Save Agenda'}
        </button>
      </div>
      <h2 style={{ marginBottom: 24, textAlign: 'center' }}>Compose Your Agenda</h2>
      
      {/* Global Information Items (not under any section) */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleInfoItemDropToGlobal}
        style={{ minHeight: '20px' }}
      >
        {infoItems.filter(item => !item.parentSectionId).map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleInfoItemDragStart(e, item.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleItemDrop(e, item.id, 'infoItem')}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ff9800',
              borderRadius: 8,
              marginBottom: 12,
              padding: '12px 16px',
              border: '1px solid #e68900',
              color: '#fff',
              cursor: 'move'
            }}
          >
            <span style={{ 
              marginRight: 16, 
              fontSize: 16, 
              fontWeight: 'bold', 
              color: '#fff',
              minWidth: '30px',
              textAlign: 'center',
              background: '#e68900',
              padding: '6px 12px',
              borderRadius: '6px'
            }}>
              INFO
            </span>
            <div style={{ 
              flex: 1, 
              fontSize: 16, 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: 6, 
              background: '#fff', 
              color: '#333',
              minHeight: '20px',
              display: 'flex',
              alignItems: 'center'
            }}>
              {item.content || 'Enter information item content...'}
            </div>
            <button 
              type="button"
              onClick={() => handleEditInfoItem(item)} 
              style={{ marginLeft: 12, background: '#007bff', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              Edit Info
            </button>
            <button 
              type="button"
              onClick={() => handleDeleteInfoItem(item.id)} 
              style={{ marginLeft: 8, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              Delete
            </button>
          </div>
        ))}
        
        {/* Global Motion Items (not under any section) */}
        {motionItems.filter(item => !item.parentSectionId).map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleMotionItemDragStart(e, item.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleItemDrop(e, item.id, 'motionItem')}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#28a745',
              borderRadius: 8,
              marginBottom: 12,
              padding: '12px 16px',
              border: '1px solid #1e7e34',
              color: '#fff',
              cursor: 'move'
            }}
          >
            <span style={{ 
              marginRight: 16, 
              fontSize: 16, 
              fontWeight: 'bold', 
              color: '#fff',
              minWidth: '30px',
              textAlign: 'center',
              background: '#1e7e34',
              padding: '6px 12px',
              borderRadius: '6px'
            }}>
              MOTION
            </span>
            <div style={{ 
              flex: 1, 
              fontSize: 16, 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: 6, 
              background: '#fff', 
              color: '#333',
              minHeight: '20px',
              display: 'flex',
              alignItems: 'center'
            }}>
              {item.title}
            </div>
            <button 
              type="button"
              onClick={() => handleDeleteMotionItem(item.id)} 
              style={{ marginLeft: 8, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              Delete
            </button>
          </div>
        ))}

        {/* Global New Motion Items (not under any section) */}
        {newMotionItems.filter(item => !item.parentSectionId).map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleNewMotionItemDragStart(e, item.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleItemDrop(e, item.id, 'newMotionItem')}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffc107',
              borderRadius: 8,
              marginBottom: 12,
              padding: '12px 16px',
              border: '1px solid #e0a800',
              color: '#000',
              cursor: 'move'
            }}
          >
            <span style={{ 
              marginRight: 16, 
              fontSize: 16, 
              fontWeight: 'bold', 
              color: '#fff',
              minWidth: '30px',
              textAlign: 'center',
              background: '#e0a800',
              padding: '6px 12px',
              borderRadius: '6px'
            }}>
              {getNewMotionItemNumber(item)}
            </span>
            <div style={{ 
              flex: 1, 
              fontSize: 16, 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: 6, 
              background: '#fff', 
              color: '#333',
              minHeight: '20px',
              display: 'flex',
              alignItems: 'center'
            }}>
              {item.title || 'Enter new motion title...'}
            </div>
            <button 
              type="button"
              onClick={() => handleEditNewMotion(item)} 
              style={{ marginLeft: 12, background: '#007bff', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              Edit Motion
            </button>
            <button 
              type="button"
              onClick={() => handleDeleteNewMotion(item.id)} 
              style={{ marginLeft: 8, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div>
        {sections.map((section, idx) => (
          <div key={section.id}>
            {/* Section Card */}
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#1565c0',
                borderRadius: 8,
                marginBottom: 12,
                padding: '16px 12px',
                marginLeft: section.isSub ? 40 : 0,
                border: '1px solid #0d47a1',
                cursor: 'move',
                color: '#fff'
              }}
            >
              <span style={{ 
                marginRight: 16, 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: '#fff',
                minWidth: '30px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.2)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                {getSectionNumber(section, idx)}
              </span>
              <input
                type="text"
                placeholder={section.isSub ? 'Sub-section title' : 'Section title'}
                value={section.title}
                onChange={e => handleTitleChange(section.id, e.target.value)}
                style={{ flex: 1, fontSize: 16, padding: 8, border: '1px solid #0d47a1', borderRadius: 4, background: '#fff', color: '#333' }}
              />
              <button 
                type="button"
                onClick={() => handleDelete(section.id)} 
                style={{ marginLeft: 8, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                Delete
              </button>
            </div>

            {/* All Items under this section (mixed info, submitted motion, and new motion items) */}
            {[
              ...infoItems.filter(item => item.parentSectionId === section.id).map(item => ({ ...item, type: 'info' })),
              ...motionItems.filter(item => item.parentSectionId === section.id).map(item => ({ ...item, type: 'motion' })),
              ...newMotionItems.filter(item => item.parentSectionId === section.id).map(item => ({ ...item, type: 'newMotion' }))
            ]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((item) => {
              if (item.type === 'info') {
                return (
                  <div
                    key={`info-${item.id}`}
                    draggable
                    onDragStart={(e) => handleInfoItemDragStart(e, item.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleItemDrop(e, item.id, 'infoItem')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#ff9800',
                      borderRadius: 8,
                      marginBottom: 12,
                      padding: '12px 16px',
                      marginLeft: section.isSub ? 80 : 40,
                      border: '1px solid #e68900',
                      color: '#fff',
                      cursor: 'move'
                    }}
                  >
                    <span style={{ 
                      marginRight: 16, 
                      fontSize: 16, 
                      fontWeight: 'bold', 
                      color: '#fff',
                      minWidth: '30px',
                      textAlign: 'center',
                      background: '#e68900',
                      padding: '6px 12px',
                      borderRadius: '6px'
                    }}>
                      {getInfoItemNumber(item)}
                    </span>
                    <div style={{ 
                      flex: 1, 
                      fontSize: 16, 
                      padding: '8px 16px', 
                      border: 'none', 
                      borderRadius: 6, 
                      background: '#fff', 
                      color: '#333',
                      minHeight: '20px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {item.content || 'Enter information item content...'}
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleEditInfoItem(item)} 
                      style={{ marginLeft: 12, background: '#007bff', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                    >
                      Edit Info
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDeleteInfoItem(item.id)} 
                      style={{ marginLeft: 8, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                );
              } else if (item.type === 'motion') {
                return (
                  <div
                    key={`motion-${item.id}`}
                    draggable
                    onDragStart={(e) => handleMotionItemDragStart(e, item.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleItemDrop(e, item.id, 'motionItem')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#28a745',
                      borderRadius: 8,
                      marginBottom: 12,
                      padding: '12px 16px',
                      marginLeft: section.isSub ? 80 : 40,
                      border: '1px solid #1e7e34',
                      color: '#fff',
                      cursor: 'move'
                    }}
                  >
                    <span style={{ 
                      marginRight: 16, 
                      fontSize: 16, 
                      fontWeight: 'bold', 
                      color: '#fff',
                      minWidth: '30px',
                      textAlign: 'center',
                      background: '#1e7e34',
                      padding: '6px 12px',
                      borderRadius: '6px'
                    }}>
                      {getMotionItemNumber(item)}
                    </span>
                    <div style={{ 
                      flex: 1, 
                      fontSize: 16, 
                      padding: '8px 16px', 
                      border: 'none', 
                      borderRadius: 6, 
                      background: '#fff', 
                      color: '#333',
                      minHeight: '20px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {item.title}
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDeleteMotionItem(item.id)} 
                      style={{ marginLeft: 8, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                );
              } else if (item.type === 'newMotion') {
                return (
                  <div
                    key={`new-motion-${item.id}`}
                    draggable
                    onDragStart={(e) => handleNewMotionItemDragStart(e, item.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleItemDrop(e, item.id, 'newMotionItem')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#ffc107',
                      borderRadius: 8,
                      marginBottom: 12,
                      padding: '12px 16px',
                      marginLeft: section.isSub ? 80 : 40,
                      border: '1px solid #e0a800',
                      color: '#000',
                      cursor: 'move'
                    }}
                  >
                    <span style={{ 
                      marginRight: 16, 
                      fontSize: 16, 
                      fontWeight: 'bold', 
                      color: '#fff',
                      minWidth: '30px',
                      textAlign: 'center',
                      background: '#e0a800',
                      padding: '6px 12px',
                      borderRadius: '6px'
                    }}>
                      {getNewMotionItemNumber(item)}
                    </span>
                    <div style={{ 
                      flex: 1, 
                      fontSize: 16, 
                      padding: '8px 16px', 
                      border: 'none', 
                      borderRadius: 6, 
                      background: '#fff', 
                      color: '#333',
                      minHeight: '20px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {item.title || 'Enter new motion title...'}
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleEditNewMotion(item)} 
                      style={{ marginLeft: 12, background: '#007bff', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                    >
                      Edit Motion
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDeleteNewMotion(item.id)} 
                      style={{ marginLeft: 8, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                );
              }
            })}
          </div>
        ))}
        {sections.length === 0 && infoItems.length === 0 && motionItems.length === 0 && newMotionItems.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px 0', fontStyle: 'italic' }}>
            No agenda items yet. Click "+ Section", "+ Information Item", "+ New Motion", or "+ Submitted Motion" to get started.
          </div>
        )}
      </div>
      
      {/* Edit Information Item Modal */}
      {showEditInfoModal && (
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
            padding: '30px',
            borderRadius: '12px',
            minWidth: '500px',
            maxWidth: '600px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#333', textAlign: 'center' }}>Edit Information Item</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                Content:
              </label>
              <textarea
                value={editingInfoItem?.content || ''}
                onChange={(e) => setEditingInfoItem(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter information item content..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={handleCancelEditInfoItem}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#555',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditInfoItem}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit New Motion Item Modal */}
      {showEditNewMotionModal && (
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
            padding: '30px',
            borderRadius: '12px',
            minWidth: '500px',
            maxWidth: '600px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#333', textAlign: 'center' }}>Edit New Motion</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                Motion Title:
              </label>
              <input
                type="text"
                value={editingNewMotion?.title || ''}
                onChange={(e) => setEditingNewMotion(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter motion title..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                Motion Description:
              </label>
              <textarea
                value={editingNewMotion?.description || ''}
                onChange={(e) => setEditingNewMotion(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter motion description..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={handleCancelEditNewMotion}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#555',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditNewMotion}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#ffc107',
                  color: '#333',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Save Motion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';import React, { useState, useEffect } from 'react';

import { getTasks } from '../api';import { getTasks } from '../api';



function TasksPage() {function TasksPage() {

  const [tasks, setTasks] = useState([]);  const [tasks, setTasks] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  const [draggedTask, setDraggedTask] = useState(null);  const [currentUser, setCurrentUser] = useState(null);  



  console.log('TasksPage component mounting...');  const [draggedTask, setDraggedTask] = useState(null);  return (



  // Get current user from localStorage    <div style={{ padding: '20px' }}>

  useEffect(() => {

    console.log('Setting current user...');  console.log('TasksPage component mounting...');      <h1>Task Board - DEBUGGING</h1>

    const userStr = localStorage.getItem('user');

    if (userStr) {      <p>If you can see this message, the component is loading correctly.</p>

      setCurrentUser(JSON.parse(userStr));

    }  // Get current user from localStorage      <div style={{ background: 'yellow', padding: '10px', margin: '10px 0' }}>

  }, []);

  useEffect(() => {        DEBUG: Component rendered successfully

  // Fetch all tasks from backend

  useEffect(() => {    console.log('Setting current user...');      </div>

    console.log('Starting to fetch tasks...');

    async function fetchTasks() {    const userStr = localStorage.getItem('user');    </div>

      try {

        console.log('About to call getTasks API...');    if (userStr) {  );

        const allTasks = await getTasks('all');

        console.log('getTasks returned:', allTasks);      setCurrentUser(JSON.parse(userStr));}

        setTasks(Array.isArray(allTasks) ? allTasks : []);

      } catch (error) {    }

        console.error('Error fetching tasks:', error);

        setTasks([]);  }, []);export default TasksPage;

      }

    }

    fetchTasks();

  }, []);  // Fetch all tasks from backend  // Filter tasks by status (excluding UNAPPROVED)



  console.log('Current tasks in state:', tasks);  useEffect(() => {  const notStartedTasks = tasks.filter(task => task.status === 'NOT_STARTED');



  // Filter tasks by status (excluding UNAPPROVED)    console.log('Starting to fetch tasks...');  const inProgressTasks = tasks.filter(task => task.status === 'IN_PROGRESS');

  const notStartedTasks = tasks.filter(task => task.status === 'NOT_STARTED');

  const inProgressTasks = tasks.filter(task => task.status === 'IN_PROGRESS');    async function fetchTasks() {  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');

  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');

      try {

  console.log('Filtered tasks:', { 

    notStarted: notStartedTasks.length,         console.log('About to call getTasks API...');  console.log('Current tasks state:', tasks);

    inProgress: inProgressTasks.length, 

    completed: completedTasks.length         const allTasks = await getTasks('all'); // Fetch all tasks  console.log('Filtered tasks:', { 

  });

        console.log('getTasks returned:', allTasks);    notStarted: notStartedTasks.length, 

  // Get color based on due date

  const getDueDateColor = (dueDate) => {        setTasks(Array.isArray(allTasks) ? allTasks : []);    inProgress: inProgressTasks.length, 

    if (!dueDate) return '#e9ecef';

          } catch (error) {    completed: completedTasks.length 

    const today = new Date();

    const due = new Date(dueDate);        console.error('Error fetching tasks:', error);  });

    const diffTime = due - today;

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));        setTasks([]);  console.log('NOT_STARTED tasks:', notStartedTasks);



    if (diffDays < 0) return '#dc3545';      }  console.log('IN_PROGRESS tasks:', inProgressTasks);

    if (diffDays <= 7) return '#ffc107';

    return '#28a745';    }  console.log('COMPLETED tasks:', completedTasks);

  };

    fetchTasks();

  // Format due date for display

  const formatDueDate = (dueDate) => {  }, []);  // Get color based on due date

    if (!dueDate) return 'No due date';

    const date = new Date(dueDate);  const getDueDateColor = (dueDate) => {

    return date.toLocaleDateString();

  };  console.log('Current tasks in state:', tasks);    if (!dueDate) return '#e9ecef'; // Gray for no due date



  // Check if current user can drag tasks    

  const canDragTask = (task) => {

    if (!currentUser) return false;  // Filter tasks by status (excluding UNAPPROVED)    const today = new Date();

    return task.userId === currentUser.id || currentUser.role === 'Owner' || currentUser.role === 'Admin';

  };  const notStartedTasks = tasks.filter(task => task.status === 'NOT_STARTED');    const due = new Date(dueDate);



  // Handle drag start  const inProgressTasks = tasks.filter(task => task.status === 'IN_PROGRESS');    const diffTime = due - today;

  const handleDragStart = (e, task) => {

    if (!canDragTask(task)) {  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      e.preventDefault();

      return;

    }

    setDraggedTask(task);  console.log('Filtered tasks:', {     if (diffDays < 0) return '#dc3545'; // Red - overdue

    e.dataTransfer.effectAllowed = 'move';

  };    notStarted: notStartedTasks.length,     if (diffDays <= 7) return '#ffc107'; // Yellow - due within a week



  // Handle drag over    inProgress: inProgressTasks.length,     return '#28a745'; // Green - due in over a week

  const handleDragOver = (e) => {

    e.preventDefault();    completed: completedTasks.length   };

    e.dataTransfer.dropEffect = 'move';

  };  });



  // Handle drop  // Format due date for display

  const handleDrop = async (e, newStatus) => {

    e.preventDefault();  // Get color based on due date  const formatDueDate = (dueDate) => {

    

    if (!draggedTask) return;  const getDueDateColor = (dueDate) => {    if (!dueDate) return 'No due date';

    

    if (draggedTask.status === newStatus) {    if (!dueDate) return '#e9ecef'; // Gray for no due date    return new Date(dueDate).toLocaleDateString();

      setDraggedTask(null);

      return;      };

    }

    const today = new Date();

    try {

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api'}/tasks/${draggedTask.id}`, {    const due = new Date(dueDate);  // Check if current user can drag this task

        method: 'PUT',

        headers: {    const diffTime = due - today;  const canDragTask = (task) => {

          'Authorization': `Bearer ${localStorage.getItem('token')}`,

          'Content-Type': 'application/json'    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));    return currentUser && task.userId === currentUser.id;

        },

        body: JSON.stringify({ status: newStatus })  };

      });

    if (diffDays < 0) return '#dc3545'; // Red - overdue

      if (response.ok) {

        setTasks(prevTasks =>     if (diffDays <= 7) return '#ffc107'; // Yellow - due within a week  // Handle drag start

          prevTasks.map(task => 

            task.id === draggedTask.id     return '#28a745'; // Green - due in over a week  const handleDragStart = (e, task) => {

              ? { ...task, status: newStatus }

              : task  };    if (!canDragTask(task)) {

          )

        );      e.preventDefault();

      } else {

        console.error('Failed to update task status');  // Format due date for display      return;

      }

    } catch (error) {  const formatDueDate = (dueDate) => {    }

      console.error('Error updating task:', error);

    }    if (!dueDate) return 'No due date';    setDraggedTask(task);



    setDraggedTask(null);    const date = new Date(dueDate);    e.dataTransfer.effectAllowed = 'move';

  };

    return date.toLocaleDateString();  };

  // Task Card Component

  const TaskCard = ({ task }) => (  };

    <div

      draggable={canDragTask(task)}  // Handle drag over

      onDragStart={(e) => handleDragStart(e, task)}

      style={{  // Check if current user can drag tasks (modify tasks)  const handleDragOver = (e) => {

        backgroundColor: getDueDateColor(task.due),

        border: '1px solid #ddd',  const canDragTask = (task) => {    e.preventDefault();

        borderRadius: '8px',

        padding: '12px',    if (!currentUser) return false;    e.dataTransfer.dropEffect = 'move';

        margin: '8px 0',

        cursor: canDragTask(task) ? 'grab' : 'default',    // Users can only drag their own tasks or if they are admin/owner  };

        opacity: draggedTask?.id === task.id ? 0.5 : 1,

        color: getDueDateColor(task.due) === '#ffc107' ? '#000' : '#fff'    return task.userId === currentUser.id || currentUser.role === 'Owner' || currentUser.role === 'Admin';

      }}

    >  };  // Handle drop

      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>

        {task.action}  const handleDrop = async (e, newStatus) => {

      </div>

      <div style={{ fontSize: '12px', marginBottom: '4px' }}>  // Handle drag start    e.preventDefault();

        Assigned to: {task.username || 'Unknown'}

      </div>  const handleDragStart = (e, task) => {    

      <div style={{ fontSize: '12px' }}>

        Due: {formatDueDate(task.due)}    if (!canDragTask(task)) {    if (!draggedTask || draggedTask.status === newStatus) {

      </div>

      {task.motion && (      e.preventDefault();      setDraggedTask(null);

        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>

          Motion: {task.motion.title}      return;      return;

        </div>

      )}    }    }

    </div>

  );    setDraggedTask(task);



  // Kanban Column Component    e.dataTransfer.effectAllowed = 'move';    try {

  const KanbanColumn = ({ title, tasks, status, color }) => (

    <div  };      // Update task status via API

      style={{

        flex: 1,      const response = await fetch(`/api/tasks/${draggedTask.id}`, {

        margin: '0 8px',

        backgroundColor: '#f8f9fa',  // Handle drag over        method: 'PUT',

        borderRadius: '8px',

        padding: '16px'  const handleDragOver = (e) => {        headers: {

      }}

      onDragOver={handleDragOver}    e.preventDefault();          'Content-Type': 'application/json',

      onDrop={(e) => handleDrop(e, status)}

    >    e.dataTransfer.dropEffect = 'move';          'Authorization': `Bearer ${localStorage.getItem('token')}`

      <div

        style={{  };        },

          backgroundColor: color,

          color: '#fff',        body: JSON.stringify({ status: newStatus })

          padding: '8px 16px',

          borderRadius: '4px',  // Handle drop      });

          marginBottom: '16px',

          textAlign: 'center',  const handleDrop = async (e, newStatus) => {

          fontWeight: 'bold'

        }}    e.preventDefault();      if (response.ok) {

      >

        {title} ({tasks.length})            // Update local state

      </div>

      <div>    if (!draggedTask) return;        setTasks(prevTasks => 

        {tasks.length === 0 ? (

          <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>              prevTasks.map(task => 

            No tasks

          </div>    if (draggedTask.status === newStatus) {            task.id === draggedTask.id 

        ) : (

          tasks.map(task => (      setDraggedTask(null);              ? { ...task, status: newStatus, dateCompleted: newStatus === 'COMPLETED' ? new Date().toISOString() : task.dateCompleted }

            <TaskCard key={task.id} task={task} />

          ))      return;              : task

        )}

      </div>    }          )

    </div>

  );        );



  return (    try {      } else {

    <div style={{ padding: '20px' }}>

      <h2 style={{ marginBottom: '24px' }}>Task Board</h2>      // Update task status via API        console.error('Failed to update task status');

      <div style={{ display: 'flex', gap: '16px', minHeight: '400px' }}>

        <KanbanColumn       const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api'}/tasks/${draggedTask.id}`, {      }

          title="Not Started" 

          tasks={notStartedTasks}         method: 'PUT',    } catch (error) {

          status="NOT_STARTED"

          color="#007bff"        headers: {      console.error('Error updating task status:', error);

        />

        <KanbanColumn           'Authorization': `Bearer ${localStorage.getItem('token')}`,    }

          title="In Progress" 

          tasks={inProgressTasks}           'Content-Type': 'application/json'

          status="IN_PROGRESS"

          color="#fd7e14"        },    setDraggedTask(null);

        />

        <KanbanColumn         body: JSON.stringify({ status: newStatus })  };

          title="Completed" 

          tasks={completedTasks}       });

          status="COMPLETED"

          color="#28a745"  // Task Card Component

        />

      </div>      if (response.ok) {  const TaskCard = ({ task }) => {

    </div>

  );        // Update local state    const isDraggable = canDragTask(task);

}

        setTasks(prevTasks =>     const cardColor = getDueDateColor(task.due);

export default TasksPage;
          prevTasks.map(task =>     

            task.id === draggedTask.id     return (

              ? { ...task, status: newStatus }      <div

              : task        draggable={isDraggable}

          )        onDragStart={(e) => handleDragStart(e, task)}

        );        style={{

      } else {          backgroundColor: '#fff',

        console.error('Failed to update task status');          borderLeft: `4px solid ${cardColor}`,

      }          borderRadius: '8px',

    } catch (error) {          padding: '12px',

      console.error('Error updating task:', error);          marginBottom: '8px',

    }          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',

          cursor: isDraggable ? 'grab' : 'default',

    setDraggedTask(null);          opacity: isDraggable ? 1 : 0.7,

  };          position: 'relative'

        }}

  // Task Card Component      >

  const TaskCard = ({ task }) => (        {!isDraggable && (

    <div          <div style={{

      draggable={canDragTask(task)}            position: 'absolute',

      onDragStart={(e) => handleDragStart(e, task)}            top: '4px',

      style={{            right: '4px',

        backgroundColor: getDueDateColor(task.due),            fontSize: '12px',

        border: '1px solid #ddd',            color: '#6c757d'

        borderRadius: '8px',          }}>

        padding: '12px',            🔒

        margin: '8px 0',          </div>

        cursor: canDragTask(task) ? 'grab' : 'default',        )}

        opacity: draggedTask?.id === task.id ? 0.5 : 1,        

        color: getDueDateColor(task.due) === '#ffc107' ? '#000' : '#fff'        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>

      }}          {task.action}

    >        </div>

      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>        

        {task.action}        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>

      </div>          Assigned to: {task.username || 'Unknown'}

      <div style={{ fontSize: '12px', marginBottom: '4px' }}>        </div>

        Assigned to: {task.username || 'Unknown'}        

      </div>        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>

      <div style={{ fontSize: '12px' }}>          Due: {formatDueDate(task.due)}

        Due: {formatDueDate(task.due)}        </div>

      </div>        

      {task.motion && (        {task.motionTitle && (

        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>          <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>

          Motion: {task.motion.title}            Motion: {task.motionTitle}

        </div>          </div>

      )}        )}

    </div>        

  );        {task.completeComment && task.status === 'COMPLETED' && (

          <div style={{ fontSize: '12px', color: '#28a745', marginTop: '8px', fontStyle: 'italic' }}>

  // Kanban Column Component            "{task.completeComment}"

  const KanbanColumn = ({ title, tasks, status, color }) => (          </div>

    <div        )}

      style={{      </div>

        flex: 1,    );

        margin: '0 8px',  };

        backgroundColor: '#f8f9fa',

        borderRadius: '8px',  // Column Component

        padding: '16px'  const KanbanColumn = ({ title, tasks, status, color }) => (

      }}    <div style={{ flex: 1, margin: '0 8px' }}>

      onDragOver={handleDragOver}      <div style={{

      onDrop={(e) => handleDrop(e, status)}        backgroundColor: color,

    >        color: '#fff',

      <div        padding: '12px',

        style={{        borderRadius: '8px 8px 0 0',

          backgroundColor: color,        fontWeight: 'bold',

          color: '#fff',        textAlign: 'center',

          padding: '8px 16px',        fontSize: '16px'

          borderRadius: '4px',      }}>

          marginBottom: '16px',        {title} ({tasks.length})

          textAlign: 'center',      </div>

          fontWeight: 'bold'      

        }}      <div

      >        onDragOver={handleDragOver}

        {title} ({tasks.length})        onDrop={(e) => handleDrop(e, status)}

      </div>        style={{

      <div>          backgroundColor: '#f8f9fa',

        {tasks.length === 0 ? (          minHeight: '500px',

          <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>          padding: '16px',

            No tasks          borderRadius: '0 0 8px 8px',

          </div>          border: '2px dashed #dee2e6'

        ) : (        }}

          tasks.map(task => (      >

            <TaskCard key={task.id} task={task} />        {tasks.length === 0 ? (

          ))          <div style={{ textAlign: 'center', color: '#6c757d', marginTop: '20px' }}>

        )}            No tasks

      </div>          </div>

    </div>        ) : (

  );          tasks.map(task => <TaskCard key={task.id} task={task} />)

        )}

  return (      </div>

    <div style={{ padding: '20px' }}>    </div>

      <h2 style={{ marginBottom: '24px' }}>Task Board</h2>  );

      <div style={{ display: 'flex', gap: '16px', minHeight: '400px' }}>

        <KanbanColumn   return (

          title="Not Started"     <div style={{ maxWidth: 1200, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 32 }}>

          tasks={notStartedTasks}       <div style={{ marginBottom: '24px' }}>

          status="NOT_STARTED"        <h2>Task Board</h2>

          color="#007bff"      </div>

        />      

        <KanbanColumn       <div style={{ display: 'flex', gap: '16px' }}>

          title="In Progress"         <KanbanColumn 

          tasks={inProgressTasks}           title="Not Started" 

          status="IN_PROGRESS"          tasks={notStartedTasks} 

          color="#fd7e14"          status="NOT_STARTED"

        />          color="#007bff"

        <KanbanColumn         />

          title="Completed"         <KanbanColumn 

          tasks={completedTasks}           title="In Progress" 

          status="COMPLETED"          tasks={inProgressTasks} 

          color="#28a745"          status="IN_PROGRESS"

        />          color="#fd7e14"

      </div>        />

    </div>        <KanbanColumn 

  );          title="Completed" 

}          tasks={completedTasks} 

          status="COMPLETED"

export default TasksPage;          color="#28a745"
        />
      </div>
    </div>
  );
}

export default TasksPage;
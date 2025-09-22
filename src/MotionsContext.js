import React, { createContext, useContext, useState } from 'react';

// Initial dummy data for outstanding and completed motions
const initialOutstandingMotions = [
  {
    id: 1,
    title: 'Approve 2025 Budget',
    date: '2025-09-10',
    submittedBy: 'Jane Smith',
    votesFor: 3,
    votesAgainst: 1,
    votedFor: ['Jane Smith', 'John Doe', 'You'],
    votedAgainst: ['Alex Lee'],
    userVoted: true,
    tasks: [
      { action: 'Review budget draft', person: 'John Doe', due: '2025-09-12' },
      { action: 'Submit feedback', person: 'Jane Smith', due: '2025-09-13' }
    ]
  },
  {
    id: 2,
    title: 'Adopt New Bylaws',
    date: '2025-09-12',
    submittedBy: 'John Doe',
    votesFor: 2,
    votesAgainst: 2,
    votedFor: ['Jane Smith', 'You'],
    votedAgainst: ['John Doe', 'Alex Lee'],
    userVoted: true,
    tasks: []
  },
  {
    id: 3,
    title: 'New Policy Update',
    date: '2025-09-15',
    submittedBy: 'Alex Lee',
    votesFor: 0,
    votesAgainst: 0,
    votedFor: [],
    votedAgainst: [],
    userVoted: false,
    tasks: []
  }
];

const initialCompletedMotions = [
  {
    id: 101,
    title: 'Ratify Annual Report',
    date: '2025-08-01',
    submittedBy: 'Jane Smith',
    votesFor: 4,
    votesAgainst: 1,
    completedDate: '2025-08-10',
    tasks: [
      { action: 'Prepare summary', person: 'Alex Lee', due: '2025-08-05' },
      { action: 'Distribute report', person: 'Jane Smith', due: '2025-08-08' }
    ]
  },
  {
    id: 102,
    title: 'Change Meeting Schedule',
    date: '2025-07-15',
    submittedBy: 'Alex Lee',
    votesFor: 1,
    votesAgainst: 4,
    completedDate: '2025-07-22',
    tasks: []
  }
];

const MotionsContext = createContext();

export function MotionsProvider({ children }) {
  const [outstandingMotions, setOutstandingMotions] = useState(initialOutstandingMotions);
  const [completedMotions, setCompletedMotions] = useState(initialCompletedMotions);

  return (
    <MotionsContext.Provider value={{ outstandingMotions, setOutstandingMotions, completedMotions, setCompletedMotions }}>
      {children}
    </MotionsContext.Provider>
  );
}

export function useMotions() {
  return useContext(MotionsContext);
}

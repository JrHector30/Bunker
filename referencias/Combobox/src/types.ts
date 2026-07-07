export type CategoryFilter = 'All' | 'Bugs' | 'Features' | 'Docs';
export type ItemCategory = 'Bugs' | 'Features' | 'Docs';

export interface ComboboxItem {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  createdDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'select' | 'filter' | 'search' | 'add' | 'delete' | 'reset' | 'info';
  message: string;
}

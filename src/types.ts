export type IssueStatus = 'pending' | 'in-progress' | 'resolved' | 'dismissed';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueCategory = 'pothole' | 'streetlight' | 'garbage' | 'water' | 'electricity' | 'other';

export type UserRole = 'public' | 'servant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
  status: IssueStatus;
  location: {
    lat?: number;
    lng?: number;
    address: string;
  };
  reporter: string;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  upvotedBy: string[];
  comments: Comment[];
  images?: string[];
  priorityReasoning?: string;
}

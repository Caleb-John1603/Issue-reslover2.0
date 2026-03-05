import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Map as MapIcon,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Issue, IssueStatus, IssuePriority, IssueCategory } from './types';
import { IssueCard } from './components/IssueCard';
import { IssueForm } from './components/IssueForm';
import { MapView } from './components/MapView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { cn } from './lib/utils';
import { LogOut, User as UserIcon } from 'lucide-react';

// Mock initial data with coordinates
const INITIAL_ISSUES: Issue[] = [
  {
    id: '1',
    title: 'Deep Pothole at Intersection',
    description: 'A very deep pothole has formed at the intersection near MG Road. It is causing cars to swerve dangerously.',
    category: 'pothole',
    priority: 'high',
    status: 'pending',
    location: { address: 'MG Road, Bengaluru', lat: 12.9756, lng: 77.6067 },
    reporter: 'John Doe',
    reporterId: 'user1',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 24,
    upvotedBy: [],
    comments: [],
  },
  {
    id: '2',
    title: 'Broken Streetlight',
    description: 'The streetlight near Cubbon Park entrance is flickering and mostly dark at night, making the area feel unsafe.',
    category: 'streetlight',
    priority: 'medium',
    status: 'in-progress',
    location: { address: 'Cubbon Park, Bengaluru', lat: 12.9779, lng: 77.5952 },
    reporter: 'Jane Smith',
    reporterId: 'user2',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 12,
    upvotedBy: [],
    comments: [],
  },
  {
    id: '3',
    title: 'Garbage Overflow',
    description: 'Public bins are overflowing in the Commercial Street market area. It has been like this for 3 days.',
    category: 'garbage',
    priority: 'critical',
    status: 'pending',
    location: { address: 'Commercial Street, Bengaluru', lat: 12.9822, lng: 77.6083 },
    reporter: 'Mike Ross',
    reporterId: 'user3',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 45,
    upvotedBy: [],
    comments: [],
  },
  {
    id: '4',
    title: 'Water Leakage',
    description: 'Main pipe burst near Indiranagar community center. Significant water wastage.',
    category: 'water',
    priority: 'critical',
    status: 'resolved',
    location: { address: 'Indiranagar, Bengaluru', lat: 12.9719, lng: 77.6412 },
    reporter: 'Sarah Connor',
    reporterId: 'user4',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 89,
    upvotedBy: [],
    comments: [],
  }
];

function CivicFixApp() {
  const { user, logout, isAuthenticated } = useAuth();
  const [issues, setIssues] = useState<Issue[]>(() => {
    const saved = localStorage.getItem('civic-fix-issues');
    return saved ? JSON.parse(saved) : INITIAL_ISSUES;
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<IssueStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'upvotes' | 'priority'>('newest');
  const [view, setView] = useState<'home' | 'map'>('home');

  useEffect(() => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('civic-fix-issues', JSON.stringify(issues));
  }, [issues]);

  const handleReportIssue = (data: any) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    
    // Use coordinates from form if available, otherwise generate random ones around Bengaluru
    const lat = data.lat || (12.9716 + (Math.random() - 0.5) * 0.1);
    const lng = data.lng || (77.5946 + (Math.random() - 0.5) * 0.1);

    if (editingIssue) {
      setIssues(issues.map(issue => 
        issue.id === editingIssue.id 
          ? { 
              ...issue, 
              title: data.title, 
              description: data.description, 
              category: data.category, 
              priority: data.priority, 
              location: { ...issue.location, address: data.address, lat: data.lat, lng: data.lng },
              images: data.images,
              priorityReasoning: data.priorityReasoning,
              updatedAt: new Date().toISOString()
            } 
          : issue
      ));
      setEditingIssue(null);
    } else {
      const newIssue: Issue = {
        id: Math.random().toString(36).substr(2, 9),
        title: data.title,
        description: data.description,
        category: data.category as IssueCategory,
        priority: data.priority as IssuePriority,
        status: 'pending',
        location: { address: data.address, lat, lng },
        reporter: user?.name || 'Anonymous User',
        reporterId: user?.id || 'anonymous',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        upvotes: 0,
        upvotedBy: [],
        comments: [],
        images: data.images || [],
        priorityReasoning: data.priorityReasoning,
      };
      setIssues([newIssue, ...issues]);
    }
  };

  const handleEdit = (issue: Issue) => {
    setEditingIssue(issue);
    setIsFormOpen(true);
  };

  const handleUpvote = (id: string) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!user) return;

    setIssues(issues.map(issue => {
      if (issue.id === id) {
        const upvotedBy = issue.upvotedBy || [];
        const hasUpvoted = upvotedBy.includes(user.id);
        if (hasUpvoted) {
          return {
            ...issue,
            upvotes: issue.upvotes - 1,
            upvotedBy: upvotedBy.filter(uid => uid !== user.id)
          };
        }
        return { 
          ...issue, 
          upvotes: issue.upvotes + 1,
          upvotedBy: [...upvotedBy, user.id]
        };
      }
      return issue;
    }));
  };

  const handleAddComment = (issueId: string, text: string) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!user) return;

    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      text,
      createdAt: new Date().toISOString(),
    };

    setIssues(issues.map(issue => 
      issue.id === issueId 
        ? { ...issue, comments: [...(issue.comments || []), newComment] } 
        : issue
    ));
  };

  const handleStatusChange = (id: string, status: IssueStatus) => {
    setIssues(issues.map(issue => 
      issue.id === id ? { ...issue, status, updatedAt: new Date().toISOString() } : issue
    ));
  };

  const filteredIssues = useMemo(() => {
    return issues
      .filter(issue => {
        const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            issue.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'upvotes') return b.upvotes - a.upvotes;
        if (sortBy === 'priority') {
          const weights = { critical: 4, high: 3, medium: 2, low: 1 };
          return weights[b.priority] - weights[a.priority];
        }
        return 0;
      });
  }, [issues, searchQuery, filterStatus, sortBy]);

  const stats = useMemo(() => {
    const relevantIssues = (user?.role === 'servant') ? issues : (user ? issues.filter(i => i.reporterId === user.id) : []);
    return {
      total: relevantIssues.length,
      pending: relevantIssues.filter(i => i.status === 'pending').length,
      resolved: relevantIssues.filter(i => i.status === 'resolved').length,
      critical: relevantIssues.filter(i => i.priority === 'critical').length,
    };
  }, [issues, user]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">CivicFix</h1>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-4">
              <button 
                onClick={() => setView('home')}
                className={cn(
                  "text-sm font-medium transition-colors",
                  view === 'home' ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                )}
              >
                Home
              </button>
              <button 
                onClick={() => setView('map')}
                className={cn(
                  "text-sm font-medium transition-colors",
                  view === 'map' ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                )}
              >
                Map View
              </button>
            </nav>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-zinc-900">{user?.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {user?.role === 'servant' ? 'Public Servant' : 'General Public'}
                    </span>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 hover:text-red-500 transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-5 py-2 bg-zinc-900 text-white text-sm font-bold rounded-full hover:bg-zinc-800 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Issues', value: stats.total, icon: List, color: 'text-zinc-600' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600' },
            { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Critical', value: stats.critical, icon: TrendingUp, color: 'text-red-600' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={cn("w-5 h-5", stat.color)} />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-zinc-900">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-white border border-zinc-200 rounded-xl p-1">
              {(['all', 'pending', 'resolved'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                    filterStatus === status 
                      ? "bg-zinc-900 text-white shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-900/5"
            >
              <option value="newest">Newest First</option>
              <option value="upvotes">Most Upvoted</option>
              <option value="priority">Highest Priority</option>
            </select>

            <button
              onClick={() => isAuthenticated ? setIsFormOpen(true) : setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Report Issue</span>
            </button>
          </div>
        </div>

        {/* Issues Grid / Map View */}
        {view === 'home' ? (
          filteredIssues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredIssues.map((issue) => (
                  <IssueCard 
                    key={issue.id} 
                    issue={issue} 
                    onUpvote={handleUpvote}
                    onStatusChange={handleStatusChange}
                    onAddComment={handleAddComment}
                    onEdit={handleEdit}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-zinc-300" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">No issues found</h3>
              <p className="text-zinc-500 max-w-xs">
                Try adjusting your search or filters to find what you're looking for.
              </p>
            </div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <MapView 
              issues={filteredIssues} 
              onUpvote={handleUpvote} 
              onStatusChange={handleStatusChange}
            />
          </motion.div>
        )}
      </main>

      <IssueForm 
        isOpen={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false);
          setEditingIssue(null);
        }} 
        onSubmit={handleReportIssue}
        initialData={editingIssue}
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-zinc-900" />
            <span className="font-bold text-zinc-900">CivicFix</span>
          </div>
          <p className="text-sm text-zinc-500">
            © 2026 CivicFix Platform. Empowering communities through transparency.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-zinc-500 hover:text-zinc-900">Privacy</a>
            <a href="#" className="text-sm text-zinc-500 hover:text-zinc-900">Terms</a>
            <a href="#" className="text-sm text-zinc-500 hover:text-zinc-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CivicFixApp />
    </AuthProvider>
  );
}

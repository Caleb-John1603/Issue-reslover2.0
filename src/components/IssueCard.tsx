import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, ThumbsUp, MessageSquare, Clock, Tag, Send, User as UserIcon, Shield, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Issue, IssueStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface IssueCardProps {
  issue: Issue;
  onUpvote: (id: string) => void;
  onStatusChange: (id: string, status: IssueStatus) => void;
  onAddComment: (id: string, text: string) => void;
  onEdit?: (issue: Issue) => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onUpvote, onStatusChange, onAddComment, onEdit }) => {
  const { user } = useAuth();
  const isServant = user?.role === 'servant';
  const isReporter = user?.id === issue.reporterId;
  const canEdit = isReporter && issue.status !== 'resolved' && issue.status !== 'dismissed';
  const upvotedBy = issue.upvotedBy || [];
  const comments = issue.comments || [];
  const hasUpvoted = user ? upvotedBy.includes(user.id) : false;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(issue.id, commentText);
    setCommentText('');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        "bg-white rounded-2xl border border-zinc-200 p-5 hover:shadow-md transition-all duration-200 group cursor-pointer",
        isExpanded && "ring-2 ring-zinc-900/5 shadow-lg"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-wrap gap-2 items-center" onClick={(e) => e.stopPropagation()}>
          <div className="relative group/priority">
            <PriorityBadge priority={issue.priority} />
            {issue.priorityReasoning && (
              <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/priority:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg border border-white/10">
                {issue.priorityReasoning}
                <div className="absolute top-full left-4 -translate-y-1/2 border-4 border-transparent border-t-zinc-900" />
              </div>
            )}
          </div>
          <StatusBadge status={issue.status} />
          
          {isServant && (
            <select 
              value={issue.status}
              onChange={(e) => onStatusChange(issue.id, e.target.value as IssueStatus)}
              className="text-[10px] font-bold uppercase tracking-tight bg-zinc-50 border border-zinc-200 rounded px-1 py-0.5 outline-none hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          )}
        </div>
        <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-zinc-900 mb-2 group-hover:text-blue-600 transition-colors">
        {issue.title}
      </h3>
      
      <p className={cn(
        "text-zinc-600 text-sm mb-4 leading-relaxed transition-all",
        !isExpanded && "line-clamp-2"
      )}>
        {issue.description}
      </p>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {issue.images && issue.images.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {issue.images.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0 w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-zinc-100 mb-2">
                    <img src={img} alt="Issue" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            
            <div className="bg-zinc-50 rounded-xl p-4 mb-4 border border-zinc-100">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Detailed Location</h4>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-zinc-700 leading-snug">{issue.location.address}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${issue.location.lat},${issue.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  View on Google Maps
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 text-zinc-500 text-xs mb-4">
        {!isExpanded && (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="truncate">{issue.location.address}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              <span className="capitalize">{issue.category}</span>
            </div>
          </>
        )}
        {isExpanded && (
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-zinc-400" />
            <span className="capitalize font-medium text-zinc-700">{issue.category} Category</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpvote(issue.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border",
              hasUpvoted 
                ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                : "bg-zinc-50 text-zinc-500 hover:bg-blue-50 hover:text-blue-600 border-zinc-100"
            )}
          >
            <ThumbsUp className={cn("w-3.5 h-3.5", hasUpvoted && "fill-current")} />
            <span className="font-semibold">{issue.upvotes}</span>
          </button>
          <button 
            onClick={() => {
              setIsExpanded(true);
              setShowComments(!showComments);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border",
              showComments
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 border-zinc-100"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="font-semibold">{comments.length}</span>
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition-colors ml-2"
          >
            {isExpanded ? 'Show Less' : 'View Details'}
          </button>
          {canEdit && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(issue);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-all border border-zinc-200 ml-2"
            >
              <Edit2 className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase">Edit</span>
            </button>
          )}
        </div>
        
        <div className="flex -space-x-2">
          {upvotedBy.slice(0, 3).map((uid, i) => (
            <div key={uid} className="w-6 h-6 rounded-full border-2 border-white bg-zinc-200 overflow-hidden">
              <img 
                src={`https://picsum.photos/seed/${uid}/32/32`} 
                alt="User" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
          {upvotedBy.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[8px] font-bold text-zinc-500">
              +{upvotedBy.length - 3}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-zinc-100 space-y-4">
              <div className="max-h-48 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {comments.length === 0 ? (
                  <p className="text-center text-zinc-400 py-2 text-xs italic">No comments yet. Be the first to discuss!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center",
                        comment.userRole === 'servant' ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-400"
                      )}>
                        {comment.userRole === 'servant' ? (
                          <Shield className="w-3.5 h-3.5" />
                        ) : (
                          <UserIcon className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 bg-zinc-50 rounded-2xl p-3">
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-zinc-900 truncate">{comment.userName}</span>
                            {comment.userRole === 'servant' && (
                              <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-500 text-[7px] font-bold uppercase tracking-widest rounded-full border border-blue-100/50 whitespace-nowrap leading-none">
                                <Shield className="w-2 h-2 fill-current" />
                                Public Servant
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 flex-shrink-0">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={user ? "Add a comment..." : "Sign in to comment"}
                  disabled={!user}
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!user || !commentText.trim()}
                  className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:hover:bg-zinc-900"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Issue } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { IssueStatus } from '../types';
import { cn } from '../lib/utils';

// Fix for default Leaflet marker icons in Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  issues: Issue[];
  onUpvote: (id: string) => void;
  onStatusChange: (id: string, status: IssueStatus) => void;
}

// Component to handle map center updates
const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

export const MapView: React.FC<MapViewProps> = ({ issues, onUpvote, onStatusChange }) => {
  const { user } = useAuth();
  const isServant = user?.role === 'servant';
  
  // Filter issues that have coordinates
  const validIssues = issues.filter(issue => issue.location.lat !== undefined && issue.location.lng !== undefined);
  
  // Default center (Bengaluru, India)
  const defaultCenter: [number, number] = [12.9716, 77.5946];
  const center = validIssues.length > 0 
    ? [validIssues[0].location.lat!, validIssues[0].location.lng!] as [number, number]
    : defaultCenter;

  return (
    <div className="h-[600px] w-full rounded-3xl overflow-hidden border border-zinc-200 shadow-sm z-0">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={center} />
        {validIssues.map((issue) => (
          <Marker 
            key={issue.id} 
            position={[issue.location.lat!, issue.location.lng!]}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[200px]">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <StatusBadge status={issue.status} className="scale-90 origin-left" />
                  <div className="relative group/map-priority">
                    <PriorityBadge priority={issue.priority} className="scale-90 origin-right" />
                    {issue.priorityReasoning && (
                      <div className="absolute bottom-full right-0 mb-1 w-32 p-1.5 bg-zinc-900 text-white text-[9px] rounded shadow-lg opacity-0 group-hover/map-priority:opacity-100 transition-opacity pointer-events-none z-[1000]">
                        {issue.priorityReasoning}
                      </div>
                    )}
                  </div>
                </div>

                {isServant && (
                  <select 
                    value={issue.status}
                    onChange={(e) => onStatusChange(issue.id, e.target.value as IssueStatus)}
                    className="w-full mb-2 text-[10px] font-bold uppercase tracking-tight bg-zinc-50 border border-zinc-200 rounded px-1 py-1 outline-none hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                )}

                <h3 className="font-bold text-zinc-900 text-sm mb-1">{issue.title}</h3>
                
                {issue.images && issue.images.length > 0 && (
                  <div className="w-full h-24 rounded-lg overflow-hidden border border-zinc-100 mb-2 mt-1">
                    <img 
                      src={issue.images[0]} 
                      alt={issue.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <p className="text-zinc-500 text-xs mb-3 line-clamp-2">{issue.description}</p>
                
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mb-3">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{issue.location.address}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                  </span>
                  <button 
                    onClick={() => onUpvote(issue.id)}
                    className={cn(
                      "text-xs font-bold transition-colors",
                      user && (issue.upvotedBy || []).includes(user.id) 
                        ? "text-blue-600" 
                        : "text-zinc-400 hover:text-blue-600"
                    )}
                  >
                    Upvote ({issue.upvotes})
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

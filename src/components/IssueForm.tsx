import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, MapPin, AlertCircle, Loader2, Image as ImageIcon, Trash2, Sparkles, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Issue, IssueCategory, IssuePriority } from '../types';
import { cn } from '../lib/utils';
import { analyzeIssuePriority } from '../services/aiService';

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

const issueSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['pothole', 'streetlight', 'garbage', 'water', 'electricity', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  address: z.string().min(5, 'Address is required'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  images: z.array(z.string()).optional(),
});

type IssueFormData = z.infer<typeof issueSchema>;

interface IssueFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IssueFormData) => void;
  initialData?: Issue | null;
}

const LocationPicker = ({ onLocationSelect, position, image }: { onLocationSelect: (lat: number, lng: number) => void, position: [number, number] | null, image?: string }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position);
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position ? (
    <Marker position={position} icon={DefaultIcon}>
      {image && (
        <Popup>
          <div className="w-32 h-24 rounded-lg overflow-hidden border border-zinc-100">
            <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <p className="text-[10px] text-center mt-1 text-zinc-500 font-bold uppercase">Selected Location</p>
        </Popup>
      )}
    </Marker>
  ) : null;
};

export const IssueForm: React.FC<IssueFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [images, setImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reasoning, setReasoning] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      priority: 'medium',
      category: 'pothole',
      images: [],
      lat: 12.9716,
      lng: 77.5946,
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description,
        category: initialData.category,
        priority: initialData.priority,
        address: initialData.location.address,
        lat: initialData.location.lat,
        lng: initialData.location.lng,
        images: initialData.images || [],
      });
      setImages(initialData.images || []);
      setReasoning(initialData.priorityReasoning || '');
      setShowMap(true);
    } else {
      reset({
        priority: 'medium',
        category: 'pothole',
        images: [],
        lat: 12.9716,
        lng: 77.5946,
        title: '',
        description: '',
        address: '',
      });
      setImages([]);
      setReasoning('');
      setShowMap(false);
    }
  }, [initialData, reset]);

  const currentCategory = watch('category');
  const currentPriority = watch('priority');
  const currentTitle = watch('title');
  const currentDescription = watch('description');
  const currentAddress = watch('address');
  const currentLat = watch('lat');
  const currentLng = watch('lng');

  const selectedPosition: [number, number] | null = currentLat && currentLng ? [currentLat, currentLng] : null;

  // Get current location on mount
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setValue('lat', latitude);
          setValue('lng', longitude);
          
          // Reverse geocode to get address
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
            .then(res => res.json())
            .then(data => {
              if (data.display_name && !currentAddress) {
                setValue('address', data.display_name);
              }
            })
            .catch(err => console.error('Reverse geocoding error:', err));
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, [isOpen, setValue]);

  // Re-trigger analysis when title/description/address/category change if images exist
  useEffect(() => {
    const triggerAnalysis = async () => {
      if (images.length > 0 && currentTitle.length >= 5 && currentDescription.length >= 1 && currentAddress.length >= 5 && !isAnalyzing) {
        setIsAnalyzing(true);
        setValidationError(null);
        try {
          const result = await analyzeIssuePriority(images[0], currentTitle, currentDescription, currentAddress, currentCategory);
          setValue('priority', result.priority);
          setReasoning(result.reasoning);
          if (!result.isValid) {
            setValidationError(result.validationMessage || "The image doesn't seem to match the reported category or description.");
          }
        } finally {
          setIsAnalyzing(false);
        }
      }
    };

    const timer = setTimeout(triggerAnalysis, 1000); // Debounce
    return () => clearTimeout(timer);
  }, [currentTitle, currentDescription, currentAddress, currentCategory, images.length]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImages(prev => {
          const newImages = [...prev, base64String];
          setValue('images', newImages);
          return newImages;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      setValue('images', newImages);
      return newImages;
    });
  };

  const handleFormSubmit = async (data: IssueFormData) => {
    await onSubmit({ ...data, images, priorityReasoning: reasoning } as any);
    reset();
    setImages([]);
    setReasoning('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{initialData ? 'Edit Report' : 'Report an Issue'}</h2>
                <p className="text-sm text-zinc-500">{initialData ? 'Update the details of your report' : 'Help us improve your neighborhood'}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Title</label>
                <input
                  {...register('title')}
                  placeholder="e.g., Large pothole on Main St"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all",
                    errors.title && "border-red-500 focus:ring-red-500/20"
                  )}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Category</label>
                  <select
                    {...register('category')}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                  >
                    <option value="pothole">Pothole</option>
                    <option value="streetlight">Streetlight</option>
                    <option value="garbage">Garbage</option>
                    <option value="water">Water Issue</option>
                    <option value="electricity">Electricity</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Priority (AI Determined)</label>
                  <div className="relative group">
                    <div className={cn(
                      "w-full px-4 py-2.5 rounded-xl border border-zinc-100 bg-zinc-50 flex items-center justify-between cursor-help",
                      isAnalyzing && "animate-pulse"
                    )}>
                      <span className={cn(
                        "font-bold uppercase text-xs",
                        currentPriority === 'critical' && "text-red-600",
                        currentPriority === 'high' && "text-orange-600",
                        currentPriority === 'medium' && "text-blue-600",
                        currentPriority === 'low' && "text-zinc-600"
                      )}>
                        {isAnalyzing ? "Analyzing..." : currentPriority}
                      </span>
                      {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                    
                    {/* Reasoning Tooltip */}
                    {!isAnalyzing && reasoning && (
                      <div className="absolute bottom-full left-0 mb-2 w-full p-3 bg-zinc-900 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-white/10">
                        <div className="font-bold mb-1 uppercase tracking-wider text-[9px] text-zinc-400">AI Reasoning</div>
                        {reasoning}
                        <div className="absolute top-full left-6 -translate-y-1/2 border-8 border-transparent border-t-zinc-900" />
                      </div>
                    )}
                  </div>
                  
                  {/* Help text - only show before analysis */}
                  {!reasoning && !isAnalyzing && (
                    <p className="text-[10px] text-zinc-400 italic">Priority is automatically set based on your uploaded images.</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Location</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            const { latitude, longitude } = pos.coords;
                            setValue('lat', latitude);
                            setValue('lng', longitude);
                            setShowMap(true);
                          });
                        }
                      }}
                      className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      Locate Me
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMap(!showMap)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <MapIcon className="w-3 h-3" />
                      {showMap ? 'Hide Map' : 'Select on Map'}
                    </button>
                  </div>
                </div>
                
                <AnimatePresence>
                  {showMap && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 200, opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="w-full rounded-xl overflow-hidden border border-zinc-200 z-0"
                    >
                      <MapContainer 
                        center={selectedPosition || [12.9716, 77.5946]} 
                        zoom={13} 
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationPicker 
                          position={selectedPosition}
                          image={images[0]}
                          onLocationSelect={(lat, lng) => {
                            setValue('lat', lat);
                            setValue('lng', lng);
                          }}
                        />
                      </MapContainer>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                    <input
                      {...register('address')}
                      placeholder="Enter street address or landmark"
                      className={cn(
                        "w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all",
                        errors.address && "border-red-500 focus:ring-red-500/20"
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isSearching}
                    onClick={async () => {
                      const address = watch('address');
                      if (address && address.length > 5) {
                        setIsSearching(true);
                        setSearchError(null);
                        try {
                          // Try Nominatim first
                          let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
                            headers: { 'Accept-Language': 'en' }
                          });
                          
                          if (!response.ok) {
                            // Fallback to geocode.maps.co
                            response = await fetch(`https://geocode.maps.co/search?q=${encodeURIComponent(address)}`);
                          }
                          
                          if (!response.ok) throw new Error('Geocoding services failed');
                          const data = await response.json();
                          
                          if (data && data.length > 0) {
                            const { lat, lon } = data[0];
                            setValue('lat', parseFloat(lat));
                            setValue('lng', parseFloat(lon));
                            setShowMap(true);
                          } else {
                            setSearchError('Address not found. Please try a different search or select on map.');
                          }
                        } catch (error) {
                          console.error('Geocoding error:', error);
                          setSearchError('Search failed. Please try selecting the location manually on the map.');
                        } finally {
                          setIsSearching(false);
                        }
                      }
                    }}
                    className="px-4 py-2.5 bg-zinc-100 text-zinc-600 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-all border border-zinc-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
                  </button>
                </div>
                {searchError && <p className="text-[10px] text-red-500 mt-1">{searchError}</p>}
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
                {selectedPosition && (
                  <p className="text-[10px] text-zinc-400">
                    Coordinates: {selectedPosition[0].toFixed(4)}, {selectedPosition[1].toFixed(4)}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Provide more details about the issue..."
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none",
                    errors.description && "border-red-500 focus:ring-red-500/20"
                  )}
                />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Images</label>
                <div className="flex flex-wrap gap-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 group">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-all"
                  >
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Add</span>
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                {validationError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mt-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-600 font-medium leading-relaxed">
                      {validationError}
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isAnalyzing || !!validationError}
                  className="w-full py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    initialData ? 'Update Report' : 'Submit Report'
                  )}
                </button>
                {validationError && (
                  <p className="text-[10px] text-center text-red-500 mt-2 font-medium">
                    Please upload a valid image matching the issue details to submit.
                  </p>
                )}
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

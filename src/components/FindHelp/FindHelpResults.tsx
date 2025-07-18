'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { useSearchNavigation } from '@/contexts/SearchNavigationContext';
import { useSearchParams } from 'next/navigation';
import ServiceCard from './ServiceCard';
import FilterPanel from './FilterPanel';
import GoogleMap from '@/components/MapComponent/GoogleMap';
import type { ServiceWithDistance } from '@/types';

interface Props {
  services: ServiceWithDistance[];
  loading?: boolean;
  error?: string | null;
}

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  organisation?: string;
  organisationSlug: string;
  serviceName?: string;
  distanceKm?: number;
  icon?: string;
}

export default function FindHelpResults({ services, loading = false, error = null }: Props) {
  const { location } = useLocation();
  const { saveSearchState, searchState } = useSearchNavigation();
  const searchParams = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [showMap, setShowMap] = useState(false);
  const [sortOrder, setSortOrder] = useState<'distance' | 'alpha'>('distance');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [openDescriptionId, setOpenDescriptionId] = useState<string | null>(null);
  const [isRestoringState, setIsRestoringState] = useState(false);

  // Filter services by category and subcategory (radius filtering is now handled by API)
  const filteredServices = useMemo(() => {
    if (!services || services.length === 0) return [];
    
    return services.filter((service) => {
      const categoryMatch = selectedCategory ? service.category === selectedCategory : true;
      const subCategoryMatch = selectedSubCategory ? service.subCategory === selectedSubCategory : true;
      return categoryMatch && subCategoryMatch;
    });
  }, [services, selectedCategory, selectedSubCategory]);

  const sortedServices = useMemo(() => {
    if (sortOrder === 'alpha') {
      return [...filteredServices].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...filteredServices].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [filteredServices, sortOrder]);

  // Restore search state if available
  useEffect(() => {
    if (searchState && !isRestoringState) {
      setIsRestoringState(true);
      setSortOrder(searchState.filters.sortOrder);
      setSelectedCategory(searchState.filters.selectedCategory);
      setSelectedSubCategory(searchState.filters.selectedSubCategory);
      
      // Restore scroll position after a short delay to ensure DOM is ready
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = searchState.scrollPosition;
        }
        setIsRestoringState(false);
      }, 100);
    }
  }, [searchState, isRestoringState]);

  // Save search state when navigating away
  const handleServiceNavigation = () => {
    const currentScrollPosition = scrollContainerRef.current?.scrollTop || 0;
    const currentSearchParams: Record<string, string> = {};
    
    searchParams.forEach((value, key) => {
      currentSearchParams[key] = value;
    });

    saveSearchState({
      services,
      scrollPosition: currentScrollPosition,
      filters: {
        selectedCategory,
        selectedSubCategory,
        sortOrder,
      },
      searchParams: currentSearchParams,
    });
  };

  const combinedMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = filteredServices.map((s) => ({
      id: s.id,
      lat: s.latitude,
      lng: s.longitude,
      title: s.name,
      organisation: s.organisation?.name,
      organisationSlug: s.organisationSlug,
      serviceName: s.name,
      distanceKm: s.distance,
    }));

    if (location && location.lat != null && location.lng != null) {
      markers.unshift({
        id: 'user-location',
        lat: location.lat,
        lng: location.lng,
        title: 'You are here',
        organisationSlug: 'user-location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      });
    }

    return markers;
  }, [filteredServices, location]);

  return (
    <section className="flex flex-col lg:flex-row items-start px-4 sm:px-6 md:px-8 py-6 gap-6 max-w-7xl mx-auto h-auto lg:h-[calc(100vh-4rem)]">
      <div className={`w-full ${showMap ? 'lg:w-1/2' : 'lg:w-full'} flex flex-col h-auto lg:h-full`}>
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-2">Services near you</h1>
          <FilterPanel
            selectedCategory={selectedCategory}
            selectedSubCategory={selectedSubCategory}
            setSelectedCategory={setSelectedCategory}
            setSelectedSubCategory={setSelectedSubCategory}
          />
          <div className="flex items-center flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <label htmlFor="sortOrder" className="text-sm font-medium">Sort by:</label>
              <select
                id="sortOrder"
                className="border px-2 py-1 rounded"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'distance' | 'alpha')}
              >
                <option value="distance">Distance</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>
            <button
              onClick={() => setShowMap(!showMap)}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 ml-auto"
            >
              {showMap ? 'Hide map' : 'Show map'}
            </button>
          </div>
        </div>

        {showMap && (
          <div className="block lg:hidden w-full mb-4" data-testid="map-container">
            <GoogleMap
              center={
                location && location.lat !== undefined && location.lng !== undefined
                  ? { lat: location.lat, lng: location.lng }
                  : null
              }
              markers={combinedMarkers}
            />
          </div>
        )}

        <div ref={scrollContainerRef} className="flex-1 overflow-y-visible lg:overflow-y-auto pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="status" aria-label="Loading"></div>
              <span className="ml-2 text-gray-600">Loading services...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading services</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : sortedServices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">No services found matching your criteria.</p>
              <p className="text-sm text-gray-500">Try adjusting your filters or search in a different area.</p>
            </div>
          ) : (
            <div className={`gap-4 ${showMap ? 'flex flex-col' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {sortedServices.map((service) => (
                <div
                  key={service.id}
                  className="border border-gray-300 rounded-md p-4 bg-white flex flex-col"
                >
                  <ServiceCard
                    service={service}
                    isOpen={openDescriptionId === service.id}
                    onToggle={() =>
                      setOpenDescriptionId(openDescriptionId === service.id ? null : service.id)
                    }
                    onNavigate={handleServiceNavigation}
                  />
                  {service.distance !== undefined && (
                    <p className="text-sm text-gray-500 mt-auto pt-4">
                      Approx. {service.distance.toFixed(1)} km away
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showMap && (
        <div className="hidden lg:block w-full lg:w-1/2 mt-8 lg:mt-0 lg:sticky lg:top-[6.5rem] min-h-[400px]" data-testid="map-container">
          <GoogleMap
            center={
              location && location.lat !== undefined && location.lng !== undefined
                ? { lat: location.lat, lng: location.lng }
                : null
            }
            markers={combinedMarkers}
          />
        </div>
      )}
    </section>
  );
}
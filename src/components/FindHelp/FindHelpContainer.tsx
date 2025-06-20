'use client';

import { useEffect, useState } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import FindHelpEntry from './FindHelpEntry';
import FindHelpResults from './FindHelpResults';
import type { UIFlattenedService } from '@/types';
import { decodeHtmlEntities } from '@/utils/htmlDecode';
import { categoryKeyToName, subCategoryKeyToName } from '@/utils/categoryLookup';

export default function FindHelpContainer() {
  const { location } = useLocation();
  const [services, setServices] = useState<UIFlattenedService[]>([]);

  useEffect(() => {
    if (!location) return;

    async function load() {
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (location.lat != null && location.lng != null) {
          params.append('lat', location.lat.toString());
          params.append('lng', location.lng.toString());
        }
        const res = await fetch(`/api/services?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch services');
        }
        const raw = await res.json();
        const rawArray = raw.results || [];
        const mapped: UIFlattenedService[] = rawArray.map((item: any) => {
          const coords = item.Address?.Location?.coordinates || [0, 0];
          return {
            id: item._id || item.id,
            name: decodeHtmlEntities(item.ServiceProviderName || item.name || ''),
            description: decodeHtmlEntities(item.Info || item.description || ''),
            category: item.ParentCategoryKey || item.category || '',
            categoryName:
              categoryKeyToName[item.ParentCategoryKey] ||
              item.ParentCategoryKey ||
              '',
            subCategory: item.SubCategoryKey || item.subCategory || '',
            subCategoryName:
              subCategoryKeyToName[item.SubCategoryKey] ||
              item.SubCategoryKey ||
              '',
            latitude: coords[1],
            longitude: coords[0],
            organisation: {
              name: decodeHtmlEntities(
                item.organisation?.name || item.ServiceProviderName || ''
              ),
              slug: item.organisation?.slug || item.ServiceProviderKey || '',
              isVerified: item.organisation?.isVerified || false,
            },
            organisationSlug: item.organisation?.slug || item.ServiceProviderKey || '',
            clientGroups: item.ClientGroups || [],
            openTimes: item.OpeningTimes || [],
          };
        });
        setServices(mapped);
      } catch (err) {
        console.error('Failed to fetch services', err);
        setServices([]);
      }
    }

    load();
  }, [location]);

  return (
    <div>
      <FindHelpEntry />
      <FindHelpResults services={services} />
    </div>
  );
}

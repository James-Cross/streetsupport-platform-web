import { NextResponse } from 'next/server';
import { getClientPromise } from '@/utils/mongodb';
import fallbackProviders from '@/data/service-providers.json';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get('location');
  const category = searchParams.get('category');
  const lat = parseFloat(searchParams.get('lat') || 'NaN');
  const lng = parseFloat(searchParams.get('lng') || 'NaN');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (page < 1 || limit < 1) {
    return NextResponse.json(
      { status: 'error', message: 'Invalid page or limit value' },
      { status: 400 }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db('streetsupport');
    const servicesCol = db.collection('ProvidedServices');
    const providersCol = db.collection('ServiceProviders');

    const query: any = {
      IsPublished: true
    };

    if (location) {
      query['Address.City'] = { $regex: new RegExp(`^${location}$`, 'i') };
    }

    if (category) {
      query.ParentCategoryKey = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    const total = await servicesCol.countDocuments(query);

    let services: any[];

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      services = await servicesCol
        .aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [lng, lat] },
              distanceField: 'distance',
              spherical: true,
              distanceMultiplier: 0.001,
              query,
            },
          },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ])
        .toArray();
    } else {
      services = await servicesCol
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();
    }

    const results = await Promise.all(
      services.map(async (service) => {
        const provider = await providersCol.findOne(
          { Key: service.ServiceProviderKey },
          {
            projection: {
              _id: 0,
              Key: 1,
              Name: 1,
              IsVerified: 1,
              ShortDescription: 1,
              Website: 1,
              Telephone: 1,
              Email: 1
            }
          }
        );

        return {
          ...service,
          organisation: provider
            ? {
                name: provider.Name,
                slug: provider.Key,
                isVerified: provider.IsVerified,
              }
            : null,
          distance: (service as any).distance,
        };
      })
    );

    return NextResponse.json({
      status: 'success',
      total,
      page,
      limit,
      results
    });
  } catch (error) {
    console.error('[API ERROR] /api/services:', error);

    // ✅ Fallback with proper typing
    try {
      interface RawProvider {
        name: string;
        slug: string;
        verified: boolean;
        services?: any[];
      }

      const rawProviders = fallbackProviders as RawProvider[];

      const allServices = rawProviders.flatMap((provider) =>
        (provider.services ?? []).map((service: any) => ({
          id: service.id,
          name: service.name,
          category: service.category,
          subCategory: service.subCategory,
          description: service.description,
          openTimes: service.openTimes ?? [],
          clientGroups: service.clientGroups ?? [],
          latitude: service.latitude,
          longitude: service.longitude,
          organisation: {
            name: provider.name,
            slug: provider.slug,
            isVerified: provider.verified,
          },
          organisationSlug: provider.slug,
        }))
      );

      const total = allServices.length;
      const start = (page - 1) * limit;
      const results = allServices.slice(start, start + limit);

      return NextResponse.json({
        status: 'success',
        total,
        page,
        limit,
        results,
      });
    } catch (fallbackError) {
      console.error('[API ERROR] Fallback services failed:', fallbackError);
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch services' },
        { status: 500 }
      );
    }
  }
}
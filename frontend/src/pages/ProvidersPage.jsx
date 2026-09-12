import React, { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';

const initialProviders = [
  {
    id: 'p1',
    name: 'Apex Heating & Cooling',
    services: ['HVAC', 'Electrical'],
    rating: 4.9,
    reviewsCount: 84,
    completedJobs: 132,
    verified: true,
    location: 'North Metro'
  },
  {
    id: 'p2',
    name: 'Precision Pipe & Drain Works',
    services: ['Plumbing'],
    rating: 4.8,
    reviewsCount: 62,
    completedJobs: 98,
    verified: true,
    location: 'West Suburbs'
  },
  {
    id: 'p3',
    name: 'MasterCraft Roofing Solutions',
    services: ['Roofing', 'Carpentry'],
    rating: 4.7,
    reviewsCount: 45,
    completedJobs: 71,
    verified: true,
    location: 'Central Valley'
  }
];

const ProvidersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [providers] = useState(initialProviders);

  const filtered = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.services.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Verified Service Providers</h1>
          <p className="text-slate-600 mt-1 text-sm">
            Contractors with authenticated credentials, verified past work, and customer ratings.
          </p>
        </div>
        <div className="w-full md:w-72">
          <Input
            placeholder="Search provider or trade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No providers found"
          description="No providers matched your search keyword."
          actionLabel="Clear Search"
          onAction={() => setSearchTerm('')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <Card
              key={p.id}
              title={
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base">{p.name}</span>
                </div>
              }
              subtitle={p.location}
              footer={
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    {p.completedJobs} Verified Jobs
                  </span>
                  <Button size="sm" variant="outline">
                    View Profile
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                    ✓ Verified Provider
                  </span>
                  <span className="text-xs text-slate-500">★ {p.rating} ({p.reviewsCount})</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.services.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProvidersPage;

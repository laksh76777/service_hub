import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import Loading from '../components/common/Loading';
import BookingModal from '../components/booking/BookingModal';
import { getProviders, getServices } from '../services/api';

const ProvidersPage = () => {
  const [searchParams] = useSearchParams();
  const serviceParam = searchParams.get('service') || '';

  const [technicians, setTechnicians] = useState([]);
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState(serviceParam);
  const [minRating, setMinRating] = useState('0');
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [targetTechnician, setTargetTechnician] = useState(null);

  const loadTechnicians = async (overrides = {}) => {
    setLoading(true);
    try {
      const search = overrides.search !== undefined ? overrides.search : searchTerm;
      const srv = overrides.service !== undefined ? overrides.service : selectedService;
      const rating = overrides.minRating !== undefined ? overrides.minRating : minRating;

      const params = {};
      if (search && search.trim()) params.search = search.trim();
      if (srv && srv.trim()) params.service = srv.trim();
      if (Number(rating) > 0) params.minRating = Number(rating);

      const res = await getProviders(params);
      const list = res?.data?.technicians || res?.data?.providers || [];
      setTechnicians(list);
    } catch (err) {
      console.error('Failed to load verified technicians:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getServices()
      .then((res) => {
        if (res?.data?.services) setServices(res.data.services);
      })
      .catch(() => {});
    loadTechnicians({ service: serviceParam });
  }, [serviceParam]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTechnicians();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedService('');
    setMinRating('0');
    loadTechnicians({ search: '', service: '', minRating: '0' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Verified Directory
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Verified Home Service Technicians</h1>
        <p className="text-slate-600 mt-1 text-sm max-w-2xl">
          Discover verified trade specialists eligible to perform your service. Review qualifications and request service directly.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search Technician or Trade</label>
            <Input
              placeholder="e.g. Rahul Sharma, AC Repair, Plumbing..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Service</label>
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                loadTechnicians({ service: e.target.value });
              }}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
            >
              <option value="">All Services</option>
              {services.map((s) => (
                <option key={s._id} value={s.slug || s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Rating</label>
            <select
              value={minRating}
              onChange={(e) => {
                setMinRating(e.target.value);
                loadTechnicians({ minRating: e.target.value });
              }}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
            >
              <option value="0">All Ratings</option>
              <option value="4.5">★ 4.5 &amp; above</option>
              <option value="4.0">★ 4.0 &amp; above</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" className="flex-1">
              Filter
            </Button>
            <Button type="button" variant="outline" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-medium text-slate-500">
          Showing <span className="font-bold text-slate-800">{technicians.length}</span> verified technicians
        </p>
      </div>

      {/* Technicians Grid */}
      {loading ? (
        <Loading fullPage text="Retrieving verified technician directory..." />
      ) : technicians.length === 0 ? (
        <EmptyState
          title="No verified technicians found"
          description="No technicians matched your selected service or filters. Try clearing your filters."
          actionLabel="Clear Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians.map((p) => (
            <Card
              key={p.id}
              title={
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                      {p.name || p.businessName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {p.profession || 'Technician'}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        • {p.experience || `${p.experienceYears || 1} years exp`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-flex items-center gap-1 text-amber-500 font-black text-xs">
                      ★ {p.rating?.average ? Number(p.rating.average).toFixed(1) : '5.0'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{p.completedJobsCount || 0} jobs</span>
                  </div>
                </div>
              }
              subtitle={
                <span className="text-xs text-slate-500">
                  {p.businessName}
                </span>
              }
              footer={
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                  <Link to={`/technicians/${p.id}`}>
                    <Button size="sm" variant="outline">
                      Profile
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    onClick={() => {
                      setTargetTechnician(p);
                      setIsBookingOpen(true);
                    }}
                  >
                    Request Service
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                {/* Verification Badge */}
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                    ✓ {p.verificationStatus || 'Verified'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {p.availability?.days ? p.availability.days.slice(0, 3).join(', ') : 'Mon - Sat'}
                  </span>
                </div>

                {p.bio && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {p.bio}
                  </p>
                )}

                {/* Services list */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(p.services || []).slice(0, 3).map((srv, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                    >
                      {srv}
                    </span>
                  ))}
                  {(p.services || []).length > 3 && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                      +{p.services.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialProvider={targetTechnician}
      />
    </div>
  );
};

export default ProvidersPage;

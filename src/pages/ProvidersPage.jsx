import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import Loading from '../components/common/Loading';
import { getProviders, getCategories } from '../services/api';

const ProvidersPage = () => {
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [pincode, setPincode] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [loading, setLoading] = useState(true);

  const loadProviders = async (overrides = {}) => {
    setLoading(true);
    try {
      const search = overrides.search !== undefined ? overrides.search : searchTerm;
      const cat = overrides.category !== undefined ? overrides.category : selectedCategory;
      const pin = overrides.pincode !== undefined ? overrides.pincode : pincode;
      const rating = overrides.minRating !== undefined ? overrides.minRating : minRating;

      const params = {};
      if (search && search.trim()) params.search = search.trim();
      if (cat) params.category = cat;
      if (pin && pin.trim()) {
        params.pincode = pin.trim();
        params.zipCode = pin.trim();
      }
      if (Number(rating) > 0) params.minRating = Number(rating);

      const res = await getProviders(params);
      if (res?.data?.providers) {
        setProviders(res.data.providers);
      }
    } catch (err) {
      console.error('Failed to load verified providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCategories()
      .then((res) => {
        if (res?.data?.categories) setCategories(res.data.categories);
      })
      .catch(() => {});
    loadProviders();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProviders();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPincode('');
    setMinRating('0');
    loadProviders({ search: '', category: '', pincode: '', minRating: '0' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Verified Directory
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Verified Trade Service Providers</h1>
        <p className="text-slate-600 mt-1 text-sm max-w-2xl">
          Hire certified, insured, and background-checked trade contractors. Unverified providers are excluded from customer discovery.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search Trade or Contractor</label>
            <Input
              placeholder="e.g. Sharma Electricals, Plumbing, AC Servicing..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Service Pincode</label>
            <Input
              placeholder="e.g. 560001, 560034"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" className="flex-1">
              Search
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
          Showing <span className="font-bold text-slate-800">{providers.length}</span> verified contractors
        </p>
      </div>

      {/* Providers Grid */}
      {loading ? (
        <Loading fullPage text="Scanning verified contractor registry..." />
      ) : providers.length === 0 ? (
        <EmptyState
          title="No verified providers found"
          description="No contractors matched your specific search filters. Try clearing your filters."
          actionLabel="Clear Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => (
            <Card
              key={p.id}
              title={
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-base text-slate-900 leading-snug">{p.businessName}</h3>
                </div>
              }
              subtitle={
                <span className="text-xs text-slate-500">
                  {p.serviceArea?.cities?.slice(0, 2).join(', ') || 'Metropolitan Area'}
                </span>
              }
              footer={
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-slate-500">
                    {p.completedJobsCount} jobs completed
                  </span>
                  <Link to={`/providers/${p.id}`}>
                    <Button size="sm" variant="primary">
                      View Profile
                    </Button>
                  </Link>
                </div>
              }
            >
              <div className="space-y-3">
                {/* Verified Badge and Rating */}
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span>✓</span> Verified Contractor
                  </span>
                  <span className="font-bold text-slate-800">
                    ★ {p.rating?.average ? p.rating.average.toFixed(1) : '5.0'} ({p.rating?.count || 0})
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {p.bio || 'Certified specialist delivering quality craftsmanship on time.'}
                </p>

                {/* Categories & Service count */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(p.categories || []).map((c) => (
                    <span
                      key={c._id || c.name}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                    >
                      {c.name}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                    {p.servicesCount} Service Offerings
                  </span>
                </div>

                {/* Availability Summary */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Days: {p.availabilitySummary?.days?.slice(0, 3).join(', ') || 'Mon-Fri'}
                  </span>
                  {p.availabilitySummary?.emergencyServices && (
                    <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                      ⚡ 24/7 Available
                    </span>
                  )}
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

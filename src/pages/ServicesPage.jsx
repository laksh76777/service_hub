import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import Loading from '../components/common/Loading';
import { getCategories, getServices } from '../services/api';

const ServicesPage = () => {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, srvRes] = await Promise.all([
        getCategories().catch(() => ({ data: { categories: [] } })),
        getServices().catch(() => ({ data: { services: [] } }))
      ]);

      if (catRes?.data?.categories) {
        setCategories(catRes.data.categories);
      }
      if (srvRes?.data?.services) {
        setServices(srvRes.data.services);
      }
    } catch (err) {
      console.error('Failed to load marketplace services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async (term, categorySlug) => {
    setSearchTerm(term);
    setLoading(true);
    try {
      const params = {};
      if (term && term.trim()) params.search = term.trim();
      if (categorySlug && categorySlug !== 'All') params.category = categorySlug;

      const res = await getServices(params);
      if (res?.data?.services) {
        setServices(res.data.services);
      }
    } catch (err) {
      console.error('Failed to filter services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (catSlug) => {
    setSelectedCategory(catSlug);
    handleSearch(searchTerm, catSlug);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Marketplace Catalog
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Explore Professional Services</h1>
          <p className="text-slate-600 mt-1 text-sm max-w-2xl">
            Browse certified trade services with upfront price estimates, verified local contractors, and guaranteed satisfaction.
          </p>
        </div>
        <div className="w-full md:w-80">
          <Input
            placeholder="Search services, e.g. AC service, switchboard, tap leak..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value, selectedCategory)}
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-8 items-center">
        <button
          onClick={() => handleCategorySelect('All')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
            selectedCategory === 'All'
              ? 'bg-blue-600 text-white shadow-blue-200'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          All Categories ({services.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => handleCategorySelect(cat.slug)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
              selectedCategory === cat.slug
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{cat.icon || '🛠️'}</span>
            <span>{cat.name}</span>
            {cat.servicesCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  selectedCategory === cat.slug ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {cat.servicesCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <Loading fullPage text="Finding matching services..." />
      ) : services.length === 0 ? (
        <EmptyState
          title="No matching services found"
          description="Try broadening your search term or selecting a different category."
          actionLabel="View All Services"
          onAction={() => {
            setSearchTerm('');
            handleCategorySelect('All');
          }}
        />
      ) : (
        /* Services Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card
              key={service._id}
              title={
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {service.name}
                  </span>
                  <span className="text-xl p-1 rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0">
                    {service.categoryId?.icon || '🛠️'}
                  </span>
                </div>
              }
              subtitle={
                <span className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mt-1">
                  {service.categoryId?.name || 'General Service'}
                </span>
              }
              footer={
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-slate-600">
                      {service.providersCount} Verified Technician{service.providersCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <Link to={`/services/${service._id}`}>
                    <Button size="sm" variant="primary">
                      View Technicians
                    </Button>
                  </Link>
                </div>
              }
            >
              <div className="space-y-3">
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {service.description || 'Professional service by certified local technicians.'}
                </p>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Estimate Range:</span>
                  <span className="font-bold text-slate-900">
                    ₹{service.estimatedPriceRange?.min || 199} - ₹{service.estimatedPriceRange?.max || 999}{' '}
                    {service.estimatedPriceRange?.currency || 'INR'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesPage;

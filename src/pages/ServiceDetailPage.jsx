import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import BookingModal from '../components/booking/BookingModal';
import { getServiceById } from '../services/api';

const ServiceDetailPage = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking modal state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [targetProvider, setTargetProvider] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getServiceById(id);
        if (res?.data) {
          setService(res.data.service);
          setProviders(res.data.providers || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load service details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return <Loading fullPage text="Loading service details and verified pros..." />;
  }

  if (error || !service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          title="Service Not Found"
          description={error || 'The requested service does not exist or has been deactivated.'}
          actionLabel="Back to Services"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <Link to="/services" className="hover:text-blue-600 transition-colors">Services</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{service.categoryId?.name || 'Category'}</span>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{service.name}</span>
      </nav>

      {/* Service Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-8 mb-10 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold">
              <span>{service.categoryId?.icon || '🛠️'}</span>
              <span>{service.categoryId?.name}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{service.name}</h1>
            <p className="text-slate-300 text-sm leading-relaxed">{service.description}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 min-w-[240px] text-center md:text-right space-y-3">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-300 font-medium block">Standard Estimate</span>
              <div className="text-2xl font-black text-white mt-1">
                ₹{service.estimatedPriceRange?.min} - ₹{service.estimatedPriceRange?.max}{' '}
                <span className="text-xs font-normal text-slate-300">{service.estimatedPriceRange?.currency || 'INR'}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Estimates include standard 30-day workmanship warranty.</p>
            </div>
            <Button
              size="sm"
              variant="primary"
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold"
              onClick={() => {
                setTargetProvider(providers[0] || null);
                setIsBookingOpen(true);
              }}
            >
              Request Service Appointment
            </Button>
          </div>
        </div>
      </div>

      {/* Verified Providers Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Verified Providers Offering This Service</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Contractors verified with state licensing, active insurance, and verified customer reviews.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            {providers.length} Verified Contractor{providers.length === 1 ? '' : 's'}
          </span>
        </div>

        {providers.length === 0 ? (
          <EmptyState
            title="No verified contractors active in this service yet"
            description="Service providers are currently being reviewed by our verification team. Check back soon or browse nearby categories."
            actionLabel="Browse Other Services"
            onAction={() => window.location.assign('/services')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {providers.map((p) => (
              <Card
                key={p.id}
                title={
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{p.businessName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ Verified Pro
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          ★ {p.rating?.average ? p.rating.average.toFixed(1) : 'New'} ({p.rating?.count || 0} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                }
                subtitle={
                  <span className="text-xs text-slate-500">
                    {p.completedJobsCount} completed jobs in this region
                  </span>
                }
                footer={
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Coverage: {p.serviceArea?.cities?.slice(0, 2).join(', ') || 'Metro Area'}
                    </span>
                    <div className="flex gap-2">
                      <Link to={`/providers/${p.id}`}>
                        <Button size="sm" variant="outline">
                          Profile
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setTargetProvider(p);
                          setIsBookingOpen(true);
                        }}
                      >
                        Book Pro
                      </Button>
                    </div>
                  </div>
                }
              >
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 line-clamp-2">{p.bio || 'Experienced certified trade specialist.'}</p>

                  {p.offering && (
                    <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{p.offering.customTitle || service.name}</span>
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-black uppercase tracking-wide">
                          {p.offering.pricing?.type?.replace('_', ' ')}: ₹{p.offering.pricing?.amount}{' '}
                          {p.offering.pricing?.currency || 'INR'}
                        </span>
                      </div>
                      {p.offering.description && (
                        <p className="text-slate-600 text-[11px]">{p.offering.description}</p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">Working Days:</span>
                    <span>{p.availability?.days?.slice(0, 4).join(', ') || 'Mon-Fri'}</span>
                    {p.availability?.emergencyServices && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                        ⚡ 24/7 Emergency
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Customer Booking Flow Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialService={service}
        initialProvider={targetProvider}
      />
    </div>
  );
};

export default ServiceDetailPage;

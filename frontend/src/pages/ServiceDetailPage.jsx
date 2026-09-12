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
    return <Loading fullPage text="Loading service details and verified technicians..." />;
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

      {/* Eligible Technicians Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Eligible Technicians for {service.name}</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Verified local trade professionals eligible to perform this service. Choose a technician to request service.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            {providers.length} Eligible Technician{providers.length === 1 ? '' : 's'}
          </span>
        </div>

        {providers.length === 0 ? (
          <EmptyState
            title="No eligible technicians available for this service yet"
            description="Technicians for this trade are currently being onboarded and verified. Please check back shortly or explore other services."
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-lg text-slate-900">{p.name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ {p.verificationStatus || 'Verified'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {p.profession || 'Technician'}
                        </span>
                        <span className="text-xs font-medium text-slate-600">
                          • {p.experience || `${p.experienceYears || 1} years exp`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-amber-500 font-black text-sm">
                        <span>★</span>
                        <span>{p.rating?.average ? Number(p.rating.average).toFixed(1) : '5.0'}</span>
                        <span className="text-[11px] font-normal text-slate-400">({p.rating?.count || 0})</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{p.completedJobsCount || 0} jobs completed</span>
                    </div>
                  </div>
                }
                subtitle={
                  <span className="text-xs text-slate-500 font-medium">
                    {p.businessName}
                  </span>
                }
                footer={
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                    <Link to={`/technicians/${p.id}`}>
                      <Button size="sm" variant="outline">
                        Technician Profile
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      onClick={() => {
                        setTargetProvider(p);
                        setIsBookingOpen(true);
                      }}
                    >
                      Request Service →
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  {p.bio && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {p.bio}
                    </p>
                  )}

                  {/* Services Offered */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Services Provided:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(p.services || [service.name]).map((srv, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[11px] font-medium"
                        >
                          {srv}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">🕒 Availability:</span>
                      <span className="font-semibold text-slate-700">
                        {Array.isArray(p.availability?.days) ? p.availability.days.slice(0, 3).join(', ') : 'Mon - Sat'}
                        {p.availability?.workingHours ? ` (${p.availability.workingHours.start} - ${p.availability.workingHours.end})` : ''}
                      </span>
                    </div>
                    {p.availability?.emergencyServices && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                        ⚡ 24/7 Dispatch
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

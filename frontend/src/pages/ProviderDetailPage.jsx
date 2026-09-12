import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import BookingModal from '../components/booking/BookingModal';
import { getProviderById } from '../services/api';

const ProviderDetailPage = () => {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking modal state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [targetService, setTargetService] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getProviderById(id);
        if (res?.data?.provider) {
          setProvider(res.data.provider);
        }
      } catch (err) {
        setError(err.message || 'Failed to load technician profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) {
    return <Loading fullPage text="Retrieving verified contractor dossier..." />;
  }

  if (error || !provider) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          title="Technician Profile Unavailable"
          description={error || 'This technician profile is either not verified or does not exist.'}
          actionLabel="Back to Directory"
          onAction={() => window.location.assign('/technicians')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <Link to="/technicians" className="hover:text-blue-600 transition-colors">Technicians</Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{provider.user?.name || provider.businessName}</span>
      </nav>

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span>✓</span> Verified Technician
              </span>
              {provider.licenseNumber && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  {provider.licenseNumber}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {provider.user?.name || provider.businessName}
            </h1>
            {provider.businessName && provider.user?.name && (
              <p className="text-sm font-bold text-blue-600">{provider.businessName}</p>
            )}

            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              {provider.bio || 'Certified trade professional dedicated to high quality residential work.'}
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-col gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 min-w-[220px]">
            <div className="flex sm:flex-row lg:flex-col gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                  Customer Rating
                </span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  ★ {provider.rating?.average ? provider.rating.average.toFixed(1) : '5.0'}
                  <span className="text-xs font-normal text-slate-500 ml-1">({provider.rating?.count || 0} reviews)</span>
                </div>
              </div>

              <div className="pt-2 sm:pt-0 lg:pt-2 sm:border-l lg:border-l-0 lg:border-t border-slate-200 pl-4 sm:pl-4 lg:pl-0">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                  Verified Jobs
                </span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {provider.completedJobsCount || 0}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="primary"
              className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setTargetService(provider.services?.[0]?.serviceId || null);
                setIsBookingOpen(true);
              }}
            >
              Request Service
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Technician Services & Pricing Catalog */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Technician Services &amp; Pricing</h2>
            <p className="text-xs text-slate-500 mt-1">
              Custom service rates configured directly by {provider.user?.name || provider.businessName}.
            </p>
          </div>

          {provider.services?.length === 0 ? (
            <EmptyState
              title="No services configured"
              description="This contractor has not published active service offerings yet."
            />
          ) : (
            <div className="space-y-4">
              {provider.services?.map((offering) => (
                <div
                  key={offering._id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-blue-200 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {offering.serviceId?.categoryId?.icon || '🛠️'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {offering.customTitle || offering.serviceId?.name}
                        </h3>
                      </div>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full inline-block mt-1">
                        {offering.serviceId?.categoryId?.name || 'Trade Service'}
                      </span>
                    </div>

                    <div className="text-left sm:text-right flex-shrink-0 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                      <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block">
                        {offering.pricing?.type?.replace('_', ' ')}
                      </span>
                      <span className="text-xl font-black text-slate-900">
                        ₹{offering.pricing?.amount} {offering.pricing?.currency || 'INR'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {offering.description || offering.serviceId?.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span>🛡️</span> Covered by ServiceHub 60-day warranty
                    </span>
                    <div className="flex gap-2">
                      <Link to={`/services/${offering.serviceId?._id || ''}`}>
                        <Button size="sm" variant="outline">
                          Compare
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setTargetService(offering.serviceId || null);
                          setIsBookingOpen(true);
                        }}
                      >
                        Request Service
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Service Area & Availability Summary */}
        <div className="space-y-6">
          {/* Service Area */}
          <Card title="Service Area & Coverage" subtitle="Geographic coverage for on-site services">
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase block mb-1">Covered Municipalities</span>
                <div className="flex flex-wrap gap-1.5">
                  {provider.serviceArea?.cities?.length ? (
                    provider.serviceArea.cities.map((city) => (
                      <span key={city} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                        📍 {city}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">Metropolitan Regional Service Area</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-semibold uppercase block mb-1">PIN Codes Serviced</span>
                <div className="flex flex-wrap gap-1">
                  {(provider.serviceArea?.pincodes?.length ? provider.serviceArea.pincodes : (provider.serviceArea?.zipCodes || [])).length > 0 ? (
                    (provider.serviceArea?.pincodes?.length ? provider.serviceArea.pincodes : (provider.serviceArea?.zipCodes || [])).map((pin) => (
                      <span key={pin} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[11px]">
                        {pin}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">Full Metro Coverage</span>
                  )}
                </div>
              </div>

              {provider.serviceArea?.radiusKm && (
                <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-600">
                  <span>Operating Radius:</span>
                  <span className="font-bold text-slate-800">{provider.serviceArea.radiusKm} km</span>
                </div>
              )}
            </div>
          </Card>

          {/* Availability Summary */}
          <Card title="Availability Summary" subtitle="Schedule and dispatch capacity">
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase block mb-1.5">Working Days</span>
                <div className="flex flex-wrap gap-1">
                  {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => {
                    const isAvailable = provider.availability?.days?.includes(day);
                    return (
                      <span
                        key={day}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-400 line-through'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between">
                <span className="text-slate-500">Working Hours:</span>
                <span className="font-bold text-slate-800">
                  {provider.availability?.workingHours?.start || '09:00'} -{' '}
                  {provider.availability?.workingHours?.end || '18:00'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-slate-500">Emergency Dispatch:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                    provider.availability?.emergencyServices
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {provider.availability?.emergencyServices ? '⚡ Active 24/7' : 'Standard Schedule'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between">
                <span className="text-slate-500">Minimum Notice:</span>
                <span className="font-bold text-slate-800">
                  {provider.availability?.noticeHours || 24} hours
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Customer Booking Flow Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialService={targetService}
        initialProvider={provider}
      />
    </div>
  );
};

export default ProviderDetailPage;

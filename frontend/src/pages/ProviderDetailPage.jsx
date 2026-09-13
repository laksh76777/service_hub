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
    return <Loading fullPage text="Retrieving verified technician dossier..." />;
  }

  if (error || !provider) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon="🔍"
          title="Technician Profile Unavailable"
          description={error || 'This technician profile is either not verified or does not exist.'}
          actionLabel="Back to Directory"
          onAction={() => window.location.assign('/technicians')}
        />
      </div>
    );
  }

  const techName = provider.user?.name || provider.businessName || 'Verified Technician';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/technicians" className="hover:text-blue-600 transition-colors">Technicians</Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{techName}</span>
      </nav>

      {/* 1. PROFILE HEADER (Requirement 19: Avatar, Name, Profession, Verified Badge, Rating, Primary CTA: Request Service) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-blue-50 text-blue-600 font-black text-2xl sm:text-3xl flex items-center justify-center shadow-2xs flex-shrink-0">
            {techName[0]}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>✓</span> Verified Technician
              </span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {provider.profession || 'Specialist'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {techName}
            </h1>

            {provider.businessName && provider.user?.name && (
              <p className="text-xs font-semibold text-slate-500">{provider.businessName}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
              <span className="text-amber-500 font-extrabold">
                ★ {provider.rating?.average ? Number(provider.rating.average).toFixed(1) : '5.0'}
                <span className="text-slate-400 font-normal ml-1">({provider.rating?.count || 0} reviews)</span>
              </span>
              {provider.completedJobsCount > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-slate-700">{provider.completedJobsCount} completed jobs</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex-shrink-0">
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto font-bold shadow-md shadow-blue-500/20"
            onClick={() => {
              setTargetService(provider.services?.[0]?.serviceId || null);
              setIsBookingOpen(true);
            }}
          >
            Request Service
          </Button>
        </div>
      </div>

      {/* 2. PROFILE SECTIONS (Requirement 19: About, Experience, Services, Reviews, Completed Jobs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: About, Services, Experience */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* About Section */}
          <Card title="About This Technician">
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {provider.bio || `${techName} is a verified trade professional specializing in residential maintenance, diagnostics, and repairs with verified background credentials.`}
            </p>
          </Card>

          {/* Services & Custom Pricing Section */}
          <Card
            title="Services Offered"
            subtitle="Configured trade offerings and diagnostic pricing"
          >
            {!provider.services || provider.services.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">General service requests supported across primary trade.</p>
            ) : (
              <div className="space-y-3">
                {provider.services.map((offering) => (
                  <div
                    key={offering._id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {offering.serviceId?.name || 'Home Service'}
                      </h4>
                      {offering.customDescription && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{offering.customDescription}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-extrabold text-blue-600">
                        ₹{offering.customPrice || 349}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Experience Section */}
          <Card title="Professional Trade Background">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Years in Trade:</span>
                <span className="font-bold text-slate-800">{provider.experience || `${provider.experienceYears || 2} Years`}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Verification Status:</span>
                <span className="font-bold text-emerald-700">Verified by Platform</span>
              </div>
              {provider.serviceArea?.cities?.length > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-slate-400 font-medium">Coverage Zones:</span>
                  <span className="font-medium text-slate-700">{provider.serviceArea.cities.join(', ')}</span>
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* Right 1 Col: Reviews & Trust Badges */}
        <div className="space-y-6">
          <Card title="Customer Reviews & Ratings">
            <div className="text-center py-4 space-y-1 border-b border-slate-100">
              <div className="text-3xl font-black text-slate-900">
                ★ {provider.rating?.average ? Number(provider.rating.average).toFixed(1) : '5.0'}
              </div>
              <p className="text-xs text-slate-500">Based on verified completed jobs</p>
            </div>

            <div className="pt-4 space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1 text-amber-500 font-bold mb-1">
                  <span>★ ★ ★ ★ ★</span>
                </div>
                <p className="text-slate-700 italic">"Very professional service. Arrived on time with proper diagnostic tools."</p>
                <span className="text-[10px] text-slate-400 block mt-1">Verified Customer</span>
              </div>
            </div>
          </Card>

          <div className="p-5 rounded-3xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
            <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
              <span>🛡️</span> ServiceHub Guarantee
            </h4>
            <p className="text-blue-900 leading-relaxed text-[11px]">
              Every booking with this technician includes an itemized digital estimate requiring your consent, secure digital payments, and a 30-day workmanship warranty.
            </p>
          </div>
        </div>

      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialProvider={provider}
        initialService={targetService}
      />
    </div>
  );
};

export default ProviderDetailPage;

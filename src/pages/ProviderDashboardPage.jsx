import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  getMyProviderProfile,
  adminGetProviders,
  adminUpdateProviderStatus
} from '../services/api';

const ProviderDashboardPage = () => {
  const { user, mongoUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin section state
  const isAdmin = mongoUser?.role === 'ADMIN';
  const [adminProviders, setAdminProviders] = useState([]);
  const [adminFilter, setAdminFilter] = useState('PENDING');
  const [adminLoading, setAdminLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  const loadProviderData = async () => {
    setLoading(true);
    try {
      const res = await getMyProviderProfile();
      if (res?.data?.profile) {
        setProfile(res.data.profile);
      }
    } catch (err) {
      console.error('Failed to load provider profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminProviders = async (status) => {
    setAdminLoading(true);
    try {
      const res = await adminGetProviders({ status });
      if (res?.data?.providers) {
        setAdminProviders(res.data.providers);
      }
    } catch (err) {
      console.error('Failed to load admin provider queue:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    loadProviderData();
    if (isAdmin) {
      loadAdminProviders('PENDING');
    }
  }, [isAdmin]);

  const handleAdminStatusUpdate = async (providerId, newStatus) => {
    setActionFeedback('');
    try {
      await adminUpdateProviderStatus(providerId, { status: newStatus });
      setActionFeedback(`Provider marked as ${newStatus} successfully.`);
      loadAdminProviders(adminFilter);
    } catch (err) {
      setActionFeedback('Failed to update status: ' + err.message);
    }
  };

  if (loading) {
    return <Loading fullPage text="Loading provider workspace..." />;
  }

  const status = profile?.status || 'PENDING';

  const statusBannerConfig = {
    PENDING: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: '⏳',
      title: 'Verification In Progress',
      message:
        'Your contractor application is under review by our admin verification team. Complete your profile and service offerings so we can approve your account. Unverified providers do not appear in public customer searches.'
    },
    VERIFIED: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '✓',
      title: 'Certified & Verified Contractor',
      message:
        'Your account is verified! Your business profile and service offerings are actively listed in customer discovery searches across your configured service areas.'
    },
    REJECTED: {
      bg: 'bg-red-50 border-red-200 text-red-900',
      badge: 'bg-red-100 text-red-800 border-red-300',
      icon: '✕',
      title: 'Verification Needs Attention',
      message:
        'Your verification was not approved. Please ensure your license number and trade credentials are up to date in your profile, then request a re-review.'
    },
    SUSPENDED: {
      bg: 'bg-slate-100 border-slate-300 text-slate-800',
      badge: 'bg-slate-200 text-slate-700 border-slate-300',
      icon: '⚠️',
      title: 'Account Suspended',
      message:
        'Your provider account is currently suspended from customer dispatch. Please contact platform compliance.'
    }
  }[status] || {
    bg: 'bg-blue-50 border-blue-200 text-blue-900',
    badge: 'bg-blue-100 text-blue-800',
    icon: 'ℹ️',
    title: 'Status',
    message: status
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Provider Portal
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-2">
            {profile?.businessName || `${user?.displayName}'s Business`}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Manage your credentials, coverage areas, service offerings, and trade availability.
          </p>
        </div>

        <div className="flex gap-3">
          <Link to="/provider/profile">
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          </Link>
          <Link to="/provider/services">
            <Button variant="primary" size="sm">
              Manage Services ({profile?.servicesOffered?.length || 0})
            </Button>
          </Link>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div className={`p-6 rounded-2xl border ${statusBannerConfig.bg} shadow-sm`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="text-2xl flex-shrink-0">{statusBannerConfig.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base">{statusBannerConfig.title}</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${statusBannerConfig.badge}`}>
                  {status}
                </span>
              </div>
              <p className="text-xs mt-1 opacity-90 leading-relaxed max-w-3xl">
                {statusBannerConfig.message}
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">
            {status === 'VERIFIED' ? (
              <Link to={`/providers/${profile?._id}`}>
                <Button size="sm" variant="outline" className="bg-white/80">
                  View Public Profile
                </Button>
              </Link>
            ) : (
              <Link to="/provider/profile">
                <Button size="sm" variant="primary">
                  Update Credentials
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs uppercase font-semibold text-slate-400">Account Status</span>
          <div className="text-xl font-black text-slate-900 mt-1 uppercase">{status}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {status === 'VERIFIED' ? 'Publicly Discoverable' : 'Hidden from Search'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs uppercase font-semibold text-slate-400">Active Services</span>
          <div className="text-xl font-black text-blue-600 mt-1">
            {profile?.servicesOffered?.filter((s) => s.isActive).length || 0}
          </div>
          <Link to="/provider/services" className="text-[11px] text-blue-600 hover:underline font-semibold mt-0.5 block">
            Configure catalog &rarr;
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs uppercase font-semibold text-slate-400">Customer Rating</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            ★ {profile?.rating?.average ? profile.rating.average.toFixed(1) : '5.0'}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {profile?.rating?.count || 0} customer reviews
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs uppercase font-semibold text-slate-400">Service Coverage</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {profile?.serviceArea?.cities?.length || 0} Cities
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {profile?.serviceArea?.zipCodes?.length || 0} Zip Codes
          </span>
        </div>
      </div>

      {/* Quick Configuration Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Profile & Coverage Settings"
          subtitle="Keep your trade license, insurance, service radius, and working schedule updated."
          footer={
            <Link to="/provider/profile">
              <Button size="sm" variant="outline">
                Configure Profile &rarr;
              </Button>
            </Link>
          }
        >
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">License:</span>
              <span className="font-semibold text-slate-800">{profile?.licenseNumber || 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Insurance Provider:</span>
              <span className="font-semibold text-slate-800">{profile?.insuranceDetails?.provider || 'None'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Operating Radius:</span>
              <span className="font-semibold text-slate-800">{profile?.serviceArea?.radiusKm || 25} km</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">24/7 Emergency Dispatch:</span>
              <span className={`font-semibold ${profile?.availability?.emergencyServices ? 'text-emerald-600' : 'text-slate-600'}`}>
                {profile?.availability?.emergencyServices ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </Card>

        <Card
          title="Service Catalog & Custom Pricing"
          subtitle="Publish specific trade services with customized descriptions and upfront rates."
          footer={
            <Link to="/provider/services">
              <Button size="sm" variant="primary">
                Manage Services &rarr;
              </Button>
            </Link>
          }
        >
          <div className="space-y-2 text-xs">
            {profile?.servicesOffered?.length === 0 ? (
              <p className="text-slate-500 text-xs py-4 text-center">
                You have not added any services yet. Click below to choose from platform offerings.
              </p>
            ) : (
              profile?.servicesOffered?.slice(0, 3).map((s) => (
                <div key={s._id} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="font-medium text-slate-800">{s.customTitle || s.serviceId?.name}</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                    ${s.pricing?.amount} ({s.pricing?.type?.replace('_', ' ')})
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ADMIN VERIFICATION SECTION (Displayed only if logged in user is ADMIN) */}
      {isAdmin && (
        <div className="pt-8 border-t border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold uppercase">
                Admin Control Room
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Provider Verification Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve or reject provider credentials to control marketplace visibility.
              </p>
            </div>

            {/* Filter Pills for Admin */}
            <div className="flex gap-2">
              {['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setAdminFilter(st);
                    loadAdminProviders(st);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    adminFilter === st
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {actionFeedback && (
            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold rounded-xl">
              {actionFeedback}
            </div>
          )}

          {adminLoading ? (
            <Loading fullPage text="Retrieving moderation queue..." />
          ) : adminProviders.length === 0 ? (
            <EmptyState
              title={`No ${adminFilter} providers in queue`}
              description="There are currently no provider applications matching this verification state."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminProviders.map((ap) => (
                <Card
                  key={ap._id}
                  title={ap.businessName}
                  subtitle={ap.userId?.email || 'Registered Provider'}
                  footer={
                    <div className="flex gap-2 w-full pt-1">
                      {ap.status !== 'VERIFIED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleAdminStatusUpdate(ap._id, 'VERIFIED')}
                        >
                          Approve
                        </Button>
                      )}
                      {ap.status !== 'REJECTED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleAdminStatusUpdate(ap._id, 'REJECTED')}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  }
                >
                  <div className="space-y-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 font-semibold block">Applicant:</span>
                      <span className="font-medium text-slate-800">{ap.userId?.name} ({ap.userId?.phone || 'No phone'})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">License #:</span>
                      <span className="font-mono text-slate-800">{ap.licenseNumber || 'None declared'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Coverage:</span>
                      <span>{ap.serviceArea?.cities?.join(', ') || 'No cities set'}</span>
                    </div>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Current State:</span>
                      <span className="px-2 py-0.5 rounded font-black text-[10px] bg-slate-100 text-slate-800">
                        {ap.status}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProviderDashboardPage;

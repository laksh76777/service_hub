import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { updateMe, getBookings } from '../services/api';

const DashboardPage = () => {
  const { user, mongoUser, isEmailVerified, resendVerificationEmail, refreshUserProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [inspectBooking, setInspectBooking] = useState(null);

  const loadCustomerBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await getBookings({ limit: 50 });
      if (res?.data?.bookings) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load user bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCustomerBookings();
    }
  }, [user]);

  // Email verification state
  const [verifyNotice, setVerifyNotice] = useState('');
  const [verifySending, setVerifySending] = useState(false);

  // Profile edit state
  const [editName, setEditName] = useState(mongoUser?.name || user?.displayName || '');
  const [editPhone, setEditPhone] = useState(mongoUser?.phone || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const handleResendVerification = async () => {
    setVerifySending(true);
    setVerifyNotice('');
    try {
      await resendVerificationEmail();
      setVerifyNotice('Verification email sent! Please check your inbox.');
    } catch (err) {
      setVerifyNotice('Failed to send verification email: ' + (err.message || 'Please try again.'));
    } finally {
      setVerifySending(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    setProfileError('');

    try {
      await updateMe({
        name: editName,
        phone: editPhone
      });
      await refreshUserProfile();
      setProfileMessage('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const roleBadgeColor = {
    CUSTOMER: 'bg-blue-100 text-blue-800 border-blue-200',
    PROVIDER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200'
  }[mongoUser?.role || 'CUSTOMER'] || 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Email Verification Banner */}
      {!isEmailVerified && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Please verify your email address</p>
              <p className="text-xs text-amber-700 mt-0.5">
                A verification email was sent to <span className="font-semibold">{user?.email}</span>. Click the link in your email to verify your identity.
              </p>
              {verifyNotice && (
                <p className="text-xs font-semibold text-emerald-700 mt-1">{verifyNotice}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResendVerification}
            disabled={verifySending}
            className="flex-shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            {verifySending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
        </div>
      )}

      {/* User Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900">
              Welcome, {mongoUser?.name || user?.displayName || 'User'}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadgeColor}`}>
              {mongoUser?.role || 'CUSTOMER'}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Authenticated via Firebase Auth | UID: <span className="font-mono text-slate-700">{user?.uid}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Account Status:</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold uppercase">
            {mongoUser?.status || 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-6">
          {[
            { id: 'overview', label: 'My Profile & Role' },
            { id: 'bookings', label: 'Service Bookings' },
            { id: 'estimates', label: 'Estimates' },
            { id: 'verification', label: 'Work Verification' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile & Authorization Info Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity & Role Summary */}
          <div className="lg:col-span-1 space-y-6">
            <Card title="Authorization & Identity" subtitle="MongoDB profile linked with Firebase">
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-semibold">User Role</span>
                  <span className="font-bold text-sm text-slate-800">{mongoUser?.role || 'CUSTOMER'}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Governed securely on backend. Cannot be modified via client requests.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block uppercase font-semibold">Email Verification</span>
                  <span className={`font-semibold ${isEmailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isEmailVerified ? '✓ Verified' : '⚠ Pending Verification'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block uppercase font-semibold">Registered Email</span>
                  <span className="text-slate-700 font-medium">{mongoUser?.email || user?.email}</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block uppercase font-semibold">Member Since</span>
                  <span className="text-slate-700">
                    {mongoUser?.createdAt ? new Date(mongoUser.createdAt).toLocaleDateString() : 'Today'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Profile Update Form */}
          <div className="lg:col-span-2">
            <Card
              title="Edit Profile (PATCH /api/users/me)"
              subtitle="Update your contact information. Critical security fields like role cannot be altered."
            >
              {profileMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
                  {profileMessage}
                </div>
              )}

              {profileError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {profileError}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="Your Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />

                <Input
                  label="Phone Number"
                  placeholder="+1 (555) 123-4567"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />

                <Input
                  label="Email (Managed by Firebase Auth)"
                  value={mongoUser?.email || user?.email || ''}
                  disabled
                  helperText="Email changes require security verification in Firebase"
                />

                <Input
                  label="Assigned Role (Managed by Backend Server)"
                  value={mongoUser?.role || 'CUSTOMER'}
                  disabled
                  helperText="Roles cannot be changed by client requests (Protected Security Rule)"
                />

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" disabled={profileSaving}>
                    {profileSaving ? 'Saving Changes...' : 'Save Profile'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Service Bookings</h2>
              <p className="text-xs text-slate-500">Track and manage your requests from initial quote to job verification.</p>
            </div>
            <Link to="/services">
              <Button size="sm" variant="primary">
                + Request New Service
              </Button>
            </Link>
          </div>

          {bookingsLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <EmptyState
              title="No service bookings found"
              description="You have not requested any trade services yet. Browse our marketplace catalog to find verified contractors."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bookings.map((b) => (
                <Card
                  key={b._id}
                  title={<span>{b.serviceId?.name || 'Trade Service'}</span>}
                  subtitle={`Order #${b.bookingNumber}`}
                  footer={
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-slate-500">
                        Date: {new Date(b.scheduledDate).toLocaleDateString()}
                      </span>
                      <Link to={`/bookings/${b._id}`}>
                        <Button size="sm" variant="outline">
                          View Details & Timeline &rarr;
                        </Button>
                      </Link>
                    </div>
                  }
                >
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contractor:</span>
                      <span className="font-bold text-slate-800">{b.providerId?.name || 'Verified Pro'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Address:</span>
                      <span className="text-slate-700">{b.address?.streetAddress}, {b.address?.city}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-slate-500">Status:</span>
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-black uppercase bg-blue-100 text-blue-800">
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estimates Tab */}
      {activeTab === 'estimates' && (
        <Card title="Pending Estimates">
          <p className="text-sm text-slate-600 mb-4">
            Authorized for: <span className="font-semibold text-slate-800">{mongoUser?.role}</span> accounts.
          </p>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <div className="font-semibold text-slate-800">Job BK-1041: Plumbing Repair Estimate</div>
            <div className="text-slate-600 text-xs mt-1">Labor: $120 | Parts (Copper valve & fittings): $60 | Total: $180.00</div>
          </div>
        </Card>
      )}

      {/* Verification Tab */}
      {activeTab === 'verification' && (
        <EmptyState
          title="No Work Verification Evidence Yet"
          description="When service providers complete tasks, verified evidence will appear here."
        />
      )}

      {/* Inspect Modal */}
      <Modal
        isOpen={!!inspectBooking}
        onClose={() => setInspectBooking(null)}
        title={inspectBooking ? `Job Details - ${inspectBooking.id}` : 'Details'}
        footer={<Button variant="secondary" onClick={() => setInspectBooking(null)}>Close</Button>}
      >
        {inspectBooking && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Service Required</div>
              <div className="font-semibold text-slate-800">{inspectBooking.service}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Provider</div>
              <div className="text-slate-800">{inspectBooking.provider}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Current Phase</div>
              <div className="text-slate-800">{inspectBooking.status}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DashboardPage;

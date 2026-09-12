import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import {
  getMyServices,
  getServices,
  addServiceOffering,
  updateServiceOffering,
  removeServiceOffering
} from '../services/api';

const PRICING_TYPES = [
  { value: 'STARTING_AT', label: 'Starting At' },
  { value: 'FIXED', label: 'Fixed Price' },
  { value: 'HOURLY', label: 'Hourly Rate' },
  { value: 'CUSTOM_ESTIMATE', label: 'Custom Quote / Estimate' }
];

const ProviderServicesPage = () => {
  const [offeredServices, setOfferedServices] = useState([]);
  const [platformServices, setPlatformServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Service Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedPlatformServiceId, setSelectedPlatformServiceId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [pricingType, setPricingType] = useState('STARTING_AT');
  const [priceAmount, setPriceAmount] = useState('99');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Edit Service Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPricingType, setEditPricingType] = useState('STARTING_AT');
  const [editAmount, setEditAmount] = useState('0');
  const [editActive, setEditActive] = useState(true);

  // Notification
  const [banner, setBanner] = useState({ type: '', text: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [mySrvRes, platSrvRes] = await Promise.all([
        getMyServices().catch(() => ({ data: { services: [] } })),
        getServices().catch(() => ({ data: { services: [] } }))
      ]);

      if (mySrvRes?.data?.services) {
        setOfferedServices(mySrvRes.data.services);
      }
      if (platSrvRes?.data?.services) {
        setPlatformServices(platSrvRes.data.services);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setSelectedPlatformServiceId('');
    setCustomTitle('');
    setCustomDescription('');
    setPricingType('STARTING_AT');
    setPriceAmount('100');
    setModalError('');
    setAddModalOpen(true);
  };

  const handleSelectServiceChange = (serviceId) => {
    setSelectedPlatformServiceId(serviceId);
    const chosen = platformServices.find((s) => s._id === serviceId);
    if (chosen) {
      setCustomTitle(chosen.name);
      setCustomDescription(chosen.description || '');
      setPriceAmount(String(chosen.estimatedPriceRange?.min || 100));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlatformServiceId) {
      setModalError('Please select a service from the platform catalog.');
      return;
    }
    setModalSubmitting(true);
    setModalError('');

    try {
      await addServiceOffering({
        serviceId: selectedPlatformServiceId,
        customTitle,
        description: customDescription,
        pricing: {
          type: pricingType,
          amount: Number(priceAmount),
          currency: 'USD'
        }
      });
      setBanner({ type: 'success', text: 'Service offering added to your catalog!' });
      setAddModalOpen(false);
      loadData();
    } catch (err) {
      setModalError(err.message || 'Failed to add service offering.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenEditModal = (offering) => {
    setEditingOffering(offering);
    setEditTitle(offering.customTitle || offering.serviceId?.name || '');
    setEditDescription(offering.description || offering.serviceId?.description || '');
    setEditPricingType(offering.pricing?.type || 'STARTING_AT');
    setEditAmount(String(offering.pricing?.amount || 0));
    setEditActive(Boolean(offering.isActive));
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingOffering) return;
    setModalSubmitting(true);

    try {
      const targetId = editingOffering.serviceId?._id || editingOffering.serviceId;
      await updateServiceOffering(targetId, {
        customTitle: editTitle,
        description: editDescription,
        pricing: {
          type: editPricingType,
          amount: Number(editAmount),
          currency: 'USD'
        },
        isActive: editActive
      });
      setBanner({ type: 'success', text: 'Service offering updated successfully!' });
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      setModalError(err.message || 'Failed to update service offering.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleRemove = async (offering) => {
    const targetId = offering.serviceId?._id || offering.serviceId;
    const title = offering.customTitle || offering.serviceId?.name || 'this service';
    if (!window.confirm(`Are you sure you want to remove "${title}" from your catalog?`)) {
      return;
    }

    try {
      await removeServiceOffering(targetId);
      setBanner({ type: 'success', text: `Removed "${title}" from your catalog.` });
      loadData();
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Failed to remove service.' });
    }
  };

  // Filter out services already offered from the platform options
  const offeredServiceIds = offeredServices.map((os) => os.serviceId?._id || os.serviceId);
  const availableToAdd = platformServices.filter((ps) => !offeredServiceIds.includes(ps._id));

  if (loading) {
    return <Loading fullPage text="Retrieving your service catalog..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Catalog Management
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-2">Manage Offered Services</h1>
          <p className="text-slate-500 text-xs mt-1">
            Add trade offerings, tailor your pricing structure, and customize descriptions for customers.
          </p>
        </div>

        <div className="flex gap-3">
          <Link to="/provider/dashboard">
            <Button variant="outline" size="sm">
              &larr; Dashboard
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={handleOpenAddModal}>
            + Add Service to Catalog
          </Button>
        </div>
      </div>

      {banner.text && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold border ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Services List */}
      {offeredServices.length === 0 ? (
        <EmptyState
          title="No services offered yet"
          description="Build your catalog by adding trade services from the ServiceHub master registry."
          actionLabel="+ Add Your First Service"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {offeredServices.map((offering) => (
            <Card
              key={offering._id}
              title={
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {offering.serviceId?.categoryId?.icon || '🛠️'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {offering.customTitle || offering.serviceId?.name}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                      offering.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {offering.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              }
              subtitle={
                <span className="text-xs text-blue-600 font-medium">
                  {offering.serviceId?.categoryId?.name || 'Trade Category'}
                </span>
              }
              footer={
                <div className="flex items-center justify-between w-full pt-1">
                  <button
                    onClick={() => handleRemove(offering)}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold transition-colors"
                  >
                    Remove Offering
                  </button>
                  <Button size="sm" variant="outline" onClick={() => handleOpenEditModal(offering)}>
                    Edit Pricing
                  </Button>
                </div>
              }
            >
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Custom Rate:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ${offering.pricing?.amount} ({offering.pricing?.type?.replace('_', ' ')})
                  </span>
                </div>

                <p className="text-slate-600 line-clamp-2">
                  {offering.description || offering.serviceId?.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Service to Your Catalog"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Platform Service
            </label>
            <select
              value={selectedPlatformServiceId}
              onChange={(e) => handleSelectServiceChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
              required
            >
              <option value="">-- Choose from available services --</option>
              {availableToAdd.map((ps) => (
                <option key={ps._id} value={ps._id}>
                  [{ps.categoryId?.name || 'General'}] {ps.name}
                </option>
              ))}
            </select>
            {availableToAdd.length === 0 && (
              <p className="text-[11px] text-slate-400 mt-1">
                You have already added all available services to your offerings.
              </p>
            )}
          </div>

          <Input
            label="Custom Offering Title"
            placeholder="e.g. Master Emergency Leak Diagnosis & Repair"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            required
          />

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Custom Description for Clients
            </label>
            <textarea
              rows={3}
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Describe your equipment, methods, and what is included..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pricing Model</label>
              <select
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
              >
                {PRICING_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Price / Rate ($ USD)"
              type="number"
              min="0"
              step="1"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={modalSubmitting}>
              {modalSubmitting ? 'Adding...' : 'Add to Catalog'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Service Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Service Offering"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <Input
            label="Offering Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Custom Description
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pricing Model</label>
              <select
                value={editPricingType}
                onChange={(e) => setEditPricingType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
              >
                {PRICING_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Price ($ USD)"
              type="number"
              min="0"
              step="1"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="activeToggle"
              checked={editActive}
              onChange={(e) => setEditActive(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-slate-300"
            />
            <label htmlFor="activeToggle" className="font-semibold text-slate-700">
              Active in public discovery search
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={modalSubmitting}>
              {modalSubmitting ? 'Saving...' : 'Update Offering'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProviderServicesPage;

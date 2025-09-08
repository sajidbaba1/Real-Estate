import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Home, User, Calendar, DollarSign, MessageSquare, Bell, Filter } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface RentBooking {
  id: number;
  property: {
    id: number;
    title: string;
    address: string;
    images?: string[];
  };
  tenant: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: string;
  createdAt: string;
}

interface PgBooking {
  id: number;
  bed: {
    id: number;
    bedNumber: string;
    room: {
      property: {
        id: number;
        title: string;
        address: string;
      };
    };
  };
  tenant: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: string;
  createdAt: string;
}

interface ApprovalRequest {
  approvalMessage: string;
  finalMonthlyRent?: number;
  finalSecurityDeposit?: number;
}

interface RejectionRequest {
  rejectionReason: string;
}

const BookingApprovalsPage: React.FC = () => {
  const [rentBookings, setRentBookings] = useState<RentBooking[]>([]);
  const [pgBookings, setPgBookings] = useState<PgBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingBookingId, setProcessingBookingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'rent' | 'pg'>('all');
  
  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [bookingType, setBookingType] = useState<'rent' | 'pg'>('rent');
  
  // Form states
  const [approvalForm, setApprovalForm] = useState<ApprovalRequest>({
    approvalMessage: '',
    finalMonthlyRent: undefined,
    finalSecurityDeposit: undefined,
  });
  const [rejectionForm, setRejectionForm] = useState<RejectionRequest>({
    rejectionReason: '',
  });

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view booking approvals');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/booking-management/pending-approvals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('You are not authorized to view booking approvals');
          return;
        }
        throw new Error('Failed to load pending approvals');
      }

      const data = await response.json();
      setRentBookings(data.rentBookings || []);
      setPgBookings(data.pgBookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedBooking) return;

    try {
      setProcessingBookingId(selectedBooking.id);
      const token = localStorage.getItem('token');
      
      const endpoint = bookingType === 'rent' 
        ? `/api/booking-management/rent/${selectedBooking.id}/approve`
        : `/api/booking-management/pg/${selectedBooking.id}/approve`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalForm),
      });

      if (!response.ok) {
        throw new Error('Failed to approve booking');
      }

      // Show success message
      alert('Booking approved successfully! The tenant has been notified.');
      
      // Reset form and close modal
      setApprovalForm({
        approvalMessage: '',
        finalMonthlyRent: undefined,
        finalSecurityDeposit: undefined,
      });
      setShowApprovalModal(false);
      setSelectedBooking(null);
      
      // Reload approvals
      await loadPendingApprovals();
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve booking');
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedBooking || !rejectionForm.rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setProcessingBookingId(selectedBooking.id);
      const token = localStorage.getItem('token');
      
      const endpoint = bookingType === 'rent' 
        ? `/api/booking-management/rent/${selectedBooking.id}/reject`
        : `/api/booking-management/pg/${selectedBooking.id}/reject`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rejectionForm),
      });

      if (!response.ok) {
        throw new Error('Failed to reject booking');
      }

      // Show success message
      alert('Booking rejected. The tenant has been notified with your reason.');
      
      // Reset form and close modal
      setRejectionForm({ rejectionReason: '' });
      setShowRejectionModal(false);
      setSelectedBooking(null);
      
      // Reload approvals
      await loadPendingApprovals();
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject booking');
    } finally {
      setProcessingBookingId(null);
    }
  };

  const openApprovalModal = (booking: any, type: 'rent' | 'pg') => {
    setSelectedBooking(booking);
    setBookingType(type);
    setApprovalForm({
      approvalMessage: '',
      finalMonthlyRent: type === 'rent' ? booking.monthlyRent : booking.monthlyRent,
      finalSecurityDeposit: booking.securityDeposit,
    });
    setShowApprovalModal(true);
  };

  const openRejectionModal = (booking: any, type: 'rent' | 'pg') => {
    setSelectedBooking(booking);
    setBookingType(type);
    setRejectionForm({ rejectionReason: '' });
    setShowRejectionModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredRentBookings = filter === 'pg' ? [] : rentBookings;
  const filteredPgBookings = filter === 'rent' ? [] : pgBookings;
  const totalPending = filteredRentBookings.length + filteredPgBookings.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadPendingApprovals}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Bell className="h-8 w-8 text-blue-600 mr-3" />
                Booking Approvals
              </h1>
              <p className="text-gray-600 mt-2">
                Review and approve tenant booking requests
              </p>
            </div>
            
            {/* Filter and Stats */}
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                <span className="text-sm text-gray-600">Pending: </span>
                <span className="font-semibold text-blue-600">{totalPending}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'rent' | 'pg')}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Bookings</option>
                  <option value="rent">Rent Only</option>
                  <option value="pg">PG Only</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* No Pending Approvals */}
        {totalPending === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">No pending booking approvals at the moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Rent Bookings */}
            {filteredRentBookings.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Home className="h-5 w-5 text-blue-600 mr-2" />
                  Rent Property Bookings ({filteredRentBookings.length})
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredRentBookings.map((booking) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {/* Property Image */}
                      <div className="h-48 bg-gray-200 relative">
                        {booking.property.images && booking.property.images[0] ? (
                          <img
                            src={booking.property.images[0]}
                            alt={booking.property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4">
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {booking.property.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-1">
                          {booking.property.address}
                        </p>

                        {/* Tenant Info */}
                        <div className="flex items-center mb-4">
                          <User className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {booking.tenant.firstName} {booking.tenant.lastName}
                          </span>
                        </div>

                        {/* Booking Details */}
                        <div className="space-y-2 mb-4 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-medium">
                              {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Monthly Rent:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(booking.monthlyRent)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Security Deposit:</span>
                            <span className="font-medium">
                              {formatCurrency(booking.securityDeposit)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openApprovalModal(booking, 'rent')}
                            disabled={processingBookingId === booking.id}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center text-sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectionModal(booking, 'rent')}
                            disabled={processingBookingId === booking.id}
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center text-sm"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* PG Bookings */}
            {filteredPgBookings.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Home className="h-5 w-5 text-purple-600 mr-2" />
                  PG Bookings ({filteredPgBookings.length})
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPgBookings.map((booking) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {/* Content */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900 line-clamp-2">
                            {booking.bed.room.property.title}
                          </h3>
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                          Bed {booking.bed.bedNumber}
                        </p>

                        {/* Tenant Info */}
                        <div className="flex items-center mb-4">
                          <User className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {booking.tenant.firstName} {booking.tenant.lastName}
                          </span>
                        </div>

                        {/* Booking Details */}
                        <div className="space-y-2 mb-4 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-medium">
                              {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Monthly Rent:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(booking.monthlyRent)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Security Deposit:</span>
                            <span className="font-medium">
                              {formatCurrency(booking.securityDeposit)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openApprovalModal(booking, 'pg')}
                            disabled={processingBookingId === booking.id}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center text-sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectionModal(booking, 'pg')}
                            disabled={processingBookingId === booking.id}
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center text-sm"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approval Modal */}
        <AnimatePresence>
          {showApprovalModal && selectedBooking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl p-6 w-full max-w-md"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Approve Booking Request
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Tenant: {selectedBooking.tenant.firstName} {selectedBooking.tenant.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Property: {bookingType === 'rent' ? selectedBooking.property.title : selectedBooking.bed.room.property.title}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approval Message (Optional)
                    </label>
                    <textarea
                      value={approvalForm.approvalMessage}
                      onChange={(e) => setApprovalForm({ ...approvalForm, approvalMessage: e.target.value })}
                      placeholder="Welcome message or additional instructions..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Final Monthly Rent
                      </label>
                      <input
                        type="number"
                        value={approvalForm.finalMonthlyRent || ''}
                        onChange={(e) => setApprovalForm({ ...approvalForm, finalMonthlyRent: Number(e.target.value) })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="₹ Amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Final Security Deposit
                      </label>
                      <input
                        type="number"
                        value={approvalForm.finalSecurityDeposit || ''}
                        onChange={(e) => setApprovalForm({ ...approvalForm, finalSecurityDeposit: Number(e.target.value) })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="₹ Amount"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowApprovalModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={processingBookingId === selectedBooking.id}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {processingBookingId === selectedBooking.id ? 'Approving...' : 'Approve Booking'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rejection Modal */}
        <AnimatePresence>
          {showRejectionModal && selectedBooking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl p-6 w-full max-w-md"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Reject Booking Request
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Tenant: {selectedBooking.tenant.firstName} {selectedBooking.tenant.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Property: {bookingType === 'rent' ? selectedBooking.property.title : selectedBooking.bed.room.property.title}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionForm.rejectionReason}
                    onChange={(e) => setRejectionForm({ ...rejectionForm, rejectionReason: e.target.value })}
                    placeholder="Please provide a reason for rejection..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={4}
                    required
                  />
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowRejectionModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={processingBookingId === selectedBooking.id || !rejectionForm.rejectionReason.trim()}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {processingBookingId === selectedBooking.id ? 'Rejecting...' : 'Reject Booking'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BookingApprovalsPage;

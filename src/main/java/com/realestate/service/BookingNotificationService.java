package com.realestate.service;

import com.realestate.entity.*;
import com.realestate.repository.BookingNotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class BookingNotificationService {

    @Autowired
    private BookingNotificationRepository notificationRepo;

    // Create notification for booking events
    public BookingNotification createNotification(User user, BookingNotification.NotificationType type, 
                                                String title, String message, String actionUrl,
                                                RentBooking rentBooking, PgBooking pgBooking) {
        BookingNotification notification = new BookingNotification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setActionUrl(actionUrl);
        notification.setRentBooking(rentBooking);
        notification.setPgBooking(pgBooking);
        
        // Set priority based on notification type
        switch (type) {
            case BOOKING_REJECTED:
            case PAYMENT_OVERDUE:
            case BOOKING_TERMINATED:
                notification.setPriority(BookingNotification.NotificationPriority.HIGH);
                break;
            case BOOKING_APPROVED:
            case PAYMENT_DUE:
            case BOOKING_CANCELLED:
                notification.setPriority(BookingNotification.NotificationPriority.MEDIUM);
                break;
            default:
                notification.setPriority(BookingNotification.NotificationPriority.LOW);
        }
        
        return notificationRepo.save(notification);
    }

    // Notify about new booking request
    public void notifyBookingCreated(RentBooking booking) {
        // Notify property owner
        String title = "New Booking Request";
        String message = String.format("New booking request for property '%s' from %s %s", 
            booking.getProperty().getTitle(),
            booking.getTenant().getFirstName(),
            booking.getTenant().getLastName());
        String actionUrl = "/bookings/owner";
        
        createNotification(booking.getOwner(), BookingNotification.NotificationType.BOOKING_CREATED,
                          title, message, actionUrl, booking, null);
    }

    public void notifyPgBookingCreated(PgBooking booking) {
        // Notify property owner
        String title = "New PG Booking Request";
        String message = String.format("New PG booking request for bed %s in %s from %s %s", 
            booking.getBed().getBedNumber(),
            booking.getBed().getRoom().getProperty().getTitle(),
            booking.getTenant().getFirstName(),
            booking.getTenant().getLastName());
        String actionUrl = "/bookings/owner";
        
        createNotification(booking.getOwner(), BookingNotification.NotificationType.BOOKING_CREATED,
                          title, message, actionUrl, null, booking);
    }

    // Notify about booking approval
    public void notifyBookingApproved(RentBooking booking) {
        String title = "Booking Approved!";
        String message = String.format("Your booking request for '%s' has been approved! You can now proceed with payment.", 
            booking.getProperty().getTitle());
        String actionUrl = "/bookings";
        
        createNotification(booking.getTenant(), BookingNotification.NotificationType.BOOKING_APPROVED,
                          title, message, actionUrl, booking, null);
    }

    public void notifyPgBookingApproved(PgBooking booking) {
        String title = "PG Booking Approved!";
        String message = String.format("Your PG booking request for bed %s has been approved! You can now proceed with payment.", 
            booking.getBed().getBedNumber());
        String actionUrl = "/bookings";
        
        createNotification(booking.getTenant(), BookingNotification.NotificationType.BOOKING_APPROVED,
                          title, message, actionUrl, null, booking);
    }

    // Notify about booking rejection
    public void notifyBookingRejected(RentBooking booking, String reason) {
        String title = "Booking Request Rejected";
        String message = String.format("Your booking request for '%s' has been rejected.", 
            booking.getProperty().getTitle());
        if (reason != null && !reason.trim().isEmpty()) {
            message += " Reason: " + reason;
        }
        String actionUrl = "/properties/" + booking.getProperty().getId();
        
        createNotification(booking.getTenant(), BookingNotification.NotificationType.BOOKING_REJECTED,
                          title, message, actionUrl, booking, null);
    }

    // Notify about payment due
    public void notifyPaymentDue(MonthlyPayment payment) {
        User tenant = payment.getRentBooking() != null ? 
            payment.getRentBooking().getTenant() : payment.getPgBooking().getTenant();
        
        String propertyName = payment.getRentBooking() != null ?
            payment.getRentBooking().getProperty().getTitle() :
            payment.getPgBooking().getBed().getRoom().getProperty().getTitle();
        
        String title = "Rent Payment Due";
        String message = String.format("Your rent payment of ₹%s for '%s' is due on %s", 
            payment.getAmount().toString(), propertyName, payment.getDueDate().toString());
        String actionUrl = "/bookings";
        
        BookingNotification.NotificationType type = payment.getDueDate().isBefore(LocalDateTime.now().toLocalDate()) ?
            BookingNotification.NotificationType.PAYMENT_OVERDUE : BookingNotification.NotificationType.PAYMENT_DUE;
        
        createNotification(tenant, type, title, message, actionUrl, 
            payment.getRentBooking(), payment.getPgBooking());
    }

    // Notify about payment received
    public void notifyPaymentReceived(MonthlyPayment payment) {
        User owner = payment.getRentBooking() != null ? 
            payment.getRentBooking().getOwner() : payment.getPgBooking().getOwner();
        
        String propertyName = payment.getRentBooking() != null ?
            payment.getRentBooking().getProperty().getTitle() :
            payment.getPgBooking().getBed().getRoom().getProperty().getTitle();
        
        String title = "Payment Received";
        String message = String.format("Rent payment of ₹%s received for '%s'", 
            payment.getAmount().toString(), propertyName);
        String actionUrl = "/bookings/owner";
        
        createNotification(owner, BookingNotification.NotificationType.PAYMENT_RECEIVED,
                          title, message, actionUrl, payment.getRentBooking(), payment.getPgBooking());
    }

    // Get unread notifications for user
    public List<BookingNotification> getUnreadNotifications(Long userId) {
        return notificationRepo.findByUser_IdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    // Get all notifications for user with pagination
    public List<BookingNotification> getAllNotifications(Long userId) {
        return notificationRepo.findByUser_IdOrderByCreatedAtDesc(userId);
    }

    // Mark notification as read
    public void markAsRead(Long notificationId, Long userId) {
        notificationRepo.findById(notificationId).ifPresent(notification -> {
            if (notification.getUser().getId().equals(userId)) {
                notification.setIsRead(true);
                notificationRepo.save(notification);
            }
        });
    }

    // Mark all notifications as read for user
    public void markAllAsRead(Long userId) {
        notificationRepo.markAllAsReadForUser(userId);
    }

    // Count unread notifications
    public Long countUnreadNotifications(Long userId) {
        return notificationRepo.countByUser_IdAndIsReadFalse(userId);
    }

    // Clean up old notifications
    public void cleanupOldNotifications() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(90); // Keep notifications for 90 days
        notificationRepo.deleteOldReadNotifications(cutoffDate);
    }
}

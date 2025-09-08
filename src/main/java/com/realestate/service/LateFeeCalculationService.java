package com.realestate.service;

import com.realestate.entity.*;
import com.realestate.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@Transactional
public class LateFeeCalculationService {

    @Autowired private MonthlyPaymentRepository paymentRepo;
    @Autowired private RentBookingRepository rentBookingRepo;
    @Autowired private PgBookingRepository pgBookingRepo;
    @Autowired private BookingNotificationService notificationService;

    // Default late fee settings
    private static final BigDecimal DEFAULT_LATE_FEE_PERCENTAGE = new BigDecimal("0.05"); // 5% per month
    private static final int DEFAULT_GRACE_PERIOD_DAYS = 3;
    private static final BigDecimal MAX_LATE_FEE_PERCENTAGE = new BigDecimal("0.25"); // Max 25% of monthly rent

    // Run daily at 2 AM to check for overdue payments
    @Scheduled(cron = "0 0 2 * * *")
    public void processOverduePayments() {
        System.out.println("Starting daily overdue payment processing...");
        
        LocalDate today = LocalDate.now();
        
        // Find all pending payments that are overdue
        List<MonthlyPayment> overduePayments = paymentRepo.findOverduePayments(today);
        
        for (MonthlyPayment payment : overduePayments) {
            processOverduePayment(payment, today);
        }
        
        System.out.println("Completed overdue payment processing. Processed " + overduePayments.size() + " payments.");
    }

    // Process individual overdue payment
    public void processOverduePayment(MonthlyPayment payment, LocalDate currentDate) {
        if (payment.getStatus() != MonthlyPayment.PaymentStatus.PENDING) {
            return; // Skip non-pending payments
        }

        BigDecimal lateFeeRate;
        int gracePeriodDays;
        
        // Get late fee settings from booking
        if (payment.getRentBooking() != null) {
            RentBooking booking = payment.getRentBooking();
            lateFeeRate = booking.getLateFeeRate() != null ? booking.getLateFeeRate() : DEFAULT_LATE_FEE_PERCENTAGE;
            gracePeriodDays = booking.getGracePeriodDays() != null ? booking.getGracePeriodDays() : DEFAULT_GRACE_PERIOD_DAYS;
        } else if (payment.getPgBooking() != null) {
            PgBooking booking = payment.getPgBooking();
            lateFeeRate = booking.getLateFeeRate() != null ? booking.getLateFeeRate() : DEFAULT_LATE_FEE_PERCENTAGE;
            gracePeriodDays = booking.getGracePeriodDays() != null ? booking.getGracePeriodDays() : DEFAULT_GRACE_PERIOD_DAYS;
        } else {
            return; // No associated booking
        }

        // Calculate days overdue (excluding grace period)
        long daysOverdue = ChronoUnit.DAYS.between(payment.getDueDate(), currentDate);
        if (daysOverdue <= gracePeriodDays) {
            return; // Still in grace period
        }

        long chargableDays = daysOverdue - gracePeriodDays;
        
        // Calculate late fee
        BigDecimal lateFee = calculateLateFee(payment.getAmount(), lateFeeRate, chargableDays);
        
        // Update payment with late fee if not already applied
        if (payment.getLateFee() == null || payment.getLateFee().compareTo(lateFee) < 0) {
            payment.setLateFee(lateFee);
            payment.setStatus(MonthlyPayment.PaymentStatus.OVERDUE);
            paymentRepo.save(payment);

            // Send overdue notification
            sendOverdueNotification(payment, chargableDays, lateFee);
            
            System.out.println("Applied late fee of ₹" + lateFee + " to payment ID: " + payment.getId());
        }

        // Check for extreme overdue cases (30+ days)
        if (chargableDays >= 30) {
            handleExtremeOverdue(payment, chargableDays);
        }
    }

    // Calculate late fee based on various factors
    public BigDecimal calculateLateFee(BigDecimal monthlyRent, BigDecimal lateFeeRate, long daysOverdue) {
        // Daily late fee rate
        BigDecimal dailyLateFeeRate = lateFeeRate.divide(new BigDecimal("30"), 6, RoundingMode.HALF_UP);
        
        // Calculate base late fee
        BigDecimal lateFee = monthlyRent.multiply(dailyLateFeeRate).multiply(new BigDecimal(daysOverdue));
        
        // Cap late fee at maximum percentage of monthly rent
        BigDecimal maxLateFee = monthlyRent.multiply(MAX_LATE_FEE_PERCENTAGE);
        if (lateFee.compareTo(maxLateFee) > 0) {
            lateFee = maxLateFee;
        }
        
        return lateFee.setScale(2, RoundingMode.HALF_UP);
    }

    // Send overdue notification to tenant
    private void sendOverdueNotification(MonthlyPayment payment, long daysOverdue, BigDecimal lateFee) {
        User tenant = payment.getRentBooking() != null ? 
            payment.getRentBooking().getTenant() : payment.getPgBooking().getTenant();
        
        String propertyName = payment.getRentBooking() != null ?
            payment.getRentBooking().getProperty().getTitle() :
            payment.getPgBooking().getBed().getRoom().getProperty().getTitle();

        String title = "Payment Overdue - Late Fee Applied";
        String message = String.format(
            "Your rent payment for '%s' is %d days overdue. Late fee of ₹%s has been applied. " +
            "Total amount due: ₹%s. Please pay immediately to avoid further penalties.",
            propertyName, daysOverdue, lateFee.toString(), 
            payment.getAmount().add(lateFee).toString()
        );
        String actionUrl = "/bookings";

        notificationService.createNotification(tenant, BookingNotification.NotificationType.PAYMENT_OVERDUE,
            title, message, actionUrl, payment.getRentBooking(), payment.getPgBooking());
    }

    // Handle extreme overdue cases (30+ days)
    private void handleExtremeOverdue(MonthlyPayment payment, long daysOverdue) {
        // Notify owner about potential booking termination
        User owner = payment.getRentBooking() != null ? 
            payment.getRentBooking().getOwner() : payment.getPgBooking().getOwner();
        
        String propertyName = payment.getRentBooking() != null ?
            payment.getRentBooking().getProperty().getTitle() :
            payment.getPgBooking().getBed().getRoom().getProperty().getTitle();

        String title = "Tenant Payment Severely Overdue";
        String message = String.format(
            "Tenant payment for '%s' is %d days overdue. You may consider booking termination. " +
            "Please review the situation and take appropriate action.",
            propertyName, daysOverdue
        );
        String actionUrl = "/bookings/owner";

        notificationService.createNotification(owner, BookingNotification.NotificationType.PAYMENT_OVERDUE,
            title, message, actionUrl, payment.getRentBooking(), payment.getPgBooking());
        
        // If 60+ days overdue, automatically flag for termination
        if (daysOverdue >= 60) {
            flagForTermination(payment);
        }
    }

    // Flag booking for termination due to non-payment
    private void flagForTermination(MonthlyPayment payment) {
        if (payment.getRentBooking() != null) {
            RentBooking booking = payment.getRentBooking();
            booking.setStatus(RentBooking.BookingStatus.TERMINATED);
            booking.setTerminationReason("Non-payment of rent for 60+ days");
            booking.setTerminationDate(LocalDate.now());
            rentBookingRepo.save(booking);
            
            // Update property status
            Property property = booking.getProperty();
            property.setStatus(Property.PropertyStatus.FOR_RENT);
            
        } else if (payment.getPgBooking() != null) {
            PgBooking booking = payment.getPgBooking();
            booking.setStatus(PgBooking.BookingStatus.TERMINATED);
            booking.setTerminationReason("Non-payment of rent for 60+ days");
            booking.setTerminationDate(LocalDate.now());
            pgBookingRepo.save(booking);
            
            // Mark bed as available
            PgBed bed = booking.getBed();
            bed.setIsOccupied(false);
        }
        
        System.out.println("Booking terminated due to extreme non-payment: " + 
            (payment.getRentBooking() != null ? "Rent ID " + payment.getRentBooking().getId() : 
             "PG ID " + payment.getPgBooking().getId()));
    }

    // Calculate total outstanding amount for a tenant
    public BigDecimal calculateOutstandingAmount(Long tenantId) {
        List<MonthlyPayment> pendingPayments = paymentRepo.findPendingPaymentsByTenant(tenantId);
        
        return pendingPayments.stream()
            .map(payment -> {
                BigDecimal amount = payment.getAmount();
                if (payment.getLateFee() != null) {
                    amount = amount.add(payment.getLateFee());
                }
                return amount;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Get overdue payments for specific tenant
    public List<MonthlyPayment> getOverduePayments(Long tenantId) {
        LocalDate today = LocalDate.now();
        return paymentRepo.findOverduePaymentsByTenant(tenantId, today);
    }

    // Apply payment and update late fees
    public void processPayment(MonthlyPayment payment, BigDecimal paidAmount) {
        BigDecimal totalDue = payment.getAmount();
        if (payment.getLateFee() != null) {
            totalDue = totalDue.add(payment.getLateFee());
        }
        
        if (paidAmount.compareTo(totalDue) >= 0) {
            // Full payment received
            payment.setStatus(MonthlyPayment.PaymentStatus.PAID);
            payment.setPaidDate(LocalDate.now());
            paymentRepo.save(payment);
            
            // Notify owner about payment received
            notificationService.notifyPaymentReceived(payment);
            
        } else {
            // Partial payment - update amounts
            BigDecimal remainingAmount = totalDue.subtract(paidAmount);
            
            // First pay off the base rent, then late fees
            if (paidAmount.compareTo(payment.getAmount()) >= 0) {
                BigDecimal remainingLateFee = remainingAmount;
                payment.setLateFee(remainingLateFee);
            } else {
                BigDecimal remainingBaseAmount = payment.getAmount().subtract(paidAmount);
                payment.setAmount(remainingBaseAmount);
                // Keep existing late fee
            }
            
            paymentRepo.save(payment);
        }
    }

    // Send payment reminders (run every Monday at 9 AM)
    @Scheduled(cron = "0 0 9 * * MON")
    public void sendPaymentReminders() {
        LocalDate today = LocalDate.now();
        LocalDate reminderDate = today.plusDays(3); // Remind 3 days before due
        
        List<MonthlyPayment> upcomingPayments = paymentRepo.findUpcomingDuePayments(reminderDate);
        
        for (MonthlyPayment payment : upcomingPayments) {
            sendPaymentReminder(payment);
        }
        
        System.out.println("Sent " + upcomingPayments.size() + " payment reminders.");
    }

    private void sendPaymentReminder(MonthlyPayment payment) {
        User tenant = payment.getRentBooking() != null ? 
            payment.getRentBooking().getTenant() : payment.getPgBooking().getTenant();
        
        String propertyName = payment.getRentBooking() != null ?
            payment.getRentBooking().getProperty().getTitle() :
            payment.getPgBooking().getBed().getRoom().getProperty().getTitle();

        String title = "Rent Payment Reminder";
        String message = String.format(
            "Reminder: Your rent payment of ₹%s for '%s' is due on %s. " +
            "Please ensure timely payment to avoid late fees.",
            payment.getAmount().toString(), propertyName, payment.getDueDate().toString()
        );
        String actionUrl = "/bookings";

        notificationService.createNotification(tenant, BookingNotification.NotificationType.PAYMENT_DUE,
            title, message, actionUrl, payment.getRentBooking(), payment.getPgBooking());
    }
}

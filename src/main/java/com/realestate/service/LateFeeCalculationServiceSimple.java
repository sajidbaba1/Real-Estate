package com.realestate.service;

import com.realestate.entity.*;
import com.realestate.repository.MonthlyPaymentRepository;
import com.realestate.repository.RentBookingRepository;
import com.realestate.repository.PgBookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@Transactional
public class LateFeeCalculationServiceSimple {

    @Autowired private MonthlyPaymentRepository paymentRepo;
    @Autowired private RentBookingRepository rentBookingRepo;
    @Autowired private PgBookingRepository pgBookingRepo;

    // Default late fee settings
    private static final BigDecimal DEFAULT_LATE_FEE_PERCENTAGE = new BigDecimal("0.05"); // 5% per month
    private static final int DEFAULT_GRACE_PERIOD_DAYS = 3;
    private static final BigDecimal MAX_LATE_FEE_PERCENTAGE = new BigDecimal("0.25"); // Max 25% of monthly rent

    // Process individual overdue payment (simplified version)
    public void processOverduePayment(MonthlyPayment payment, LocalDate currentDate) {
        if (payment.getStatus() != MonthlyPayment.PaymentStatus.PENDING) {
            return; // Skip non-pending payments
        }

        // Calculate days overdue (excluding grace period)
        long daysOverdue = ChronoUnit.DAYS.between(payment.getDueDate(), currentDate);
        if (daysOverdue <= DEFAULT_GRACE_PERIOD_DAYS) {
            return; // Still in grace period
        }

        long chargableDays = daysOverdue - DEFAULT_GRACE_PERIOD_DAYS;
        
        // Calculate late fee
        BigDecimal lateFee = calculateLateFee(payment.getAmount(), DEFAULT_LATE_FEE_PERCENTAGE, chargableDays);
        
        // Update payment with late fee if not already applied
        if (payment.getLateFee() == null || payment.getLateFee().compareTo(lateFee) < 0) {
            payment.setLateFee(lateFee);
            payment.setStatus(MonthlyPayment.PaymentStatus.OVERDUE);
            paymentRepo.save(payment);
            
            System.out.println("Applied late fee of ₹" + lateFee + " to payment ID: " + payment.getId());
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

    // Calculate total outstanding amount for a tenant (simplified)
    public BigDecimal calculateOutstandingAmount(Long tenantId) {
        List<MonthlyPayment> allPayments = paymentRepo.findAll();
        
        return allPayments.stream()
            .filter(payment -> {
                if (payment.getRentBooking() != null) {
                    return payment.getRentBooking().getTenant().getId().equals(tenantId);
                } else if (payment.getPgBooking() != null) {
                    return payment.getPgBooking().getTenant().getId().equals(tenantId);
                }
                return false;
            })
            .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.PENDING ||
                             payment.getStatus() == MonthlyPayment.PaymentStatus.OVERDUE)
            .map(payment -> {
                BigDecimal amount = payment.getAmount();
                if (payment.getLateFee() != null) {
                    amount = amount.add(payment.getLateFee());
                }
                return amount;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Get overdue payments for specific tenant (simplified)
    public List<MonthlyPayment> getOverduePayments(Long tenantId) {
        LocalDate today = LocalDate.now();
        List<MonthlyPayment> allPayments = paymentRepo.findAll();
        
        return allPayments.stream()
            .filter(payment -> {
                if (payment.getRentBooking() != null) {
                    return payment.getRentBooking().getTenant().getId().equals(tenantId);
                } else if (payment.getPgBooking() != null) {
                    return payment.getPgBooking().getTenant().getId().equals(tenantId);
                }
                return false;
            })
            .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.OVERDUE ||
                             (payment.getStatus() == MonthlyPayment.PaymentStatus.PENDING && 
                              payment.getDueDate().isBefore(today)))
            .toList();
    }

    // Apply payment and update late fees (simplified)
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

    // Process all overdue payments (simplified, no scheduling)
    public void processAllOverduePayments() {
        LocalDate today = LocalDate.now();
        List<MonthlyPayment> allPayments = paymentRepo.findAll();
        
        List<MonthlyPayment> overduePayments = allPayments.stream()
            .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.PENDING)
            .filter(payment -> payment.getDueDate().isBefore(today))
            .toList();
        
        for (MonthlyPayment payment : overduePayments) {
            processOverduePayment(payment, today);
        }
        
        System.out.println("Processed " + overduePayments.size() + " overdue payments.");
    }
}

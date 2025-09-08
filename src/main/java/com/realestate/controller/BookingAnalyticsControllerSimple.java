package com.realestate.controller;

import com.realestate.entity.*;
import com.realestate.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/simple/booking-analytics")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class BookingAnalyticsControllerSimple {

    @Autowired private RentBookingRepository rentBookingRepo;
    @Autowired private PgBookingRepository pgBookingRepo;
    @Autowired private MonthlyPaymentRepository monthlyPaymentRepo;
    @Autowired private PropertyRepository propertyRepo;
    @Autowired private UserRepository userRepo;

    // Get dashboard overview stats
    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> getOverviewStats(@RequestParam(defaultValue = "30") int days) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        User currentUser = userOpt.get();
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days);

        Map<String, Object> stats = new HashMap<>();
        
        // Get all bookings and filter
        List<RentBooking> allRentBookings = rentBookingRepo.findAll();
        List<PgBooking> allPgBookings = pgBookingRepo.findAll();
        List<MonthlyPayment> allPayments = monthlyPaymentRepo.findAll();
        
        if (currentUser.getRole() == User.Role.ADMIN) {
            // Admin sees all bookings
            long activeRentBookings = allRentBookings.stream()
                .filter(booking -> booking.getStatus() == RentBooking.BookingStatus.ACTIVE)
                .count();
            long activePgBookings = allPgBookings.stream()
                .filter(booking -> booking.getStatus() == PgBooking.BookingStatus.ACTIVE)
                .count();
            long pendingApprovals = allRentBookings.stream()
                .filter(booking -> booking.getStatus() == RentBooking.BookingStatus.PENDING_APPROVAL)
                .count() +
                allPgBookings.stream()
                .filter(booking -> booking.getStatus() == PgBooking.BookingStatus.PENDING_APPROVAL)
                .count();
            
            stats.put("totalActiveRentBookings", activeRentBookings);
            stats.put("totalActivePgBookings", activePgBookings);
            stats.put("pendingApprovals", pendingApprovals);
            stats.put("totalRevenue", calculateTotalRevenue(null, startDate, endDate, allPayments));
            stats.put("overduePayments", countOverduePayments(allPayments));
        } else {
            // Owner sees only their bookings
            long activeRentBookings = allRentBookings.stream()
                .filter(booking -> booking.getOwner().getId().equals(currentUser.getId()))
                .filter(booking -> booking.getStatus() == RentBooking.BookingStatus.ACTIVE)
                .count();
            long activePgBookings = allPgBookings.stream()
                .filter(booking -> booking.getOwner().getId().equals(currentUser.getId()))
                .filter(booking -> booking.getStatus() == PgBooking.BookingStatus.ACTIVE)
                .count();
            long pendingApprovals = allRentBookings.stream()
                .filter(booking -> booking.getOwner().getId().equals(currentUser.getId()))
                .filter(booking -> booking.getStatus() == RentBooking.BookingStatus.PENDING_APPROVAL)
                .count() +
                allPgBookings.stream()
                .filter(booking -> booking.getOwner().getId().equals(currentUser.getId()))
                .filter(booking -> booking.getStatus() == PgBooking.BookingStatus.PENDING_APPROVAL)
                .count();
            
            stats.put("totalActiveRentBookings", activeRentBookings);
            stats.put("totalActivePgBookings", activePgBookings);
            stats.put("pendingApprovals", pendingApprovals);
            stats.put("totalRevenue", calculateTotalRevenue(currentUser.getId(), startDate, endDate, allPayments));
            stats.put("overduePayments", countOverduePaymentsByOwner(currentUser.getId(), allPayments));
        }

        return ResponseEntity.ok(stats);
    }

    // Get payment analytics
    @GetMapping("/payments")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> getPaymentAnalytics() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        User currentUser = userOpt.get();
        Map<String, Object> paymentStats = new HashMap<>();
        List<MonthlyPayment> allPayments = monthlyPaymentRepo.findAll();

        if (currentUser.getRole() == User.Role.ADMIN) {
            long totalPending = allPayments.stream()
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.PENDING)
                .count();
            long totalOverdue = allPayments.stream()
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.OVERDUE)
                .count();
            long totalPaid = allPayments.stream()
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.PAID)
                .count();
            
            BigDecimal pendingAmount = allPayments.stream()
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.PENDING)
                .map(MonthlyPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal overdueAmount = allPayments.stream()
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.OVERDUE)
                .map(payment -> {
                    BigDecimal amount = payment.getAmount();
                    if (payment.getLateFee() != null) {
                        amount = amount.add(payment.getLateFee());
                    }
                    return amount;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            paymentStats.put("totalPending", totalPending);
            paymentStats.put("totalOverdue", totalOverdue);
            paymentStats.put("totalPaid", totalPaid);
            paymentStats.put("pendingAmount", pendingAmount);
            paymentStats.put("overdueAmount", overdueAmount);
        } else {
            // Filter by owner
            List<MonthlyPayment> ownerPayments = allPayments.stream()
                .filter(payment -> {
                    if (payment.getRentBooking() != null) {
                        return payment.getRentBooking().getOwner().getId().equals(currentUser.getId());
                    } else if (payment.getPgBooking() != null) {
                        return payment.getPgBooking().getOwner().getId().equals(currentUser.getId());
                    }
                    return false;
                })
                .collect(Collectors.toList());
            
            long totalPending = ownerPayments.stream()
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.PENDING)
                .count();
            long totalOverdue = ownerPayments.stream()
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.OVERDUE)
                .count();
            long totalPaid = ownerPayments.stream()
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.PAID)
                .count();
            
            BigDecimal pendingAmount = ownerPayments.stream()
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.PENDING)
                .map(MonthlyPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal overdueAmount = ownerPayments.stream()
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.OVERDUE)
                .map(payment -> {
                    BigDecimal amount = payment.getAmount();
                    if (payment.getLateFee() != null) {
                        amount = amount.add(payment.getLateFee());
                    }
                    return amount;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            paymentStats.put("totalPending", totalPending);
            paymentStats.put("totalOverdue", totalOverdue);
            paymentStats.put("totalPaid", totalPaid);
            paymentStats.put("pendingAmount", pendingAmount);
            paymentStats.put("overdueAmount", overdueAmount);
        }

        return ResponseEntity.ok(paymentStats);
    }

    // Get property performance
    @GetMapping("/property-performance")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> getPropertyPerformance(@RequestParam(defaultValue = "10") int limit) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        User currentUser = userOpt.get();
        List<Map<String, Object>> propertyPerformance = new ArrayList<>();

        List<Property> properties;
        if (currentUser.getRole() == User.Role.ADMIN) {
            properties = propertyRepo.findAll();
        } else {
            properties = propertyRepo.findByOwner_Id(currentUser.getId());
        }

        List<RentBooking> allRentBookings = rentBookingRepo.findAll();
        List<MonthlyPayment> allPayments = monthlyPaymentRepo.findAll();

        for (Property property : properties) {
            Map<String, Object> performance = new HashMap<>();
            performance.put("property", property);
            
            // Calculate bookings
            long totalRentBookings = allRentBookings.stream()
                .filter(booking -> booking.getProperty().getId().equals(property.getId()))
                .count();
            long activeRentBookings = allRentBookings.stream()
                .filter(booking -> booking.getProperty().getId().equals(property.getId()))
                .filter(booking -> booking.getStatus() == RentBooking.BookingStatus.ACTIVE)
                .count();
            
            // Calculate revenue (simplified)
            BigDecimal propertyRevenue = allPayments.stream()
                .filter(payment -> payment.getRentBooking() != null)
                .filter(payment -> payment.getRentBooking().getProperty().getId().equals(property.getId()))
                .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.PAID)
                .filter(payment -> payment.getPaidDate() != null && 
                       payment.getPaidDate().isAfter(LocalDate.now().minusMonths(12)))
                .map(MonthlyPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            performance.put("totalBookings", totalRentBookings);
            performance.put("activeBookings", activeRentBookings);
            performance.put("occupancyRate", totalRentBookings > 0 ? (double) activeRentBookings / totalRentBookings * 100 : 0);
            performance.put("annualRevenue", propertyRevenue);
            performance.put("averageRating", 4.2); // Mock data for now
            
            propertyPerformance.add(performance);
        }

        // Sort by revenue and limit results
        propertyPerformance.sort((a, b) -> ((BigDecimal) b.get("annualRevenue")).compareTo((BigDecimal) a.get("annualRevenue")));
        List<Map<String, Object>> topProperties = propertyPerformance.stream().limit(limit).collect(Collectors.toList());

        return ResponseEntity.ok(topProperties);
    }

    // Helper methods
    private BigDecimal calculateTotalRevenue(Long ownerId, LocalDate startDate, LocalDate endDate, List<MonthlyPayment> allPayments) {
        return allPayments.stream()
            .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.PAID)
            .filter(payment -> payment.getPaidDate() != null)
            .filter(payment -> !payment.getPaidDate().isBefore(startDate) && !payment.getPaidDate().isAfter(endDate))
            .filter(payment -> {
                if (ownerId == null) return true;
                if (payment.getRentBooking() != null) {
                    return payment.getRentBooking().getOwner().getId().equals(ownerId);
                } else if (payment.getPgBooking() != null) {
                    return payment.getPgBooking().getOwner().getId().equals(ownerId);
                }
                return false;
            })
            .map(MonthlyPayment::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private long countOverduePayments(List<MonthlyPayment> allPayments) {
        LocalDate today = LocalDate.now();
        return allPayments.stream()
            .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.OVERDUE ||
                             (payment.getStatus() == MonthlyPayment.PaymentStatus.PENDING && 
                              payment.getDueDate().isBefore(today)))
            .count();
    }

    private long countOverduePaymentsByOwner(Long ownerId, List<MonthlyPayment> allPayments) {
        LocalDate today = LocalDate.now();
        return allPayments.stream()
            .filter(payment -> {
                if (payment.getRentBooking() != null) {
                    return payment.getRentBooking().getOwner().getId().equals(ownerId);
                } else if (payment.getPgBooking() != null) {
                    return payment.getPgBooking().getOwner().getId().equals(ownerId);
                }
                return false;
            })
            .filter(payment -> payment.getStatus() == MonthlyPayment.PaymentStatus.OVERDUE ||
                             (payment.getStatus() == MonthlyPayment.PaymentStatus.PENDING && 
                              payment.getDueDate().isBefore(today)))
            .count();
    }

    private Optional<User> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) return Optional.empty();
            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
                String email = userDetails.getUsername();
                return userRepo.findByEmailAndEnabledTrue(email);
            }
            if (principal instanceof User u) return Optional.of(u);
            return Optional.empty();
        } catch (Exception e) { return Optional.empty(); }
    }
}

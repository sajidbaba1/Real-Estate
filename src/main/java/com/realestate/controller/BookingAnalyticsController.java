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
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/booking-analytics")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class BookingAnalyticsController {

    @Autowired private RentBookingRepository rentBookingRepo;
    @Autowired private PgBookingRepository pgBookingRepo;
    @Autowired private MonthlyPaymentRepository monthlyPaymentRepo;
    @Autowired private PropertyRepository propertyRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private BookingReviewRepository reviewRepo;

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
        
        if (currentUser.getRole() == User.Role.ADMIN) {
            // Admin sees all bookings
            stats.put("totalActiveRentBookings", rentBookingRepo.countByStatus(RentBooking.BookingStatus.ACTIVE));
            stats.put("totalActivePgBookings", pgBookingRepo.countByStatus(PgBooking.BookingStatus.ACTIVE));
            stats.put("pendingApprovals", 
                rentBookingRepo.countByStatus(RentBooking.BookingStatus.PENDING_APPROVAL) +
                pgBookingRepo.countByStatus(PgBooking.BookingStatus.PENDING_APPROVAL));
            stats.put("totalRevenue", calculateTotalRevenue(null, startDate, endDate));
            stats.put("overduePayments", monthlyPaymentRepo.countOverduePayments(LocalDate.now()));
        } else {
            // Owner sees only their bookings
            stats.put("totalActiveRentBookings", rentBookingRepo.countByOwner_IdAndStatus(currentUser.getId(), RentBooking.BookingStatus.ACTIVE));
            stats.put("totalActivePgBookings", pgBookingRepo.countByOwner_IdAndStatus(currentUser.getId(), PgBooking.BookingStatus.ACTIVE));
            stats.put("pendingApprovals", 
                rentBookingRepo.countByOwner_IdAndStatus(currentUser.getId(), RentBooking.BookingStatus.PENDING_APPROVAL) +
                pgBookingRepo.countByOwner_IdAndStatus(currentUser.getId(), PgBooking.BookingStatus.PENDING_APPROVAL));
            stats.put("totalRevenue", calculateTotalRevenue(currentUser.getId(), startDate, endDate));
            stats.put("overduePayments", monthlyPaymentRepo.countOverduePaymentsByOwner(currentUser.getId(), LocalDate.now()));
        }

        return ResponseEntity.ok(stats);
    }

    // Get revenue analytics
    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> getRevenueAnalytics(@RequestParam(defaultValue = "monthly") String period,
                                                @RequestParam(defaultValue = "12") int periods) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        User currentUser = userOpt.get();
        Long ownerId = currentUser.getRole() == User.Role.ADMIN ? null : currentUser.getId();

        List<Map<String, Object>> revenueData = new ArrayList<>();
        LocalDate currentDate = LocalDate.now();
        
        for (int i = periods - 1; i >= 0; i--) {
            LocalDate startDate, endDate;
            String label;
            
            if ("monthly".equals(period)) {
                startDate = currentDate.minusMonths(i).withDayOfMonth(1);
                endDate = startDate.plusMonths(1).minusDays(1);
                label = startDate.format(DateTimeFormatter.ofPattern("MMM yyyy"));
            } else {
                startDate = currentDate.minusWeeks(i).with(java.time.DayOfWeek.MONDAY);
                endDate = startDate.plusWeeks(1).minusDays(1);
                label = "Week " + startDate.format(DateTimeFormatter.ofPattern("MMM dd"));
            }
            
            BigDecimal revenue = calculateTotalRevenue(ownerId, startDate, endDate);
            
            Map<String, Object> periodData = new HashMap<>();
            periodData.put("period", label);
            periodData.put("revenue", revenue);
            periodData.put("startDate", startDate);
            periodData.put("endDate", endDate);
            revenueData.add(periodData);
        }

        return ResponseEntity.ok(revenueData);
    }

    // Get booking trends
    @GetMapping("/booking-trends")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> getBookingTrends(@RequestParam(defaultValue = "30") int days) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        User currentUser = userOpt.get();
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days);

        Map<String, Object> trends = new HashMap<>();
        
        if (currentUser.getRole() == User.Role.ADMIN) {
            trends.put("newBookings", rentBookingRepo.countCreatedBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59)) +
                                    pgBookingRepo.countCreatedBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59)));
            trends.put("approvedBookings", rentBookingRepo.countApprovedBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59)) +
                                         pgBookingRepo.countApprovedBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59)));
            trends.put("cancelledBookings", rentBookingRepo.countByStatusAndUpdatedAtBetween(RentBooking.BookingStatus.CANCELLED, startDate.atStartOfDay(), endDate.atTime(23, 59, 59)) +
                                          pgBookingRepo.countByStatusAndUpdatedAtBetween(PgBooking.BookingStatus.CANCELLED, startDate.atStartOfDay(), endDate.atTime(23, 59, 59)));
        } else {
            trends.put("newBookings", rentBookingRepo.countByOwner_IdAndCreatedAtBetween(currentUser.getId(), startDate.atStartOfDay(), endDate.atTime(23, 59, 59)) +
                                    pgBookingRepo.countByOwner_IdAndCreatedAtBetween(currentUser.getId(), startDate.atStartOfDay(), endDate.atTime(23, 59, 59)));
            trends.put("approvedBookings", rentBookingRepo.countByOwner_IdAndApprovalDateBetween(currentUser.getId(), startDate.atStartOfDay(), endDate.atTime(23, 59, 59)) +
                                         pgBookingRepo.countByOwner_IdAndApprovalDateBetween(currentUser.getId(), startDate.atStartOfDay(), endDate.atTime(23, 59, 59)));
            trends.put("cancelledBookings", rentBookingRepo.countByOwner_IdAndStatusAndUpdatedAtBetween(currentUser.getId(), RentBooking.BookingStatus.CANCELLED, startDate.atStartOfDay(), endDate.atTime(23, 59, 59)) +
                                          pgBookingRepo.countByOwner_IdAndStatusAndUpdatedAtBetween(currentUser.getId(), PgBooking.BookingStatus.CANCELLED, startDate.atStartOfDay(), endDate.atTime(23, 59, 59)));
        }

        return ResponseEntity.ok(trends);
    }

    // Get payment analytics
    @GetMapping("/payments")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> getPaymentAnalytics() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        User currentUser = userOpt.get();
        Map<String, Object> paymentStats = new HashMap<>();

        if (currentUser.getRole() == User.Role.ADMIN) {
            paymentStats.put("totalPending", monthlyPaymentRepo.countByStatus(MonthlyPayment.PaymentStatus.PENDING));
            paymentStats.put("totalOverdue", monthlyPaymentRepo.countByStatus(MonthlyPayment.PaymentStatus.OVERDUE));
            paymentStats.put("totalPaid", monthlyPaymentRepo.countByStatus(MonthlyPayment.PaymentStatus.PAID));
            paymentStats.put("pendingAmount", monthlyPaymentRepo.sumPendingAmount());
            paymentStats.put("overdueAmount", monthlyPaymentRepo.sumOverdueAmount());
        } else {
            paymentStats.put("totalPending", monthlyPaymentRepo.countPendingByOwner(currentUser.getId()));
            paymentStats.put("totalOverdue", monthlyPaymentRepo.countOverdueByOwner(currentUser.getId()));
            paymentStats.put("totalPaid", monthlyPaymentRepo.countPaidByOwner(currentUser.getId()));
            paymentStats.put("pendingAmount", monthlyPaymentRepo.sumPendingAmountByOwner(currentUser.getId()));
            paymentStats.put("overdueAmount", monthlyPaymentRepo.sumOverdueAmountByOwner(currentUser.getId()));
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

        for (Property property : properties) {
            Map<String, Object> performance = new HashMap<>();
            performance.put("property", property);
            
            // Calculate occupancy rate
            long totalRentBookings = rentBookingRepo.countByProperty_Id(property.getId());
            long activeRentBookings = rentBookingRepo.countByProperty_IdAndStatus(property.getId(), RentBooking.BookingStatus.ACTIVE);
            
            // Calculate revenue
            BigDecimal propertyRevenue = monthlyPaymentRepo.sumRevenueBetweenForProperty(
                property.getId(), LocalDate.now().minusMonths(12).atStartOfDay(), LocalDate.now().atTime(23, 59, 59));
            
            // Calculate average rating
            Double avgRating = reviewRepo.calculateAverageRatingForProperty(property.getId());
            
            performance.put("totalBookings", totalRentBookings);
            performance.put("activeBookings", activeRentBookings);
            performance.put("occupancyRate", totalRentBookings > 0 ? (double) activeRentBookings / totalRentBookings * 100 : 0);
            performance.put("annualRevenue", propertyRevenue != null ? propertyRevenue : BigDecimal.ZERO);
            performance.put("averageRating", avgRating != null ? avgRating : 0.0);
            
            propertyPerformance.add(performance);
        }

        // Sort by revenue and limit results
        propertyPerformance.sort((a, b) -> ((BigDecimal) b.get("annualRevenue")).compareTo((BigDecimal) a.get("annualRevenue")));
        List<Map<String, Object>> topProperties = propertyPerformance.stream().limit(limit).collect(Collectors.toList());

        return ResponseEntity.ok(topProperties);
    }

    // Get tenant analytics
    @GetMapping("/tenant-analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getTenantAnalytics() {
        Map<String, Object> tenantStats = new HashMap<>();
        
        tenantStats.put("totalTenants", userRepo.countByRole(User.Role.USER));
        tenantStats.put("activeTenants", rentBookingRepo.countDistinctActiveTenants() + pgBookingRepo.countDistinctActiveTenants());
        LocalDate firstOfMonth = LocalDate.now().withDayOfMonth(1);
        tenantStats.put("newTenantsThisMonth", userRepo.countCreatedSince(firstOfMonth.atStartOfDay()));
        
        // Top rated tenants
        Pageable topTen = PageRequest.of(0, 10);
        List<Object[]> rawTop = reviewRepo.findTopRatedTenants(topTen);
        List<Map<String, Object>> topTenants = rawTop.stream().map(row -> {
            Map<String, Object> m = new HashMap<>();
            m.put("userId", row[0]);
            m.put("firstName", row[1]);
            m.put("lastName", row[2]);
            m.put("averageRating", row[3]);
            m.put("reviewCount", row[4]);
            return m;
        }).collect(Collectors.toList());
        tenantStats.put("topRatedTenants", topTenants);

        return ResponseEntity.ok(tenantStats);
    }

    // Export analytics data
    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> exportAnalytics(@RequestParam String type,
                                           @RequestParam(required = false) String startDate,
                                           @RequestParam(required = false) String endDate) {
        // This would typically generate CSV/Excel files
        // For now, return structured data that frontend can process
        
        Map<String, Object> exportData = new HashMap<>();
        exportData.put("type", type);
        exportData.put("generatedAt", LocalDateTime.now());
        exportData.put("dateRange", Map.of("start", startDate, "end", endDate));
        
        switch (type) {
            case "revenue":
                exportData.put("data", getRevenueAnalytics("monthly", 12).getBody());
                break;
            case "bookings":
                exportData.put("data", getBookingTrends(90).getBody());
                break;
            case "payments":
                exportData.put("data", getPaymentAnalytics().getBody());
                break;
            default:
                return ResponseEntity.badRequest().body("Invalid export type");
        }

        return ResponseEntity.ok(exportData);
    }

    // Helper methods
    private BigDecimal calculateTotalRevenue(Long ownerId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);
        
        if (ownerId != null) {
            return monthlyPaymentRepo.sumRevenueBetweenForOwner(ownerId, start, end);
        } else {
            return monthlyPaymentRepo.sumRevenueBetween(start, end);
        }
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

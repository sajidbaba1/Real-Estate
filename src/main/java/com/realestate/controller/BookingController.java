package com.realestate.controller;

import com.realestate.entity.*;
import com.realestate.repository.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class BookingController {

    @Autowired private RentBookingRepository rentBookingRepo;
    @Autowired private PgBookingRepository pgBookingRepo;
    @Autowired private MonthlyPaymentRepository monthlyPaymentRepo;
    @Autowired private PropertyRepository propertyRepo;
    @Autowired private PgBedRepository pgBedRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private WalletController walletController;
    @Autowired private BookingNotificationRepository notificationRepo;

    // DTOs
    public static class CreateRentBookingRequest {
        public Long propertyId;
        public LocalDate startDate;
        public LocalDate endDate; // optional
        public BigDecimal monthlyRent;
        public BigDecimal securityDeposit;
    }

    public static class CreatePgBookingRequest {
        public Long bedId;
        public LocalDate startDate;
        public LocalDate endDate; // optional
        public BigDecimal monthlyRent;
        public BigDecimal securityDeposit;
    }

    // Create rent booking
    @PostMapping("/rent")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> createRentBooking(@Valid @RequestBody CreateRentBookingRequest req) {
        Optional<User> tenantOpt = getCurrentUser();
        if (tenantOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User tenant = tenantOpt.get();

        Optional<Property> propertyOpt = propertyRepo.findById(req.propertyId);
        if (propertyOpt.isEmpty()) return ResponseEntity.notFound().build();
        Property property = propertyOpt.get();

        if (property.getStatus() != Property.PropertyStatus.FOR_RENT) {
            return ResponseEntity.badRequest().body("Property is not available for rent");
        }

        // Check availability
        LocalDate endDate = req.endDate != null ? req.endDate : LocalDate.now().plusYears(10); // Far future if indefinite
        List<RentBooking> conflicts = rentBookingRepo.findConflictingBookings(req.propertyId, req.startDate, endDate);
        if (!conflicts.isEmpty()) {
            return ResponseEntity.badRequest().body("Property is not available for the requested dates");
        }

        RentBooking booking = new RentBooking();
        booking.setProperty(property);
        booking.setTenant(tenant);
        booking.setOwner(property.getOwner());
        booking.setStartDate(req.startDate);
        booking.setEndDate(req.endDate);
        booking.setMonthlyRent(req.monthlyRent);
        booking.setSecurityDeposit(req.securityDeposit);
        booking.setStatus(RentBooking.BookingStatus.PENDING_APPROVAL);
        booking = rentBookingRepo.save(booking);

        // Property status will be updated to RENTED only after approval
        // Don't generate payment until booking is approved

        return ResponseEntity.status(HttpStatus.CREATED).body(booking);
    }

    // Create PG booking
    @PostMapping("/pg")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> createPgBooking(@Valid @RequestBody CreatePgBookingRequest req) {
        Optional<User> tenantOpt = getCurrentUser();
        if (tenantOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User tenant = tenantOpt.get();

        Optional<PgBed> bedOpt = pgBedRepo.findById(req.bedId);
        if (bedOpt.isEmpty()) return ResponseEntity.notFound().build();
        PgBed bed = bedOpt.get();

        if (bed.getIsOccupied()) {
            return ResponseEntity.badRequest().body("Bed is already occupied");
        }

        // Check availability
        LocalDate endDate = req.endDate != null ? req.endDate : LocalDate.now().plusYears(10);
        List<PgBooking> conflicts = pgBookingRepo.findConflictingBedBookings(req.bedId, req.startDate, endDate);
        if (!conflicts.isEmpty()) {
            return ResponseEntity.badRequest().body("Bed is not available for the requested dates");
        }

        PgBooking booking = new PgBooking();
        booking.setBed(bed);
        booking.setTenant(tenant);
        booking.setOwner(bed.getRoom().getProperty().getOwner());
        booking.setStartDate(req.startDate);
        booking.setEndDate(req.endDate);
        booking.setMonthlyRent(req.monthlyRent);
        booking.setSecurityDeposit(req.securityDeposit);
        booking.setStatus(PgBooking.BookingStatus.ACTIVE);
        booking = pgBookingRepo.save(booking);

        // Mark bed as occupied
        bed.setIsOccupied(true);
        pgBedRepo.save(bed);

        // Generate first monthly payment
        generateMonthlyPayment(null, booking);

        return ResponseEntity.status(HttpStatus.CREATED).body(booking);
    }

    // Get my bookings (as tenant)
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getMyBookings() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        List<RentBooking> rentBookings = rentBookingRepo.findByTenant_Id(user.getId());
        List<PgBooking> pgBookings = pgBookingRepo.findByTenant_Id(user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("rentBookings", rentBookings);
        response.put("pgBookings", pgBookings);
        return ResponseEntity.ok(response);
    }

    // Get bookings for my properties (as owner)
    @GetMapping("/owner")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> getOwnerBookings() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        List<RentBooking> rentBookings = user.getRole() == User.Role.ADMIN ? 
            rentBookingRepo.findAll() : rentBookingRepo.findByOwner_Id(user.getId());
        List<PgBooking> pgBookings = user.getRole() == User.Role.ADMIN ? 
            pgBookingRepo.findAll() : pgBookingRepo.findByOwner_Id(user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("rentBookings", rentBookings);
        response.put("pgBookings", pgBookings);
        return ResponseEntity.ok(response);
    }

    // Get monthly payments for tenant
    @GetMapping("/payments/my")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getMyPayments() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        List<MonthlyPayment> payments = monthlyPaymentRepo.findByTenantAndStatus(user.getId(), MonthlyPayment.PaymentStatus.PENDING);
        return ResponseEntity.ok(payments);
    }

    // Pay monthly rent via wallet
    @PostMapping("/payments/{paymentId}/pay")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> payMonthlyRent(@PathVariable Long paymentId) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userOpt.get();

        Optional<MonthlyPayment> paymentOpt = monthlyPaymentRepo.findById(paymentId);
        if (paymentOpt.isEmpty()) return ResponseEntity.notFound().build();
        MonthlyPayment payment = paymentOpt.get();

        // Verify ownership
        boolean isOwner = (payment.getRentBooking() != null && payment.getRentBooking().getTenant().getId().equals(user.getId())) ||
                         (payment.getPgBooking() != null && payment.getPgBooking().getTenant().getId().equals(user.getId()));
        if (!isOwner && user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (payment.getStatus() != MonthlyPayment.PaymentStatus.PENDING) {
            return ResponseEntity.badRequest().body("Payment is not pending");
        }

        // Deduct from wallet
        boolean success = walletController.deductMoney(user.getId(), payment.getAmount(), 
            "Monthly rent payment", "payment_" + payment.getId());
        if (!success) {
            return ResponseEntity.badRequest().body("Insufficient wallet balance");
        }

        // Update payment status
        payment.setStatus(MonthlyPayment.PaymentStatus.PAID);
        payment.setPaidDate(LocalDate.now());
        payment.setPaymentReference("wallet_" + user.getId());
        monthlyPaymentRepo.save(payment);

        // Generate next month's payment
        if (payment.getRentBooking() != null) {
            generateMonthlyPayment(payment.getRentBooking(), null);
        } else if (payment.getPgBooking() != null) {
            generateMonthlyPayment(null, payment.getPgBooking());
        }

        return ResponseEntity.ok(payment);
    }

    // Helper methods
    private void generateMonthlyPayment(RentBooking rentBooking, PgBooking pgBooking) {
        MonthlyPayment payment = new MonthlyPayment();
        
        if (rentBooking != null) {
            payment.setRentBooking(rentBooking);
            payment.setAmount(rentBooking.getMonthlyRent());
            // Find next due date
            LocalDate nextDue = findNextDueDate(rentBooking.getId(), true);
            payment.setDueDate(nextDue);
        } else if (pgBooking != null) {
            payment.setPgBooking(pgBooking);
            payment.setAmount(pgBooking.getMonthlyRent());
            // Find next due date
            LocalDate nextDue = findNextDueDate(pgBooking.getId(), false);
            payment.setDueDate(nextDue);
        }
        
        payment.setStatus(MonthlyPayment.PaymentStatus.PENDING);
        monthlyPaymentRepo.save(payment);
    }

    private LocalDate findNextDueDate(Long bookingId, boolean isRent) {
        List<MonthlyPayment> existing;
        if (isRent) {
            existing = monthlyPaymentRepo.findByRentBooking_Id(bookingId);
        } else {
            existing = monthlyPaymentRepo.findByPgBooking_Id(bookingId);
        }
        
        if (existing.isEmpty()) {
            return LocalDate.now().withDayOfMonth(1); // First of current month
        }
        
        // Find latest due date and add one month
        LocalDate latestDue = existing.stream()
            .map(MonthlyPayment::getDueDate)
            .max(LocalDate::compareTo)
            .orElse(LocalDate.now().withDayOfMonth(1));
        
        return latestDue.plusMonths(1);
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

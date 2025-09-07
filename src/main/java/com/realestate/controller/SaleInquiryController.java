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
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class SaleInquiryController {

    @Autowired private SaleInquiryRepository inquiryRepo;
    @Autowired private SaleNegotiationRepository negotiationRepo;
    @Autowired private PropertyRepository propertyRepo;
    @Autowired private UserRepository userRepo;

    // DTOs
    public static class CreateInquiryRequest {
        public Long propertyId;
        public BigDecimal amount;
        public String message;
    }

    public static class OfferRequest {
        public BigDecimal amount;
        public String message;
    }

    // Create inquiry (CUSTOMER)
    @PostMapping("/inquiries")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> createInquiry(@Valid @RequestBody CreateInquiryRequest req) {
        Optional<User> currentOpt = currentUser();
        if (currentOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User customer = currentOpt.get();

        Optional<Property> propertyOpt = propertyRepo.findById(req.propertyId);
        if (propertyOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Property not found");
        Property property = propertyOpt.get();
        if (property.getOwner() == null) return ResponseEntity.badRequest().body("Property has no owner");

        SaleInquiry inquiry = new SaleInquiry();
        inquiry.setProperty(property);
        inquiry.setCustomer(customer);
        inquiry.setOwner(property.getOwner());
        inquiry.setStatus(SaleInquiry.InquiryStatus.ACTIVE);
        inquiry.setDealStatus(SaleInquiry.DealStatus.PENDING);
        inquiry = inquiryRepo.save(inquiry);

        if (req.amount != null || (req.message != null && !req.message.isBlank())) {
            SaleNegotiation n = new SaleNegotiation();
            n.setInquiry(inquiry);
            n.setOfferedBy(SaleNegotiation.Party.CUSTOMER);
            n.setAmount(req.amount);
            n.setMessage(req.message);
            n.setStatus(SaleNegotiation.NegotiationStatus.PENDING);
            negotiationRepo.save(n);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(inquiry);
    }

    // List my inquiries (CUSTOMER)
    @GetMapping("/inquiries/my")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> myInquiries() {
        Optional<User> currentOpt = currentUser();
        if (currentOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User me = currentOpt.get();
        List<SaleInquiry> list = inquiryRepo.findByCustomer_Id(me.getId());
        return ResponseEntity.ok(list);
    }

    // List inquiries on my properties (OWNER/ADMIN)
    @GetMapping("/inquiries/owner")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> ownerInquiries() {
        Optional<User> currentOpt = currentUser();
        if (currentOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User me = currentOpt.get();
        List<SaleInquiry> list = me.getRole() == User.Role.ADMIN ? inquiryRepo.findAll() : inquiryRepo.findByOwner_Id(me.getId());
        return ResponseEntity.ok(list);
    }

    // Get inquiry with negotiations
    @GetMapping("/inquiries/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> getInquiry(@PathVariable Long id) {
        Optional<SaleInquiry> inqOpt = inquiryRepo.findById(id);
        if (inqOpt.isEmpty()) return ResponseEntity.notFound().build();
        SaleInquiry inq = inqOpt.get();
        if (!canView(inq)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(inq);
    }

    // Add offer by customer
    @PostMapping("/inquiries/{id}/offer/customer")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> offerByCustomer(@PathVariable Long id, @Valid @RequestBody OfferRequest req) {
        Optional<SaleInquiry> inqOpt = inquiryRepo.findById(id);
        if (inqOpt.isEmpty()) return ResponseEntity.notFound().build();
        SaleInquiry inq = inqOpt.get();
        Optional<User> meOpt = currentUser();
        if (meOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (!inq.getCustomer().getId().equals(meOpt.get().getId()) && meOpt.get().getRole() != User.Role.ADMIN)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (inq.getStatus() != SaleInquiry.InquiryStatus.ACTIVE)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Inquiry is not active");

        SaleNegotiation n = new SaleNegotiation();
        n.setInquiry(inq);
        n.setOfferedBy(SaleNegotiation.Party.CUSTOMER);
        n.setAmount(req.amount);
        n.setMessage(req.message);
        n.setStatus(SaleNegotiation.NegotiationStatus.PENDING);
        negotiationRepo.save(n);
        return ResponseEntity.status(HttpStatus.CREATED).body(n);
    }

    // Add action by owner: accept or reject latest pending
    @PostMapping("/inquiries/{id}/owner/accept")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> ownerAccept(@PathVariable Long id, @Valid @RequestBody OfferRequest req) {
        Optional<SaleInquiry> inqOpt = inquiryRepo.findById(id);
        if (inqOpt.isEmpty()) return ResponseEntity.notFound().build();
        SaleInquiry inq = inqOpt.get();
        if (!canManage(inq)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (inq.getStatus() != SaleInquiry.InquiryStatus.ACTIVE)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Inquiry is not active");

        // Owner reply negotiation (optional message/amount)
        SaleNegotiation n = new SaleNegotiation();
        n.setInquiry(inq);
        n.setOfferedBy(SaleNegotiation.Party.OWNER);
        n.setAmount(req.amount);
        n.setMessage(req.message);
        n.setStatus(SaleNegotiation.NegotiationStatus.ACCEPTED);
        negotiationRepo.save(n);

        inq.setDealStatus(SaleInquiry.DealStatus.ACCEPTED);
        inq.setAcceptedAmount(req.amount);
        inquiryRepo.save(inq);
        return ResponseEntity.ok(inq);
    }

    @PostMapping("/inquiries/{id}/owner/reject")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> ownerReject(@PathVariable Long id, @Valid @RequestBody OfferRequest req) {
        Optional<SaleInquiry> inqOpt = inquiryRepo.findById(id);
        if (inqOpt.isEmpty()) return ResponseEntity.notFound().build();
        SaleInquiry inq = inqOpt.get();
        if (!canManage(inq)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (inq.getStatus() != SaleInquiry.InquiryStatus.ACTIVE)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Inquiry is not active");

        SaleNegotiation n = new SaleNegotiation();
        n.setInquiry(inq);
        n.setOfferedBy(SaleNegotiation.Party.OWNER);
        n.setAmount(req.amount);
        n.setMessage(req.message);
        n.setStatus(SaleNegotiation.NegotiationStatus.REJECTED);
        negotiationRepo.save(n);
        return ResponseEntity.ok(inq);
    }

    // Cancel inquiry (CUSTOMER)
    @PatchMapping("/inquiries/{id}/cancel")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> cancelInquiry(@PathVariable Long id) {
        Optional<SaleInquiry> inqOpt = inquiryRepo.findById(id);
        if (inqOpt.isEmpty()) return ResponseEntity.notFound().build();
        SaleInquiry inq = inqOpt.get();
        Optional<User> meOpt = currentUser();
        if (meOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (!inq.getCustomer().getId().equals(meOpt.get().getId()) && meOpt.get().getRole() != User.Role.ADMIN)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        inq.setStatus(SaleInquiry.InquiryStatus.CANCELLED);
        inquiryRepo.save(inq);
        return ResponseEntity.ok(inq);
    }

    // Helpers
    private Optional<User> currentUser() {
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

    private boolean canView(SaleInquiry inq) {
        Optional<User> meOpt = currentUser();
        if (meOpt.isEmpty()) return false;
        User me = meOpt.get();
        if (me.getRole() == User.Role.ADMIN) return true;
        return inq.getCustomer().getId().equals(me.getId()) || inq.getOwner().getId().equals(me.getId());
    }

    private boolean canManage(SaleInquiry inq) {
        Optional<User> meOpt = currentUser();
        if (meOpt.isEmpty()) return false;
        User me = meOpt.get();
        if (me.getRole() == User.Role.ADMIN) return true;
        return inq.getOwner().getId().equals(me.getId());
    }
}

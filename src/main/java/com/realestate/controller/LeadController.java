package com.realestate.controller;

import com.realestate.entity.Lead;
import com.realestate.entity.User;
import com.realestate.repository.LeadRepository;
import com.realestate.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/leads")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class LeadController {

    @Autowired private LeadRepository leadRepo;
    @Autowired private UserRepository userRepo;

    public static class CreateLeadRequest {
        public String customerName;
        public String customerEmail;
        public String customerPhone;
        public Lead.Source source;
        public String city;
        public String notes;
        public String budgetMin;
        public String budgetMax;
        public Long assignedAgentId; // optional; default to current agent
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> create(@Valid @RequestBody CreateLeadRequest req) {
        Optional<User> currentOpt = getCurrentUser();
        if (currentOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User current = currentOpt.get();

        Lead lead = new Lead();
        lead.setCustomerName(req.customerName);
        lead.setCustomerEmail(req.customerEmail);
        lead.setCustomerPhone(req.customerPhone);
        if (req.source != null) lead.setSource(req.source); else lead.setSource(Lead.Source.PORTAL);
        lead.setCity(req.city);
        lead.setNotes(req.notes);
        try { if (req.budgetMin != null) lead.setBudgetMin(new java.math.BigDecimal(req.budgetMin)); } catch (Exception ignored) {}
        try { if (req.budgetMax != null) lead.setBudgetMax(new java.math.BigDecimal(req.budgetMax)); } catch (Exception ignored) {}

        User assignTo = current;
        if (req.assignedAgentId != null) {
            assignTo = userRepo.findById(req.assignedAgentId).orElse(current);
        }
        lead.setAssignedAgent(assignTo);
        Lead saved = leadRepo.save(lead);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> list(@RequestParam(required = false) Lead.Stage stage,
                                  @RequestParam(required = false) String city,
                                  @RequestParam(required = false, defaultValue = "true") boolean mine) {
        Optional<User> currentOpt = getCurrentUser();
        if (currentOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User current = currentOpt.get();

        List<Lead> leads;
        boolean isAdmin = current.getRole() == User.Role.ADMIN;
        if (!mine && isAdmin) {
            leads = leadRepo.findByFilters(stage, city);
        } else {
            leads = leadRepo.findByAgentWithFilters(current.getId(), stage, city);
        }
        return ResponseEntity.ok(leads);
    }

    public static class UpdateLeadRequest {
        public Lead.Stage stage;
        public String notes;
        public String city;
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UpdateLeadRequest req) {
        Optional<User> currentOpt = getCurrentUser();
        if (currentOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User current = currentOpt.get();

        Optional<Lead> opt = leadRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Lead lead = opt.get();

        boolean isAdmin = current.getRole() == User.Role.ADMIN;
        boolean isAssigned = lead.getAssignedAgent() != null && lead.getAssignedAgent().getId().equals(current.getId());
        if (!isAdmin && !isAssigned) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        if (req.stage != null) lead.setStage(req.stage);
        if (req.notes != null) lead.setNotes(req.notes);
        if (req.city != null) lead.setCity(req.city);
        Lead saved = leadRepo.save(lead);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        Optional<User> currentOpt = getCurrentUser();
        if (currentOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User current = currentOpt.get();

        Optional<Lead> opt = leadRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Lead lead = opt.get();
        boolean isAdmin = current.getRole() == User.Role.ADMIN;
        boolean isAssigned = lead.getAssignedAgent() != null && lead.getAssignedAgent().getId().equals(current.getId());
        if (!isAdmin && !isAssigned) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(lead);
    }

    private Optional<User> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) return Optional.empty();
            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
                return userRepo.findByEmailAndEnabledTrue(userDetails.getUsername());
            }
            if (principal instanceof User u) return Optional.of(u);
            return Optional.empty();
        } catch (Exception e) { return Optional.empty(); }
    }
}

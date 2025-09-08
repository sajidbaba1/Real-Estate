package com.realestate.controller;

import com.realestate.entity.Property;
import com.realestate.repository.PropertyRepository;
import com.realestate.entity.User;
import com.realestate.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Map;

@RestController
@RequestMapping("/api/properties")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class PropertyController {

    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private UserRepository userRepository;

    // Get all properties
    @GetMapping
    public ResponseEntity<List<Property>> getAllProperties() {
        List<Property> properties = propertyRepository.findAll();
        return ResponseEntity.ok(properties);
    }

    // Public: Get only APPROVED properties (for marketplace visibility)
    @GetMapping("/approved")
    public ResponseEntity<List<Property>> getApprovedProperties() {
        List<Property> properties = propertyRepository.findAllApproved();
        return ResponseEntity.ok(properties);
    }

    // Counts
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> countAllProperties() {
        long total = propertyRepository.count();
        return ResponseEntity.ok(Map.of("total", total));
    }

    @GetMapping("/approved/count")
    public ResponseEntity<Map<String, Long>> countApprovedProperties() {
        long count = propertyRepository.findAllApproved().size();
        return ResponseEntity.ok(Map.of("approved", count));
    }

    // Get property by ID (public access)
    @GetMapping("/{id}")
    public ResponseEntity<Property> getPropertyById(@PathVariable Long id) {
        Optional<Property> property = propertyRepository.findById(id);
        return property.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.notFound().build());
    }

    // Public property detail endpoint (no auth required)
    @GetMapping("/public/{id}")
    public ResponseEntity<Property> getPublicPropertyById(@PathVariable Long id) {
        Optional<Property> property = propertyRepository.findById(id);
        return property.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.notFound().build());
    }

    // Create new property (owner = current authenticated user if available)
    @PostMapping
    public ResponseEntity<Property> createProperty(@Valid @RequestBody Property property) {
        getCurrentUser().ifPresent(property::setOwner);
        Property savedProperty = propertyRepository.save(property);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedProperty);
    }

    // Update property
    @PutMapping("/{id}")
    public ResponseEntity<Property> updateProperty(@PathVariable Long id, @Valid @RequestBody Property propertyDetails) {
        Optional<Property> optionalProperty = propertyRepository.findById(id);
        
        if (optionalProperty.isPresent()) {
            Property property = optionalProperty.get();

            // Authorization: only ADMIN or owner can update
            Optional<User> currentUserOpt = getCurrentUser();
            if (currentUserOpt.isPresent()) {
                User current = currentUserOpt.get();
                boolean isAdmin = current.getRole() == User.Role.ADMIN;
                boolean isOwner = property.getOwner() != null && property.getOwner().getId().equals(current.getId());
                if (!isAdmin && !isOwner) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }

            property.setTitle(propertyDetails.getTitle());
            property.setDescription(propertyDetails.getDescription());
            property.setPrice(propertyDetails.getPrice());
            property.setAddress(propertyDetails.getAddress());
            property.setCity(propertyDetails.getCity());
            property.setState(propertyDetails.getState());
            property.setZipCode(propertyDetails.getZipCode());
            property.setBedrooms(propertyDetails.getBedrooms());
            property.setBathrooms(propertyDetails.getBathrooms());
            property.setSquareFeet(propertyDetails.getSquareFeet());
            property.setPropertyType(propertyDetails.getPropertyType());
            property.setStatus(propertyDetails.getStatus());
            // listing and pricing details
            property.setListingType(propertyDetails.getListingType());
            property.setPriceType(propertyDetails.getPriceType());
            property.setImageUrl(propertyDetails.getImageUrl());
            property.setLatitude(propertyDetails.getLatitude());
            property.setLongitude(propertyDetails.getLongitude());
            // Do not allow changing owner via update body; preserve existing owner
            
            Property updatedProperty = propertyRepository.save(property);
            return ResponseEntity.ok(updatedProperty);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Assign current authenticated ADMIN/AGENT as owner of a property
    @PatchMapping("/{id}/assign-owner")
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public ResponseEntity<?> assignOwner(@PathVariable Long id) {
        Optional<Property> optional = propertyRepository.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();

        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User me = currentUserOpt.get();

        // Only ADMIN/AGENT can call due to PreAuthorize, set owner to current user
        Property p = optional.get();
        p.setOwner(me);
        propertyRepository.save(p);
        return ResponseEntity.ok(p);
    }

    // Delete property
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProperty(@PathVariable Long id) {
        Optional<Property> optional = propertyRepository.findById(id);
        if (optional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Property property = optional.get();
        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isPresent()) {
            User current = currentUserOpt.get();
            boolean isAdmin = current.getRole() == User.Role.ADMIN;
            boolean isOwner = property.getOwner() != null && property.getOwner().getId().equals(current.getId());
            if (!isAdmin && !isOwner) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        propertyRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Get properties of current authenticated user (ADMIN gets all or own? We'll return own listings)
    @GetMapping("/my")
    public ResponseEntity<List<Property>> getMyProperties() {
        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User current = currentUserOpt.get();
        List<Property> mine = propertyRepository.findByOwner_Id(current.getId());
        return ResponseEntity.ok(mine);
    }

    // Search properties by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Property>> getPropertiesByStatus(@PathVariable Property.PropertyStatus status) {
        List<Property> properties = propertyRepository.findByStatus(status);
        return ResponseEntity.ok(properties);
    }

    // ===== Approval Workflow (ADMIN only) =====

    // ADMIN: List pending properties for review
    @GetMapping("/approval/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Property>> getPendingForApproval() {
        List<Property> list = propertyRepository.findByApprovalStatus(Property.ApprovalStatus.PENDING);
        return ResponseEntity.ok(list);
    }

    // ADMIN: List approved properties (admin view)
    @GetMapping("/approval/approved")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Property>> getApprovedAdmin() {
        List<Property> list = propertyRepository.findByApprovalStatus(Property.ApprovalStatus.APPROVED);
        return ResponseEntity.ok(list);
    }

    // ADMIN: List rejected properties (admin view)
    @GetMapping("/approval/rejected")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Property>> getRejectedAdmin() {
        List<Property> list = propertyRepository.findByApprovalStatus(Property.ApprovalStatus.REJECTED);
        return ResponseEntity.ok(list);
    }

    // ADMIN: Approve property
    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveProperty(@PathVariable Long id) {
        Optional<Property> optionalProperty = propertyRepository.findById(id);
        if (optionalProperty.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Property p = optionalProperty.get();
        p.setApprovalStatus(Property.ApprovalStatus.APPROVED);
        propertyRepository.save(p);
        return ResponseEntity.ok(p);
    }

    // ADMIN: Reject property
    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectProperty(@PathVariable Long id) {
        Optional<Property> optionalProperty = propertyRepository.findById(id);
        if (optionalProperty.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Property p = optionalProperty.get();
        p.setApprovalStatus(Property.ApprovalStatus.REJECTED);
        propertyRepository.save(p);
        return ResponseEntity.ok(p);
    }

    // Search properties by type
    @GetMapping("/type/{type}")
    public ResponseEntity<List<Property>> getPropertiesByType(@PathVariable Property.PropertyType type) {
        List<Property> properties = propertyRepository.findByPropertyType(type);
        return ResponseEntity.ok(properties);
    }

    // Search properties by city
    @GetMapping("/city/{city}")
    public ResponseEntity<List<Property>> getPropertiesByCity(@PathVariable String city) {
        List<Property> properties = propertyRepository.findByCityIgnoreCase(city);
        return ResponseEntity.ok(properties);
    }

    // Search properties by price range
    @GetMapping("/price-range")
    public ResponseEntity<List<Property>> getPropertiesByPriceRange(
            @RequestParam BigDecimal minPrice, 
            @RequestParam BigDecimal maxPrice) {
        List<Property> properties = propertyRepository.findByPriceRange(minPrice, maxPrice);
        return ResponseEntity.ok(properties);
    }

    // Search properties by keyword
    @GetMapping("/search")
    public ResponseEntity<List<Property>> searchProperties(@RequestParam String keyword) {
        List<Property> properties = propertyRepository.searchByKeyword(keyword);
        return ResponseEntity.ok(properties);
    }

    // Filter properties by minimum bedrooms
    @GetMapping("/bedrooms/{bedrooms}")
    public ResponseEntity<List<Property>> getPropertiesByMinBedrooms(@PathVariable Integer bedrooms) {
        List<Property> properties = propertyRepository.findByMinBedrooms(bedrooms);
        return ResponseEntity.ok(properties);
    }

    // Filter properties by minimum bathrooms
    @GetMapping("/bathrooms/{bathrooms}")
    public ResponseEntity<List<Property>> getPropertiesByMinBathrooms(@PathVariable Integer bathrooms) {
        List<Property> properties = propertyRepository.findByMinBathrooms(bathrooms);
        return ResponseEntity.ok(properties);
    }

    // Advanced search with multiple optional filters
    @GetMapping("/advanced-search")
    public ResponseEntity<List<Property>> advancedSearch(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) Property.PropertyType propertyType,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer minBedrooms,
            @RequestParam(required = false) Integer maxBedrooms,
            @RequestParam(required = false) Integer minBathrooms,
            @RequestParam(required = false) Integer maxBathrooms,
            @RequestParam(required = false) Property.PropertyStatus status
    ) {
        List<Property> properties = propertyRepository.findPropertiesWithFilters(
                emptyToNull(keyword),
                emptyToNull(city),
                emptyToNull(state),
                propertyType,
                minPrice,
                maxPrice,
                minBedrooms,
                maxBedrooms,
                minBathrooms,
                maxBathrooms,
                status
        );
        return ResponseEntity.ok(properties);
    }

    // Metadata for building filters (cities, states, price range)
    @GetMapping("/filters/meta")
    public ResponseEntity<?> getFilterMeta() {
        var cities = propertyRepository.findDistinctCities();
        var states = propertyRepository.findDistinctStates();
        var minPrice = propertyRepository.findMinPrice();
        var maxPrice = propertyRepository.findMaxPrice();
        return ResponseEntity.ok(java.util.Map.of(
                "cities", cities,
                "states", states,
                "minPrice", minPrice,
                "maxPrice", maxPrice
        ));
    }

    // Helper to treat empty strings as null for optional filters
    private String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    // Helper: get current authenticated user from security context
    private Optional<User> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return Optional.empty();
            }
            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.User userDetails) {
                String email = userDetails.getUsername();
                return userRepository.findByEmailAndEnabledTrue(email);
            }
            if (principal instanceof User u) {
                return Optional.of(u);
            }
            return Optional.empty();
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}

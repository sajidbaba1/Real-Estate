package com.realestate.controller;

import com.realestate.entity.Location;
import com.realestate.repository.LocationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class LocationController {

    @Autowired
    private LocationRepository locationRepository;

    // Get all locations (public access)
    @GetMapping
    public ResponseEntity<List<Location>> getAllLocations() {
        List<Location> locations = locationRepository.findAllOrderByName();
        return ResponseEntity.ok(locations);
    }

    // Get location by ID (public access)
    @GetMapping("/{id}")
    public ResponseEntity<Location> getLocationById(@PathVariable Long id) {
        Optional<Location> location = locationRepository.findById(id);
        return location.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.notFound().build());
    }

    // Search locations by keyword (public access)
    @GetMapping("/search")
    public ResponseEntity<List<Location>> searchLocations(@RequestParam String keyword) {
        List<Location> locations = locationRepository.searchByKeyword(keyword);
        return ResponseEntity.ok(locations);
    }

    // Create new location (Admin only)
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createLocation(@Valid @RequestBody Location location) {
        try {
            // Check if location with same name already exists
            if (locationRepository.existsByName(location.getName())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Location with name '" + location.getName() + "' already exists");
            }
            
            Location savedLocation = locationRepository.save(location);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedLocation);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error creating location: " + e.getMessage());
        }
    }

    // Update location (Admin only)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateLocation(@PathVariable Long id, @Valid @RequestBody Location locationDetails) {
        try {
            Optional<Location> optionalLocation = locationRepository.findById(id);
            if (!optionalLocation.isPresent()) {
                return ResponseEntity.notFound().build();
            }

            Location location = optionalLocation.get();
            
            // Check if another location with same name exists (excluding current one)
            Optional<Location> existingLocation = locationRepository.findByName(locationDetails.getName());
            if (existingLocation.isPresent() && !existingLocation.get().getId().equals(id)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Location with name '" + locationDetails.getName() + "' already exists");
            }

            location.setName(locationDetails.getName());
            location.setDescription(locationDetails.getDescription());
            
            Location updatedLocation = locationRepository.save(location);
            return ResponseEntity.ok(updatedLocation);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error updating location: " + e.getMessage());
        }
    }

    // Delete location (Admin only)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteLocation(@PathVariable Long id) {
        try {
            if (!locationRepository.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            
            locationRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error deleting location: " + e.getMessage());
        }
    }
}

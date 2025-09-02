package com.realestate.controller;

import com.realestate.entity.Property;
import com.realestate.repository.PropertyRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/properties")
@CrossOrigin(origins = "http://localhost:5173")
public class PropertyController {

    @Autowired
    private PropertyRepository propertyRepository;

    // Get all properties
    @GetMapping
    public ResponseEntity<List<Property>> getAllProperties() {
        List<Property> properties = propertyRepository.findAll();
        return ResponseEntity.ok(properties);
    }

    // Get property by ID
    @GetMapping("/{id}")
    public ResponseEntity<Property> getPropertyById(@PathVariable Long id) {
        Optional<Property> property = propertyRepository.findById(id);
        return property.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.notFound().build());
    }

    // Create new property
    @PostMapping
    public ResponseEntity<Property> createProperty(@Valid @RequestBody Property property) {
        Property savedProperty = propertyRepository.save(property);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedProperty);
    }

    // Update property
    @PutMapping("/{id}")
    public ResponseEntity<Property> updateProperty(@PathVariable Long id, @Valid @RequestBody Property propertyDetails) {
        Optional<Property> optionalProperty = propertyRepository.findById(id);
        
        if (optionalProperty.isPresent()) {
            Property property = optionalProperty.get();
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
            property.setImageUrl(propertyDetails.getImageUrl());
            
            Property updatedProperty = propertyRepository.save(property);
            return ResponseEntity.ok(updatedProperty);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Delete property
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProperty(@PathVariable Long id) {
        if (propertyRepository.existsById(id)) {
            propertyRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Search properties by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Property>> getPropertiesByStatus(@PathVariable Property.PropertyStatus status) {
        List<Property> properties = propertyRepository.findByStatus(status);
        return ResponseEntity.ok(properties);
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
}

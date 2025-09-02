package com.realestate.repository;

import com.realestate.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    
    List<Property> findByStatus(Property.PropertyStatus status);
    
    List<Property> findByPropertyType(Property.PropertyType propertyType);
    
    List<Property> findByCityIgnoreCase(String city);
    
    List<Property> findByStateIgnoreCase(String state);
    
    @Query("SELECT p FROM Property p WHERE p.price BETWEEN :minPrice AND :maxPrice")
    List<Property> findByPriceRange(@Param("minPrice") BigDecimal minPrice, @Param("maxPrice") BigDecimal maxPrice);
    
    @Query("SELECT p FROM Property p WHERE p.bedrooms >= :bedrooms")
    List<Property> findByMinBedrooms(@Param("bedrooms") Integer bedrooms);
    
    @Query("SELECT p FROM Property p WHERE p.bathrooms >= :bathrooms")
    List<Property> findByMinBathrooms(@Param("bathrooms") Integer bathrooms);
    
    @Query("SELECT p FROM Property p WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Property> searchByKeyword(@Param("keyword") String keyword);
}

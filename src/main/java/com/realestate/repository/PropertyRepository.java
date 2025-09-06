package com.realestate.repository;

import com.realestate.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    
    List<Property> findByStatus(Property.PropertyStatus status);
    
    List<Property> findByPropertyType(Property.PropertyType propertyType);
    
    List<Property> findByCityIgnoreCase(String city);
    
    List<Property> findByStateIgnoreCase(String state);
    
    List<Property> findByOwner_Id(Long ownerId);
    
    @Query("SELECT p FROM Property p WHERE p.price BETWEEN :minPrice AND :maxPrice")
    List<Property> findByPriceRange(@Param("minPrice") BigDecimal minPrice, @Param("maxPrice") BigDecimal maxPrice);
    
    @Query("SELECT p FROM Property p WHERE p.bedrooms >= :bedrooms")
    List<Property> findByMinBedrooms(@Param("bedrooms") Integer bedrooms);
    
    @Query("SELECT p FROM Property p WHERE p.bathrooms >= :bathrooms")
    List<Property> findByMinBathrooms(@Param("bathrooms") Integer bathrooms);
    
    @Query("SELECT p FROM Property p WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Property> searchByKeyword(@Param("keyword") String keyword);
    
    // Advanced search with multiple filters
    @Query("SELECT p FROM Property p WHERE " +
           "(:keyword IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:city IS NULL OR LOWER(p.city) = LOWER(:city)) AND " +
           "(:state IS NULL OR LOWER(p.state) = LOWER(:state)) AND " +
           "(:propertyType IS NULL OR p.propertyType = :propertyType) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:minBedrooms IS NULL OR p.bedrooms >= :minBedrooms) AND " +
           "(:maxBedrooms IS NULL OR p.bedrooms <= :maxBedrooms) AND " +
           "(:minBathrooms IS NULL OR p.bathrooms >= :minBathrooms) AND " +
           "(:maxBathrooms IS NULL OR p.bathrooms <= :maxBathrooms) AND " +
           "(:status IS NULL OR p.status = :status)")
    List<Property> findPropertiesWithFilters(
        @Param("keyword") String keyword,
        @Param("city") String city,
        @Param("state") String state,
        @Param("propertyType") Property.PropertyType propertyType,
        @Param("minPrice") BigDecimal minPrice,
        @Param("maxPrice") BigDecimal maxPrice,
        @Param("minBedrooms") Integer minBedrooms,
        @Param("maxBedrooms") Integer maxBedrooms,
        @Param("minBathrooms") Integer minBathrooms,
        @Param("maxBathrooms") Integer maxBathrooms,
        @Param("status") Property.PropertyStatus status
    );
    
    // Get distinct cities for filter dropdown
    @Query("SELECT DISTINCT p.city FROM Property p WHERE p.city IS NOT NULL ORDER BY p.city")
    List<String> findDistinctCities();
    
    // Get distinct states for filter dropdown
    @Query("SELECT DISTINCT p.state FROM Property p WHERE p.state IS NOT NULL ORDER BY p.state")
    List<String> findDistinctStates();
    
    // Get price range statistics
    @Query("SELECT MIN(p.price) FROM Property p WHERE p.price IS NOT NULL")
    BigDecimal findMinPrice();
    
    @Query("SELECT MAX(p.price) FROM Property p WHERE p.price IS NOT NULL")
    BigDecimal findMaxPrice();

    // Analytics methods
    long countByStatus(Property.PropertyStatus status);

    long countByPropertyType(Property.PropertyType propertyType);

    @Query("SELECT AVG(p.price) FROM Property p WHERE p.price IS NOT NULL")
    BigDecimal findAveragePrice();

    @Query("SELECT p.city, COUNT(p) FROM Property p WHERE p.city IS NOT NULL GROUP BY p.city ORDER BY COUNT(p) DESC")
    List<Object[]> countPropertiesByCity();

    @Query("SELECT MONTH(p.createdAt), YEAR(p.createdAt), COUNT(p) FROM Property p WHERE p.createdAt >= :since GROUP BY YEAR(p.createdAt), MONTH(p.createdAt) ORDER BY YEAR(p.createdAt), MONTH(p.createdAt)")
    List<Object[]> getPropertyCreationTrends(@Param("since") LocalDateTime since);
}

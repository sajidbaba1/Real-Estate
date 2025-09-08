package com.realestate.controller;

import com.realestate.entity.User;
import com.realestate.entity.Property;
import com.realestate.repository.UserRepository;
import com.realestate.repository.PropertyRepository;
import com.realestate.service.AnalyticsService;
import com.realestate.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private ReportService reportService;

    // Summary KPIs for Admin Analytics
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        return ResponseEntity.ok(analyticsService.getSummary());
    }

    // Simple time series over last N days
    @GetMapping("/timeseries")
    public ResponseEntity<Map<String, Object>> getTimeSeries(
            @RequestParam(defaultValue = "inquiries") String metric,
            @RequestParam(defaultValue = "30") int rangeDays) {
        return ResponseEntity.ok(analyticsService.getTimeSeries(metric, rangeDays));
    }

    // Recent activity feed (inquiries/messages/purchases)
    @GetMapping("/recent-activity")
    public ResponseEntity<List<?>> getRecentActivity(@RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(analyticsService.recentInquiries(limit));
    }

    // Export Analytics PDF
    @GetMapping(value = "/export/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportPdf() {
        Map<String, Object> summary = analyticsService.getSummary();
        byte[] pdf = reportService.buildAnalyticsPdf(summary);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=analytics-summary.pdf")
                .body(pdf);
    }

    // Agent performance leaderboard
    @GetMapping("/agent-performance")
    public ResponseEntity<List<Map<String, Object>>> getAgentPerformance() {
        return ResponseEntity.ok(analyticsService.getAgentPerformance());
    }

    // Funnel data for Sankey chart
    @GetMapping("/funnel")
    public ResponseEntity<Map<String, Object>> getFunnelData() {
        return ResponseEntity.ok(analyticsService.getFunnelData());
    }

    // Get dashboard statistics
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // User statistics
        long totalUsers = userRepository.count();
        long adminCount = userRepository.countByRole(User.Role.ADMIN);
        long agentCount = userRepository.countByRole(User.Role.AGENT);
        long clientCount = userRepository.countByRole(User.Role.USER);
        
        // Property statistics
        long totalProperties = propertyRepository.count();
        long forSaleCount = propertyRepository.countByStatus(Property.PropertyStatus.FOR_SALE);
        long forRentCount = propertyRepository.countByStatus(Property.PropertyStatus.FOR_RENT);
        long soldCount = propertyRepository.countByStatus(Property.PropertyStatus.SOLD);
        long rentedCount = propertyRepository.countByStatus(Property.PropertyStatus.RENTED);
        
        // Price statistics
        BigDecimal avgPrice = propertyRepository.findAveragePrice();
        BigDecimal minPrice = propertyRepository.findMinPrice();
        BigDecimal maxPrice = propertyRepository.findMaxPrice();
        
        Map<String, Object> usersMap = new HashMap<>();
        usersMap.put("total", totalUsers);
        usersMap.put("admins", adminCount);
        usersMap.put("agents", agentCount);
        usersMap.put("clients", clientCount);
        stats.put("users", usersMap);

        Map<String, Object> propsMap = new HashMap<>();
        propsMap.put("total", totalProperties);
        propsMap.put("forSale", forSaleCount);
        propsMap.put("forRent", forRentCount);
        propsMap.put("sold", soldCount);
        propsMap.put("rented", rentedCount);
        stats.put("properties", propsMap);

        Map<String, Object> pricingMap = new HashMap<>();
        pricingMap.put("average", avgPrice != null ? avgPrice : BigDecimal.ZERO);
        pricingMap.put("minimum", minPrice != null ? minPrice : BigDecimal.ZERO);
        pricingMap.put("maximum", maxPrice != null ? maxPrice : BigDecimal.ZERO);
        stats.put("pricing", pricingMap);
        
        return ResponseEntity.ok(stats);
    }

    // Get property type distribution
    @GetMapping("/property-types")
    public ResponseEntity<Map<String, Long>> getPropertyTypeDistribution() {
        Map<String, Long> distribution = new HashMap<>();
        
        for (Property.PropertyType type : Property.PropertyType.values()) {
            long count = propertyRepository.countByPropertyType(type);
            distribution.put(type.name(), count);
        }
        
        return ResponseEntity.ok(distribution);
    }

    // Get properties by city
    @GetMapping("/properties-by-city")
    public ResponseEntity<Map<String, Long>> getPropertiesByCity() {
        List<Object[]> results = propertyRepository.countPropertiesByCity();
        Map<String, Long> cityStats = new HashMap<>();
        
        for (Object[] result : results) {
            String city = (String) result[0];
            Long count = (Long) result[1];
            cityStats.put(city, count);
        }
        
        return ResponseEntity.ok(cityStats);
    }

    // Get user registration trends (last 12 months)
    @GetMapping("/user-trends")
    public ResponseEntity<List<Map<String, Object>>> getUserRegistrationTrends() {
        LocalDateTime oneYearAgo = LocalDateTime.now().minusYears(1);
        List<Object[]> results = userRepository.getUserRegistrationTrends(oneYearAgo);
        
        List<Map<String, Object>> trends = new java.util.ArrayList<>();
        for (Object[] result : results) {
            Map<String, Object> row = new HashMap<>();
            row.put("month", result[0]);
            row.put("year", result[1]);
            row.put("count", result[2]);
            trends.add(row);
        }
        return ResponseEntity.ok(trends);
    }

    // Get property creation trends (last 12 months)
    @GetMapping("/property-trends")
    public ResponseEntity<List<Map<String, Object>>> getPropertyCreationTrends() {
        LocalDateTime oneYearAgo = LocalDateTime.now().minusYears(1);
        List<Object[]> results = propertyRepository.getPropertyCreationTrends(oneYearAgo);
        
        List<Map<String, Object>> trends = new java.util.ArrayList<>();
        for (Object[] result : results) {
            Map<String, Object> row = new HashMap<>();
            row.put("month", result[0]);
            row.put("year", result[1]);
            row.put("count", result[2]);
            trends.add(row);
        }
        return ResponseEntity.ok(trends);
    }
}

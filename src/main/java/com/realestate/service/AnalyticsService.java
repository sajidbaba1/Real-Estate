package com.realestate.service;

import com.realestate.entity.PropertyInquiry;
import com.realestate.entity.User;
import com.realestate.repository.PropertyInquiryRepository;
import com.realestate.repository.PropertyRepository;
import com.realestate.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    @Autowired private PropertyRepository propertyRepository;
    @Autowired private PropertyInquiryRepository inquiryRepository;
    @Autowired private UserRepository userRepository;

    public Map<String, Object> getSummary() {
        Map<String, Object> summary = new HashMap<>();
        long totalProperties = propertyRepository.count();
        long totalInquiries = inquiryRepository.count();

        long active = inquiryRepository.findAll().stream()
                .filter(i -> i.getStatus() == PropertyInquiry.InquiryStatus.ACTIVE)
                .count();
        long negotiating = inquiryRepository.findAll().stream()
                .filter(i -> i.getStatus() == PropertyInquiry.InquiryStatus.NEGOTIATING)
                .count();
        long agreed = inquiryRepository.findAll().stream()
                .filter(i -> i.getStatus() == PropertyInquiry.InquiryStatus.AGREED)
                .count();
        long purchased = inquiryRepository.findAll().stream()
                .filter(i -> i.getStatus() == PropertyInquiry.InquiryStatus.PURCHASED)
                .count();

        // Simple revenue approximation: sum of agreed price for PURCHASED inquiries
        BigDecimal revenue = inquiryRepository.findAll().stream()
                .filter(i -> i.getStatus() == PropertyInquiry.InquiryStatus.PURCHASED)
                .map(i -> i.getAgreedPrice() != null ? i.getAgreedPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        summary.put("totalProperties", totalProperties);
        summary.put("totalInquiries", totalInquiries);
        summary.put("active", active);
        summary.put("negotiating", negotiating);
        summary.put("agreed", agreed);
        summary.put("purchased", purchased);
        summary.put("revenue", revenue);
        return summary;
    }

    public Map<String, Object> getTimeSeries(String metric, int days) {
        // Minimal stub: count per day over last N days
        Map<String, Object> result = new HashMap<>();
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        Map<String, Number> series = new HashMap<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            long count = inquiryRepository.findAll().stream()
                    .filter(inq -> inq.getCreatedAt() != null && inq.getCreatedAt().toLocalDate().isEqual(day))
                    .count();
            series.put(day.toString(), count);
        }
        result.put("metric", metric);
        result.put("series", series);
        return result;
    }

    public List<PropertyInquiry> recentInquiries(int limit) {
        // Minimal stub: use repository method if present; else take latest by updatedAt
        return inquiryRepository.findAll().stream()
                .sorted((a, b) -> {
                    LocalDateTime la = a.getUpdatedAt();
                    LocalDateTime lb = b.getUpdatedAt();
                    if (la == null && lb == null) return 0;
                    if (la == null) return 1;
                    if (lb == null) return -1;
                    return lb.compareTo(la);
                })
                .limit(limit)
                .toList();
    }

    public List<Map<String, Object>> getAgentPerformance() {
        // Get all agents/owners and their performance metrics
        List<User> agents = userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.Role.AGENT || u.getRole() == User.Role.ADMIN)
                .collect(Collectors.toList());
        
        List<Map<String, Object>> performance = new ArrayList<>();
        for (User agent : agents) {
            List<PropertyInquiry> agentInquiries = inquiryRepository.findAll().stream()
                    .filter(inq -> inq.getOwner() != null && inq.getOwner().getId().equals(agent.getId()))
                    .collect(Collectors.toList());
            
            long totalInquiries = agentInquiries.size();
            long purchased = agentInquiries.stream()
                    .filter(inq -> inq.getStatus() == PropertyInquiry.InquiryStatus.PURCHASED)
                    .count();
            long agreed = agentInquiries.stream()
                    .filter(inq -> inq.getStatus() == PropertyInquiry.InquiryStatus.AGREED)
                    .count();
            
            BigDecimal revenue = agentInquiries.stream()
                    .filter(inq -> inq.getStatus() == PropertyInquiry.InquiryStatus.PURCHASED)
                    .map(inq -> inq.getAgreedPrice() != null ? inq.getAgreedPrice() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            Map<String, Object> agentData = new HashMap<>();
            agentData.put("agentId", agent.getId());
            agentData.put("agentName", agent.getFirstName() + " " + agent.getLastName());
            agentData.put("totalInquiries", totalInquiries);
            agentData.put("purchased", purchased);
            agentData.put("agreed", agreed);
            agentData.put("revenue", revenue);
            agentData.put("conversionRate", totalInquiries > 0 ? (double) purchased / totalInquiries : 0.0);
            
            performance.add(agentData);
        }
        
        // Sort by revenue descending
        performance.sort((a, b) -> {
            BigDecimal revA = (BigDecimal) a.get("revenue");
            BigDecimal revB = (BigDecimal) b.get("revenue");
            return revB.compareTo(revA);
        });
        
        return performance;
    }

    public Map<String, Object> getFunnelData() {
        List<PropertyInquiry> allInquiries = inquiryRepository.findAll();
        
        long active = allInquiries.stream()
                .filter(i -> i.getStatus() == PropertyInquiry.InquiryStatus.ACTIVE)
                .count();
        long negotiating = allInquiries.stream()
                .filter(i -> i.getStatus() == PropertyInquiry.InquiryStatus.NEGOTIATING)
                .count();
        long agreed = allInquiries.stream()
                .filter(i -> i.getStatus() == PropertyInquiry.InquiryStatus.AGREED)
                .count();
        long purchased = allInquiries.stream()
                .filter(i -> i.getStatus() == PropertyInquiry.InquiryStatus.PURCHASED)
                .count();
        
        Map<String, Object> funnel = new HashMap<>();
        funnel.put("active", active);
        funnel.put("negotiating", negotiating);
        funnel.put("agreed", agreed);
        funnel.put("purchased", purchased);
        
        return funnel;
    }
}

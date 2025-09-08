package com.realestate.controller;

import com.realestate.entity.Property;
import com.realestate.entity.PropertyInquiry;
import com.realestate.entity.ChatMessage;
import com.realestate.repository.PropertyInquiryRepository;
import com.realestate.repository.PropertyRepository;
import com.realestate.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics/export")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsExportController {

    @Autowired private PropertyRepository propertyRepository;
    @Autowired private PropertyInquiryRepository inquiryRepository;
    @Autowired private ChatMessageRepository chatMessageRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    // Simple JSON facts for RAG ingestion
    @GetMapping("/business-data")
    public ResponseEntity<Map<String, Object>> exportBusinessData() {
        Map<String, Object> payload = new HashMap<>();
        List<Map<String, Object>> properties = new ArrayList<>();
        for (Property p : propertyRepository.findAll()) {
            Map<String, Object> m = new HashMap<>();
            m.put("type", "property");
            m.put("id", p.getId());
            m.put("title", p.getTitle());
            m.put("city", p.getCity());
            m.put("state", p.getState());
            m.put("price", p.getPrice());
            m.put("status", p.getStatus() != null ? p.getStatus().name() : null);
            properties.add(m);
        }
        payload.put("properties", properties);

        List<Map<String, Object>> inquiries = new ArrayList<>();
        for (PropertyInquiry inq : inquiryRepository.findAll()) {
            Map<String, Object> m = new HashMap<>();
            m.put("type", "inquiry");
            m.put("id", inq.getId());
            m.put("propertyId", inq.getProperty() != null ? inq.getProperty().getId() : null);
            m.put("clientId", inq.getClient() != null ? inq.getClient().getId() : null);
            m.put("ownerId", inq.getOwner() != null ? inq.getOwner().getId() : null);
            m.put("status", inq.getStatus() != null ? inq.getStatus().name() : null);
            m.put("offeredPrice", inq.getOfferedPrice());
            m.put("agreedPrice", inq.getAgreedPrice());
            m.put("createdAt", inq.getCreatedAt() != null ? ISO.format(inq.getCreatedAt()) : null);
            m.put("updatedAt", inq.getUpdatedAt() != null ? ISO.format(inq.getUpdatedAt()) : null);
            inquiries.add(m);
        }
        payload.put("inquiries", inquiries);

        List<Map<String, Object>> messages = new ArrayList<>();
        for (ChatMessage msg : chatMessageRepository.findAll()) {
            Map<String, Object> m = new HashMap<>();
            m.put("type", "message");
            m.put("id", msg.getId());
            m.put("inquiryId", msg.getInquiry() != null ? msg.getInquiry().getId() : null);
            m.put("senderId", msg.getSender() != null ? msg.getSender().getId() : null);
            m.put("messageType", msg.getMessageType() != null ? msg.getMessageType().name() : null);
            m.put("content", msg.getContent());
            m.put("priceAmount", msg.getPriceAmount());
            m.put("sentAt", msg.getSentAt() != null ? ISO.format(msg.getSentAt()) : null);
            messages.add(m);
        }
        payload.put("messages", messages);

        return ResponseEntity.ok(payload);
    }
}

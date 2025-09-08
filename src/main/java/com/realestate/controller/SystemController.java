package com.realestate.controller;

import com.realestate.service.MailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/system")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5175", "https://real-estate-alpha-sandy.vercel.app"})
public class SystemController {

    @Autowired
    private MailService mailService;

    public static class TestEmailRequest {
        public String to;
        public String subject;
        public String text;
    }

    @PostMapping("/test-email")
    @PreAuthorize("hasAnyRole('USER','ADMIN','AGENT')")
    public ResponseEntity<?> sendTestEmail(@RequestBody TestEmailRequest req) {
        if (req == null || req.to == null || req.to.isBlank()) {
            return ResponseEntity.badRequest().body("'to' is required");
        }
        String subject = (req.subject == null || req.subject.isBlank()) ? "Test Email" : req.subject;
        String text = (req.text == null || req.text.isBlank()) ? "Hello from RealEstate Hub" : req.text;
        mailService.sendSimple(req.to, subject, text);
        return ResponseEntity.ok(Map.of("status", "sent"));
    }
}

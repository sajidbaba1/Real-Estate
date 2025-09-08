package com.realestate.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.realestate.service.RagService;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/rag")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175", "https://real-estate-alpha-sandy.vercel.app"})
@PreAuthorize("hasRole('ADMIN')")
public class RagController {

    @Autowired private RagService ragService;
    @Autowired private ObjectMapper objectMapper;

    @Value("${rag.backend.base:http://localhost:8888}")
    private String backendBase;

    private final OkHttpClient http = new OkHttpClient();

    @PostMapping("/ingest")
    public ResponseEntity<?> ingestNow() throws IOException {
        Map<String, Object> facts = fetchBusinessFacts();
        return ResponseEntity.ok(ragService.ingestBusinessFacts(facts));
    }

    @PostMapping("/query")
    public ResponseEntity<?> query(@RequestBody Map<String, Object> body) throws IOException {
        String question = body != null ? String.valueOf(body.getOrDefault("question", "")) : "";
        return ResponseEntity.ok(ragService.query(question));
    }

    private Map<String, Object> fetchBusinessFacts() throws IOException {
        String url = backendBase.replaceAll("/+$", "") + "/api/analytics/export/business-data";
        Request req = new Request.Builder().url(url).get().build();
        try (Response resp = http.newCall(req).execute()) {
            if (!resp.isSuccessful()) throw new IOException("Failed to fetch business-data: " + resp.code());
            return objectMapper.readValue(resp.body().byteStream(), Map.class);
        }
    }

    // Bootstrap component to ingest on startup
    @Component
    public static class RagBootstrap {
        @Autowired private RagService ragService;
        @Autowired private RagController controller;

        @EventListener(ApplicationReadyEvent.class)
        public void onReady() {
            try {
                Map<String, Object> facts = controller.fetchBusinessFacts();
                ragService.ingestBusinessFacts(facts);
                System.out.println("[RAG] Initial ingestion completed.");
            } catch (Exception e) {
                System.err.println("[RAG] Initial ingestion failed: " + e.getMessage());
            }
        }
    }
}

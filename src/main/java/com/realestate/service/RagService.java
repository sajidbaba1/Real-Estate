package com.realestate.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;

@Service
public class RagService {

    private final ObjectMapper mapper = new ObjectMapper();
    private final OkHttpClient http = new OkHttpClient();

    @Value("${rag.pinecone.apiKey:${PINECONE_API_KEY:}}")
    private String pineconeApiKey;
    @Value("${rag.pinecone.host:${PINECONE_HOST:}}")
    private String pineconeHost; // e.g. https://reals-xxxx.svc....pinecone.io
    @Value("${rag.pinecone.index:${PINECONE_INDEX:reals}}")
    private String pineconeIndex;

    @Value("${rag.gemini.apiKey:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

    public Map<String, Object> ingestBusinessFacts(Map<String, Object> facts) throws IOException {
        List<String> texts = toBusinessTexts(facts);
        if (texts.isEmpty()) {
            return Map.of("upserts", 0);
        }
        List<List<Double>> vectors = embedTexts(texts);
        upsertPinecone(texts, vectors);
        return Map.of("upserts", texts.size());
    }

    public Map<String, Object> query(String question) throws IOException {
        List<Double> qVec = embedTexts(Collections.singletonList(question)).get(0);
        List<Map<String, Object>> matches = queryPinecone(qVec, 8);
        String context = matches.stream()
                .map(m -> Objects.toString(((Map<?,?>)m.get("metadata")).get("text"), ""))
                .reduce("", (a, b) -> a + (a.isEmpty()?"":"\n") + b);
        String prompt = "You are a polite and precise business analytics assistant for a real estate platform.\n\n" +
                "Context (facts, logs):\n" + context + "\n\n" +
                "User question: " + question + "\n\n" +
                "Answer succinctly with numbers and dates when available. If uncertain, say so and suggest what data would help.";
        String answer = generateAnswer(prompt);
        Map<String, Object> resp = new HashMap<>();
        resp.put("answer", answer);
        resp.put("matches", matches);
        return resp;
    }

    // --- Helpers ---

    private List<String> toBusinessTexts(Map<String, Object> payload) {
        List<String> out = new ArrayList<>();
        var properties = (List<?>) payload.getOrDefault("properties", List.of());
        for (Object o : properties) {
            Map<?,?> p = (Map<?,?>) o;
            out.add(String.format(Locale.ROOT,
                    "PROPERTY | id=%s | title=%s | city=%s | state=%s | price=%s | status=%s",
                    p.get("id"), p.get("title"), p.get("city"), p.get("state"), p.get("price"), p.get("status")));
        }
        var inquiries = (List<?>) payload.getOrDefault("inquiries", List.of());
        for (Object o : inquiries) {
            Map<?,?> q = (Map<?,?>) o;
            out.add(String.format(Locale.ROOT,
                    "INQUIRY | id=%s | propertyId=%s | clientId=%s | ownerId=%s | status=%s | offered=%s | agreed=%s | createdAt=%s | updatedAt=%s",
                    q.get("id"), q.get("propertyId"), q.get("clientId"), q.get("ownerId"), q.get("status"), q.get("offeredPrice"), q.get("agreedPrice"), q.get("createdAt"), q.get("updatedAt")));
        }
        var messages = (List<?>) payload.getOrDefault("messages", List.of());
        for (Object o : messages) {
            Map<?,?> m = (Map<?,?>) o;
            String content = Objects.toString(m.get("content"), "");
            if (content.length() > 400) content = content.substring(0, 400);
            out.add(String.format(Locale.ROOT,
                    "MESSAGE | id=%s | inquiryId=%s | senderId=%s | type=%s | amount=%s | sentAt=%s | content=%s",
                    m.get("id"), m.get("inquiryId"), m.get("senderId"), m.get("messageType"), m.get("priceAmount"), m.get("sentAt"), content));
        }
        return out;
    }

    private List<List<Double>> embedTexts(List<String> texts) throws IOException {
        // Gemini text-embedding-004 REST API
        String url = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=" + geminiApiKey;
        List<List<Double>> vectors = new ArrayList<>();
        // Batch in small chunks
        int batchSize = 64;
        for (int i = 0; i < texts.size(); i += batchSize) {
            List<String> batch = texts.subList(i, Math.min(texts.size(), i + batchSize));
            Map<String, Object> body = new HashMap<>();
            // Use content array with parts per Google API
            Map<String, Object> content = Map.of("parts", List.of(Map.of("text", String.join("\n---\n", batch))));
            body.put("content", content);
            Request req = new Request.Builder()
                    .url(url)
                    .post(RequestBody.create(JSON, mapper.writeValueAsBytes(body)))
                    .build();
            try (Response resp = http.newCall(req).execute()) {
                if (!resp.isSuccessful()) throw new IOException("Embed failed: " + resp.code());
                JsonNode root = mapper.readTree(resp.body().byteStream());
                // Depending on response shape; handle both single and batch
                if (root.has("embedding")) {
                    var arr = root.get("embedding").get("values");
                    List<Double> vec = new ArrayList<>();
                    arr.forEach(n -> vec.add(n.asDouble()));
                    vectors.add(vec);
                } else if (root.has("embeddings")) {
                    for (JsonNode emb : root.get("embeddings")) {
                        var arr = emb.get("values");
                        List<Double> vec = new ArrayList<>();
                        arr.forEach(n -> vec.add(n.asDouble()));
                        vectors.add(vec);
                    }
                }
            }
        }
        return vectors;
    }

    private void upsertPinecone(List<String> texts, List<List<Double>> vectors) throws IOException {
        if (pineconeHost == null || pineconeHost.isBlank()) throw new IOException("Missing Pinecone host");
        String url = pineconeHost.replaceAll("/+$", "") + "/vectors/upsert";
        List<Map<String, Object>> vecs = new ArrayList<>();
        for (int i = 0; i < texts.size(); i++) {
            Map<String, Object> v = new HashMap<>();
            v.put("id", "biz-" + i);
            v.put("values", vectors.get(i));
            v.put("metadata", Map.of("text", texts.get(i)));
            vecs.add(v);
        }
        Map<String, Object> body = Map.of("vectors", vecs);
        Request req = new Request.Builder()
                .url(url)
                .addHeader("Api-Key", pineconeApiKey)
                .post(RequestBody.create(JSON, mapper.writeValueAsBytes(body)))
                .build();
        try (Response resp = http.newCall(req).execute()) {
            if (!resp.isSuccessful()) throw new IOException("Pinecone upsert failed: " + resp.code());
        }
    }

    private List<Map<String, Object>> queryPinecone(List<Double> vector, int topK) throws IOException {
        String url = pineconeHost.replaceAll("/+$", "") + "/query";
        Map<String, Object> body = new HashMap<>();
        body.put("vector", vector);
        body.put("topK", topK);
        body.put("includeMetadata", true);
        Request req = new Request.Builder()
                .url(url)
                .addHeader("Api-Key", pineconeApiKey)
                .post(RequestBody.create(JSON, mapper.writeValueAsBytes(body)))
                .build();
        try (Response resp = http.newCall(req).execute()) {
            if (!resp.isSuccessful()) throw new IOException("Pinecone query failed: " + resp.code());
            JsonNode root = mapper.readTree(resp.body().byteStream());
            List<Map<String, Object>> matches = new ArrayList<>();
            if (root.has("matches")) {
                for (JsonNode m : root.get("matches")) {
                    matches.add(mapper.convertValue(m, Map.class));
                }
            }
            return matches;
        }
    }

    private String generateAnswer(String prompt) throws IOException {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=" + geminiApiKey;
        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
        Request req = new Request.Builder()
                .url(url)
                .post(RequestBody.create(JSON, mapper.writeValueAsBytes(body)))
                .build();
        try (Response resp = http.newCall(req).execute()) {
            if (!resp.isSuccessful()) throw new IOException("Gemini generate failed: " + resp.code());
            JsonNode root = mapper.readTree(resp.body().byteStream());
            try {
                return root.get("candidates").get(0).get("content").get("parts").get(0).get("text").asText();
            } catch (Exception ex) {
                return "No answer.";
            }
        }
    }
}

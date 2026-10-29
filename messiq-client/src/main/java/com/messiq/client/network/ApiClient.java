package com.messiq.client.network;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Duration;
import java.util.*;

public class ApiClient {

    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ApiClient(String baseUrl) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .registerModule(new JavaTimeModule());
    }

    public Map<String, Object> login(String usernameOrEmail, String password) throws IOException, InterruptedException {
        Map<String, String> body = new HashMap<>();
        body.put("usernameOrEmail", usernameOrEmail);
        body.put("password", password);

        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), new TypeReference<Map<String, Object>>() {});
    }

    public Map<String, Object> register(String username, String email, String password, String displayName) throws IOException, InterruptedException {
        Map<String, String> body = new HashMap<>();
        body.put("username", username);
        body.put("email", email);
        body.put("password", password);
        body.put("displayName", displayName);

        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/auth/register"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), new TypeReference<Map<String, Object>>() {});
    }

    public List<Map<String, Object>> getAllUsers(Long currentUserId) throws IOException, InterruptedException {
        String url = baseUrl + "/api/users" + (currentUserId != null ? "?currentUserId=" + currentUserId : "");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        Map<String, Object> res = objectMapper.readValue(response.body(), new TypeReference<Map<String, Object>>() {});
        if (Boolean.TRUE.equals(res.get("success"))) {
            return (List<Map<String, Object>>) res.get("data");
        }
        return Collections.emptyList();
    }

    public List<Map<String, Object>> searchUsers(String query, Long currentUserId) throws IOException, InterruptedException {
        String url = baseUrl + "/api/users/search?query=" + java.net.URLEncoder.encode(query, StandardCharsets.UTF_8)
                + (currentUserId != null ? "&currentUserId=" + currentUserId : "");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        Map<String, Object> res = objectMapper.readValue(response.body(), new TypeReference<Map<String, Object>>() {});
        if (Boolean.TRUE.equals(res.get("success"))) {
            return (List<Map<String, Object>>) res.get("data");
        }
        return Collections.emptyList();
    }

    public List<Map<String, Object>> getConversationHistory(Long user1, Long user2) throws IOException, InterruptedException {
        String url = baseUrl + "/api/messages/history?user1=" + user1 + "&user2=" + user2;
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        Map<String, Object> res = objectMapper.readValue(response.body(), new TypeReference<Map<String, Object>>() {});
        if (Boolean.TRUE.equals(res.get("success"))) {
            return (List<Map<String, Object>>) res.get("data");
        }
        return Collections.emptyList();
    }

    public Map<String, Object> uploadMedia(File file) throws IOException, InterruptedException {
        String boundary = "---" + System.currentTimeMillis() + "---";
        byte[] fileBytes = Files.readAllBytes(file.toPath());
        String mimeType = Files.probeContentType(file.toPath());
        if (mimeType == null) mimeType = "application/octet-stream";

        StringBuilder sb = new StringBuilder();
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"file\"; filename=\"").append(file.getName()).append("\"\r\n");
        sb.append("Content-Type: ").append(mimeType).append("\r\n\r\n");

        byte[] headerBytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        byte[] footerBytes = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8);

        byte[] payload = new byte[headerBytes.length + fileBytes.length + footerBytes.length];
        System.arraycopy(headerBytes, 0, payload, 0, headerBytes.length);
        System.arraycopy(fileBytes, 0, payload, headerBytes.length, fileBytes.length);
        System.arraycopy(footerBytes, 0, payload, headerBytes.length + fileBytes.length, footerBytes.length);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/media/upload"))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(payload))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        Map<String, Object> res = objectMapper.readValue(response.body(), new TypeReference<Map<String, Object>>() {});
        if (Boolean.TRUE.equals(res.get("success"))) {
            return (Map<String, Object>) res.get("data");
        }
        throw new IOException("Media upload failed: " + res.get("message"));
    }

    public void markAsRead(Long receiverId, Long senderId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/messages/read?receiverId=" + receiverId + "&senderId=" + senderId))
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();
            httpClient.sendAsync(request, HttpResponse.BodyHandlers.discarding());
        } catch (Exception e) {
            // ignore
        }
    }

    public ObjectMapper getObjectMapper() {
        return objectMapper;
    }
}

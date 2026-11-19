package com.messiq.server.controller;

import com.messiq.server.dto.ApiResponse;
import com.messiq.server.service.FileStorageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final FileStorageService fileStorageService;

    public MediaController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadFile(@RequestParam("file") MultipartFile file) {
        String fileName = fileStorageService.storeFile(file);

        String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/media/")
                .path(fileName)
                .toUriString();

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("fileName", fileName);
        responseData.put("originalFileName", file.getOriginalFilename());
        responseData.put("fileDownloadUri", fileDownloadUri);
        responseData.put("fileType", file.getContentType());
        responseData.put("size", file.getSize());

        return ResponseEntity.ok(ApiResponse.success("File uploaded successfully", responseData));
    }

    @GetMapping("/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable("fileName") String fileName, HttpServletRequest request) {
        Resource resource = fileStorageService.loadFileAsResource(fileName);

        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (IOException ex) {
            // Default content type if type could not be determined
        }

        if (contentType == null) {
            String lower = fileName.toLowerCase();
            if (lower.endsWith(".webm")) {
                contentType = "audio/webm";
            } else if (lower.endsWith(".wav")) {
                contentType = "audio/wav";
            } else if (lower.endsWith(".ogg")) {
                contentType = "audio/ogg";
            } else if (lower.endsWith(".mp3")) {
                contentType = "audio/mpeg";
            } else if (lower.endsWith(".m4a")) {
                contentType = "audio/mp4";
            } else {
                contentType = "application/octet-stream";
            }
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}

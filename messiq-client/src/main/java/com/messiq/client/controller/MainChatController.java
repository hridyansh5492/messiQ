package com.messiq.client.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.messiq.client.network.ApiClient;
import com.messiq.client.network.SessionManager;
import com.messiq.client.network.StompWebSocketClient;
import javafx.application.Platform;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.*;
import javafx.scene.shape.Circle;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class MainChatController {

    @FXML private Label currentUserNameLabel;
    @FXML private Label currentUserHandleLabel;
    @FXML private Circle currentUserStatusCircle;

    @FXML private TextField searchField;
    @FXML private VBox userListContainer;
    @FXML private Label wsStatusLabel;
    @FXML private Circle wsStatusCircle;

    // Chat Area
    @FXML private VBox emptyStateBox;
    @FXML private VBox activeChatBox;
    @FXML private Label activePeerNameLabel;
    @FXML private Label activePeerStatusLabel;
    @FXML private Circle activePeerStatusCircle;

    @FXML private ScrollPane messageScrollPane;
    @FXML private VBox messageContainer;
    @FXML private TextField messageInputField;
    @FXML private Button sendBtn;
    @FXML private Button attachBtn;
    @FXML private HBox attachmentPreviewBar;
    @FXML private Label attachedFileNameLabel;

    private final ApiClient apiClient = SessionManager.getInstance().getApiClient();
    private final StompWebSocketClient stompClient = SessionManager.getInstance().getStompClient();
    private final ObjectMapper objectMapper = apiClient.getObjectMapper();

    private List<Map<String, Object>> allUsers = new ArrayList<>();
    private Map<String, Object> activePeer = null;
    private File pendingMediaFile = null;
    private String uploadedMediaUrl = null;

    @FXML
    public void initialize() {
        Map<String, Object> currentUser = SessionManager.getInstance().getCurrentUser();
        if (currentUser != null) {
            currentUserNameLabel.setText((String) currentUser.getOrDefault("displayName", currentUser.get("username")));
            currentUserHandleLabel.setText("@" + currentUser.get("username"));
            currentUserStatusCircle.setStyle("-fx-fill: #10b981;");
        }

        emptyStateBox.setVisible(true);
        emptyStateBox.setManaged(true);
        activeChatBox.setVisible(false);
        activeChatBox.setManaged(false);
        attachmentPreviewBar.setVisible(false);
        attachmentPreviewBar.setManaged(false);

        initWebSocketConnection();
        loadUsersList("");

        // Auto-scroll to bottom when messages are added
        messageContainer.heightProperty().addListener((obs, oldVal, newVal) -> {
            messageScrollPane.setVvalue(1.0);
        });

        // Search listener
        searchField.textProperty().addListener((obs, oldVal, newVal) -> {
            loadUsersList(newVal);
        });
    }

    private void initWebSocketConnection() {
        stompClient.setConnectionStateListener(connected -> {
            if (connected) {
                wsStatusLabel.setText("Connected (Real-time)");
                wsStatusCircle.setStyle("-fx-fill: #10b981;");
            } else {
                wsStatusLabel.setText("Disconnected");
                wsStatusCircle.setStyle("-fx-fill: #ef4444;");
            }
        });

        Long userId = SessionManager.getInstance().getCurrentUserId();
        String username = SessionManager.getInstance().getCurrentUsername();
        stompClient.connect(username, userId);

        // Algorithm 5: Subscribe to presence updates
        stompClient.subscribe("/topic/status", this::handlePresenceUpdate);

        // Direct messages queue
        stompClient.subscribe("/user/queue/messages", this::handleIncomingMessageJson);

        // Broadcast current user is online
        try {
            Map<String, Object> statusPayload = new HashMap<>();
            statusPayload.put("userId", userId);
            statusPayload.put("username", username);
            statusPayload.put("status", "ONLINE");
            stompClient.send("/app/user.status", objectMapper.writeValueAsString(statusPayload));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handlePresenceUpdate(String json) {
        try {
            Map<String, Object> update = objectMapper.readValue(json, Map.class);
            Long userId = Long.parseLong(update.get("userId").toString());
            String status = (String) update.get("status");

            if (activePeer != null && userId.equals(Long.parseLong(activePeer.get("id").toString()))) {
                activePeer.put("status", status);
                updateActiveHeaderStatus();
            }

            for (Map<String, Object> u : allUsers) {
                if (userId.equals(Long.parseLong(u.get("id").toString()))) {
                    u.put("status", status);
                    break;
                }
            }
            renderUserItems(allUsers);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleIncomingMessageJson(String json) {
        try {
            Map<String, Object> msg = objectMapper.readValue(json, Map.class);
            Long senderId = Long.parseLong(msg.get("senderId").toString());
            Long receiverId = Long.parseLong(msg.get("receiverId").toString());

            if (activePeer != null) {
                Long activeId = Long.parseLong(activePeer.get("id").toString());
                if (senderId.equals(activeId) || receiverId.equals(activeId)) {
                    appendMessageBubble(msg);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void loadUsersList(String query) {
        new Thread(() -> {
            try {
                Long myId = SessionManager.getInstance().getCurrentUserId();
                List<Map<String, Object>> users;
                if (query == null || query.trim().isEmpty()) {
                    users = apiClient.getAllUsers(myId);
                } else {
                    users = apiClient.searchUsers(query.trim(), myId);
                }
                Platform.runLater(() -> {
                    allUsers = users;
                    renderUserItems(users);
                });
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void renderUserItems(List<Map<String, Object>> users) {
        userListContainer.getChildren().clear();

        for (Map<String, Object> u : users) {
            HBox card = new HBox(12);
            card.setAlignment(Pos.CENTER_LEFT);
            card.getStyleClass().add("user-card");
            card.setPadding(new Insets(10, 14, 10, 14));

            Circle statusDot = new Circle(5);
            String status = (String) u.getOrDefault("status", "OFFLINE");
            if ("ONLINE".equalsIgnoreCase(status)) {
                statusDot.setStyle("-fx-fill: #10b981;");
            } else if ("AWAY".equalsIgnoreCase(status)) {
                statusDot.setStyle("-fx-fill: #f59e0b;");
            } else {
                statusDot.setStyle("-fx-fill: #64748b;");
            }

            VBox infoBox = new VBox(2);
            Label nameLbl = new Label((String) u.getOrDefault("displayName", u.get("username")));
            nameLbl.getStyleClass().add("card-name");
            Label handleLbl = new Label("@" + u.get("username") + " • " + status.toLowerCase());
            handleLbl.getStyleClass().add("card-handle");
            infoBox.getChildren().addAll(nameLbl, handleLbl);

            card.getChildren().addAll(statusDot, infoBox);

            if (activePeer != null && activePeer.get("id").equals(u.get("id"))) {
                card.getStyleClass().add("active-card");
            }

            card.setOnMouseClicked(e -> selectPeer(u));
            userListContainer.getChildren().add(card);
        }
    }

    private void selectPeer(Map<String, Object> peer) {
        activePeer = peer;
        SessionManager.getInstance().setActivePeer(peer);
        renderUserItems(allUsers);

        emptyStateBox.setVisible(false);
        emptyStateBox.setManaged(false);
        activeChatBox.setVisible(true);
        activeChatBox.setManaged(true);

        activePeerNameLabel.setText((String) peer.getOrDefault("displayName", peer.get("username")));
        updateActiveHeaderStatus();

        // Subscribe to conversation channel topic
        Long myId = SessionManager.getInstance().getCurrentUserId();
        Long peerId = Long.parseLong(peer.get("id").toString());
        String convChannel = Math.min(myId, peerId) + "." + Math.max(myId, peerId);
        stompClient.subscribe("/topic/messages." + convChannel, this::handleIncomingMessageJson);

        // Algorithm 4: Retrieve Message History
        loadMessageHistory();
    }

    private void updateActiveHeaderStatus() {
        if (activePeer == null) return;
        String status = (String) activePeer.getOrDefault("status", "OFFLINE");
        activePeerStatusLabel.setText(status.substring(0, 1).toUpperCase() + status.substring(1).toLowerCase());
        if ("ONLINE".equalsIgnoreCase(status)) {
            activePeerStatusCircle.setStyle("-fx-fill: #10b981;");
        } else if ("AWAY".equalsIgnoreCase(status)) {
            activePeerStatusCircle.setStyle("-fx-fill: #f59e0b;");
        } else {
            activePeerStatusCircle.setStyle("-fx-fill: #64748b;");
        }
    }

    /**
     * Algorithm 4 - Retrieve Message History
     */
    private void loadMessageHistory() {
        messageContainer.getChildren().clear();
        Long myId = SessionManager.getInstance().getCurrentUserId();
        Long peerId = Long.parseLong(activePeer.get("id").toString());

        new Thread(() -> {
            try {
                List<Map<String, Object>> history = apiClient.getConversationHistory(myId, peerId);
                Platform.runLater(() -> {
                    for (Map<String, Object> msg : history) {
                        appendMessageBubble(msg);
                    }
                });
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void appendMessageBubble(Map<String, Object> msg) {
        Long myId = SessionManager.getInstance().getCurrentUserId();
        Long senderId = Long.parseLong(msg.get("senderId").toString());
        boolean isSent = senderId.equals(myId);

        VBox bubbleBox = new VBox(4);
        bubbleBox.setMaxWidth(460);

        HBox bubble = new HBox(8);
        bubble.setPadding(new Insets(10, 14, 10, 14));
        bubble.getStyleClass().add(isSent ? "bubble-sent" : "bubble-received");

        VBox contentBox = new VBox(6);

        // Check for media attachment
        String mediaUrl = (String) msg.get("mediaUrl");
        if (mediaUrl != null && !mediaUrl.isEmpty()) {
            if (mediaUrl.matches(".*\\.(?i)(jpg|jpeg|png|gif|webp|svg)$")) {
                try {
                    ImageView iv = new ImageView(new Image(mediaUrl, 280, 200, true, true));
                    iv.setStyle("-fx-background-radius: 8px;");
                    contentBox.getChildren().add(iv);
                } catch (Exception ignored) {}
            } else {
                Label fileLbl = new Label("📎 " + msg.getOrDefault("fileName", "Attachment"));
                fileLbl.setStyle("-fx-font-weight: bold; -fx-text-fill: #a5b4fc;");
                contentBox.getChildren().add(fileLbl);
            }
        }

        String content = (String) msg.get("content");
        if (content != null && !content.isEmpty()) {
            Label textLbl = new Label(content);
            textLbl.setWrapText(true);
            textLbl.getStyleClass().add(isSent ? "bubble-text-sent" : "bubble-text-received");
            contentBox.getChildren().add(textLbl);
        }

        bubble.getChildren().add(contentBox);
        bubbleBox.getChildren().add(bubble);

        // Timestamp & status
        HBox metaBox = new HBox(6);
        metaBox.setAlignment(isSent ? Pos.CENTER_RIGHT : Pos.CENTER_LEFT);
        Label timeLbl = new Label(formatTime(msg.get("timestamp")));
        timeLbl.getStyleClass().add("message-time");
        metaBox.getChildren().add(timeLbl);
        if (isSent) {
            Label checkLbl = new Label("✓✓");
            checkLbl.setStyle("-fx-font-size: 10px; -fx-text-fill: #94a3b8;");
            metaBox.getChildren().add(checkLbl);
        }
        bubbleBox.getChildren().add(metaBox);

        HBox row = new HBox();
        row.setAlignment(isSent ? Pos.CENTER_RIGHT : Pos.CENTER_LEFT);
        row.setPadding(new Insets(4, 10, 4, 10));
        row.getChildren().add(bubbleBox);

        messageContainer.getChildren().add(row);
    }

    /**
     * Algorithm 3 - Send Message
     */
    @FXML
    public void handleSendMessage(ActionEvent event) {
        String text = messageInputField.getText().trim();
        if (text.isEmpty() && pendingMediaFile == null && uploadedMediaUrl == null) {
            return;
        }

        Long myId = SessionManager.getInstance().getCurrentUserId();
        String myUsername = SessionManager.getInstance().getCurrentUsername();
        Long peerId = Long.parseLong(activePeer.get("id").toString());
        String peerUsername = (String) activePeer.get("username");

        sendBtn.setDisable(true);

        new Thread(() -> {
            try {
                String mediaUrl = uploadedMediaUrl;
                String fileName = null;
                Long fileSize = null;
                String msgType = "CHAT";

                if (pendingMediaFile != null) {
                    Map<String, Object> uploadResult = apiClient.uploadMedia(pendingMediaFile);
                    mediaUrl = (String) uploadResult.get("fileDownloadUri");
                    fileName = (String) uploadResult.get("originalFileName");
                    fileSize = Long.parseLong(uploadResult.get("size").toString());
                    msgType = fileName.matches(".*\\.(?i)(jpg|jpeg|png|gif|webp)$") ? "IMAGE" : "FILE";
                }

                Map<String, Object> payload = new HashMap<>();
                payload.put("senderId", myId);
                payload.put("senderUsername", myUsername);
                payload.put("receiverId", peerId);
                payload.put("receiverUsername", peerUsername);
                payload.put("content", text);
                payload.put("type", msgType);
                payload.put("mediaUrl", mediaUrl);
                payload.put("fileName", fileName);
                payload.put("fileSize", fileSize);
                payload.put("status", "SENT");
                payload.put("timestamp", LocalDateTime.now().toString());

                String json = objectMapper.writeValueAsString(payload);

                // Step 5: Send the message through WebSocket
                stompClient.send("/app/chat.sendMessage", json);

                Platform.runLater(() -> {
                    messageInputField.clear();
                    clearAttachment();
                    sendBtn.setDisable(false);
                    appendMessageBubble(payload);
                });
            } catch (Exception e) {
                e.printStackTrace();
                Platform.runLater(() -> sendBtn.setDisable(false));
            }
        }).start();
    }

    @FXML
    public void handleAttachFile(ActionEvent event) {
        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Select Photo or Document to Send");
        fileChooser.getExtensionFilters().addAll(
                new FileChooser.ExtensionFilter("Images and Documents", "*.png", "*.jpg", "*.jpeg", "*.gif", "*.pdf", "*.txt", "*.doc", "*.docx"),
                new FileChooser.ExtensionFilter("All Files", "*.*")
        );
        Stage stage = (Stage) attachBtn.getScene().getWindow();
        File file = fileChooser.showOpenDialog(stage);
        if (file != null) {
            pendingMediaFile = file;
            attachedFileNameLabel.setText(file.getName() + " (" + (file.length() / 1024) + " KB)");
            attachmentPreviewBar.setVisible(true);
            attachmentPreviewBar.setManaged(true);
        }
    }

    @FXML
    public void clearAttachment() {
        pendingMediaFile = null;
        uploadedMediaUrl = null;
        attachmentPreviewBar.setVisible(false);
        attachmentPreviewBar.setManaged(false);
    }

    @FXML
    public void handleLogout(ActionEvent event) {
        stompClient.disconnect();
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/com/messiq/client/fxml/login.fxml"));
            Parent root = loader.load();
            Stage stage = (Stage) userListContainer.getScene().getWindow();
            Scene scene = new Scene(root, 480, 640);
            scene.getStylesheets().add(getClass().getResource("/com/messiq/client/css/styles.css").toExternalForm());
            stage.setScene(scene);
            stage.setTitle("messiQ - Sign In");
            stage.centerOnScreen();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String formatTime(Object ts) {
        if (ts == null) return "";
        try {
            String str = ts.toString();
            if (str.length() >= 16) {
                return str.substring(11, 16);
            }
            return str;
        } catch (Exception e) {
            return "";
        }
    }
}

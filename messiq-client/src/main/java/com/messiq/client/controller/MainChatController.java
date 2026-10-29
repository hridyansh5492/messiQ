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
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.*;
import javafx.scene.shape.Circle;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class MainChatController {

    @FXML private BorderPane rootPane;
    @FXML private Circle topWsCircle;
    @FXML private Label wsStatusLabel;
    @FXML private Label topDateLabel;
    @FXML private Circle topUserAvatarCircle;
    @FXML private Circle railUserAvatarCircle;
    @FXML private Button themeToggleBtn;

    // Sidebar
    @FXML private Label convCountLabel;
    @FXML private TextField searchField;
    @FXML private Button chipAllBtn;
    @FXML private Button chipUnreadBtn;
    @FXML private Button chipDirBtn;
    @FXML private VBox userListContainer;

    // Chat Area
    @FXML private VBox emptyStateBox;
    @FXML private VBox activeChatBox;
    @FXML private Circle activePeerAvatarCircle;
    @FXML private Circle activePeerStatusCircle;
    @FXML private Label activePeerNameLabel;
    @FXML private Label activePeerStatusLabel;

    @FXML private ScrollPane messageScrollPane;
    @FXML private VBox messageContainer;
    @FXML private HBox typingBox;
    @FXML private Label typingLabel;

    @FXML private HBox attachmentPreviewBar;
    @FXML private Label attachedFileNameLabel;
    @FXML private TextField messageInputField;
    @FXML private Button sendBtn;
    @FXML private Button attachBtn;

    private final ApiClient apiClient = SessionManager.getInstance().getApiClient();
    private final StompWebSocketClient stompClient = SessionManager.getInstance().getStompClient();
    private final ObjectMapper objectMapper = apiClient.getObjectMapper();

    private List<Map<String, Object>> allUsers = new ArrayList<>();
    private List<Map<String, Object>> conversations = new ArrayList<>();
    private Map<String, Object> activePeer = null;
    private File pendingMediaFile = null;
    private String uploadedMediaUrl = null;
    private boolean isDarkMode = false;
    private String currentTab = "all";

    @FXML
    public void initialize() {
        // Set top date
        topDateLabel.setText(LocalDateTime.now().format(DateTimeFormatter.ofPattern("EEE, MMMM d")));

        emptyStateBox.setVisible(true);
        emptyStateBox.setManaged(true);
        activeChatBox.setVisible(false);
        activeChatBox.setManaged(false);
        attachmentPreviewBar.setVisible(false);
        attachmentPreviewBar.setManaged(false);
        if (typingBox != null) {
            typingBox.setVisible(false);
            typingBox.setManaged(false);
        }

        initWebSocketConnection();
        loadUsersList("");

        // Auto scroll to bottom
        messageContainer.heightProperty().addListener((obs, oldVal, newVal) -> {
            messageScrollPane.setVvalue(1.0);
        });

        // Search listener
        searchField.textProperty().addListener((obs, oldVal, newVal) -> {
            loadUsersList(newVal);
        });
    }

    /**
     * Theme switcher: Light Mode (Figma warm celadon) <-> Dark Mode (Obsidian & Forest)
     */
    @FXML
    public void handleToggleTheme(ActionEvent event) {
        isDarkMode = !isDarkMode;
        if (isDarkMode) {
            rootPane.getStyleClass().remove("theme-light");
            rootPane.getStyleClass().add("theme-dark");
            themeToggleBtn.setText("☀️");
        } else {
            rootPane.getStyleClass().remove("theme-dark");
            rootPane.getStyleClass().add("theme-light");
            themeToggleBtn.setText("🌙");
        }
    }

    @FXML
    public void handleFilterAll(ActionEvent event) {
        currentTab = "all";
        updateFilterChipStyles();
        loadUsersList(searchField.getText());
    }

    @FXML
    public void handleFilterUnread(ActionEvent event) {
        currentTab = "unread";
        updateFilterChipStyles();
        loadUsersList(searchField.getText());
    }

    @FXML
    public void handleShowDirectory(ActionEvent event) {
        currentTab = "directory";
        updateFilterChipStyles();
        loadUsersList(searchField.getText());
    }

    private void updateFilterChipStyles() {
        chipAllBtn.getStyleClass().remove("active-chip");
        chipUnreadBtn.getStyleClass().remove("active-chip");
        chipDirBtn.getStyleClass().remove("active-chip");

        if ("all".equals(currentTab)) chipAllBtn.getStyleClass().add("active-chip");
        else if ("unread".equals(currentTab)) chipUnreadBtn.getStyleClass().add("active-chip");
        else if ("directory".equals(currentTab)) chipDirBtn.getStyleClass().add("active-chip");
    }

    private void initWebSocketConnection() {
        stompClient.setConnectionStateListener(connected -> {
            if (connected) {
                wsStatusLabel.setText("All systems connected");
                topWsCircle.setStyle("-fx-fill: #10b981;");
            } else {
                wsStatusLabel.setText("Disconnected");
                topWsCircle.setStyle("-fx-fill: #ef4444;");
            }
        });

        Long userId = SessionManager.getInstance().getCurrentUserId();
        String username = SessionManager.getInstance().getCurrentUsername();
        stompClient.connect(username, userId);

        stompClient.subscribe("/topic/status", this::handlePresenceUpdate);
        stompClient.subscribe("/user/queue/messages", this::handleIncomingMessageJson);

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
                    convCountLabel.setText(String.valueOf(users.size()));
                    renderUserItems(users);

                    // Auto select first user if none selected
                    if (activePeer == null && !users.isEmpty()) {
                        selectPeer(users.get(0));
                    }
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
            card.getStyleClass().add("contact-card-box");
            card.setPadding(new Insets(10, 12, 10, 12));

            Circle statusDot = new Circle(4);
            String status = (String) u.getOrDefault("status", "OFFLINE");
            statusDot.setStyle("ONLINE".equalsIgnoreCase(status) ? "-fx-fill: #10b981;" : "-fx-fill: #94a3b8;");

            VBox infoBox = new VBox(2);
            HBox.setHgrow(infoBox, Priority.ALWAYS);

            HBox topRow = new HBox(4);
            Label nameLbl = new Label((String) u.getOrDefault("displayName", u.get("username")));
            nameLbl.getStyleClass().add("contact-card-name");
            Region spacer = new Region();
            HBox.setHgrow(spacer, Priority.ALWAYS);
            Label timeLbl = new Label("now");
            timeLbl.setStyle("-fx-font-size: 10.5px; -fx-text-fill: #868f8c;");
            topRow.getChildren().addAll(nameLbl, spacer, timeLbl);

            Label previewLbl = new Label("@" + u.get("username") + " • " + status.toLowerCase());
            previewLbl.getStyleClass().add("contact-card-preview");
            infoBox.getChildren().addAll(topRow, previewLbl);

            card.getChildren().addAll(statusDot, infoBox);

            if (activePeer != null && activePeer.get("id").equals(u.get("id"))) {
                card.getStyleClass().add("active-contact-card");
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

        Long myId = SessionManager.getInstance().getCurrentUserId();
        Long peerId = Long.parseLong(peer.get("id").toString());
        String convChannel = Math.min(myId, peerId) + "." + Math.max(myId, peerId);
        stompClient.subscribe("/topic/messages." + convChannel, this::handleIncomingMessageJson);

        loadMessageHistory();
    }

    private void updateActiveHeaderStatus() {
        if (activePeer == null) return;
        String status = (String) activePeer.getOrDefault("status", "OFFLINE");
        boolean isOnline = "ONLINE".equalsIgnoreCase(status);
        activePeerStatusLabel.setText(isOnline ? "Online now • Available" : "Offline • Last seen recently");
        activePeerStatusCircle.setStyle(isOnline ? "-fx-fill: #10b981;" : "-fx-fill: #94a3b8;");
    }

    @FXML
    public void handleRefreshHistory(ActionEvent event) {
        loadMessageHistory();
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

    /**
     * Append message bubbles matching the Figma design:
     * - Incoming: Dark obsidian bubble with white text
     * - Outgoing: White bubble with dark text + "Read ✓✓"
     */
    private void appendMessageBubble(Map<String, Object> msg) {
        Long myId = SessionManager.getInstance().getCurrentUserId();
        Long senderId = Long.parseLong(msg.get("senderId").toString());
        boolean isSent = senderId.equals(myId);

        VBox bubbleWrapper = new VBox(4);
        bubbleWrapper.setMaxWidth(480);

        // Content container
        VBox bubbleCard = new VBox(6);
        bubbleCard.setPadding(new Insets(10, 16, 10, 16));
        bubbleCard.getStyleClass().add(isSent ? "bubble-outgoing" : "bubble-incoming");

        // Photo Attachment or Image Card
        String mediaUrl = (String) msg.get("mediaUrl");
        if (mediaUrl != null && !mediaUrl.isEmpty()) {
            if (mediaUrl.matches(".*\\.(?i)(jpg|jpeg|png|gif|webp)$")) {
                try {
                    ImageView iv = new ImageView(new Image(mediaUrl, 320, 200, true, true));
                    iv.setStyle("-fx-background-radius: 8px;");
                    bubbleCard.getChildren().add(iv);

                    Label locLbl = new Label("📍 " + msg.getOrDefault("fileName", "Casa Olivo • Mallorca, Spain"));
                    locLbl.setStyle("-fx-font-size: 11px; -fx-text-fill: #94a3b8;");
                    bubbleCard.getChildren().add(locLbl);
                } catch (Exception ignored) {}
            } else {
                Label fileLbl = new Label("📎 " + msg.getOrDefault("fileName", "Attachment"));
                fileLbl.setStyle("-fx-font-weight: bold; -fx-text-fill: #60a5fa;");
                bubbleCard.getChildren().add(fileLbl);
            }
        }

        // Audio Voice Note Simulation
        String content = (String) msg.get("content");
        if ("[VOICE_NOTE]".equals(content)) {
            HBox audioRow = new HBox(8);
            audioRow.setAlignment(Pos.CENTER_LEFT);
            Label playIcon = new Label("▶ 0:24");
            playIcon.setStyle("-fx-text-fill: #ffffff; -fx-font-size: 11px; -fx-font-weight: bold; -fx-background-color: rgba(255,255,255,0.2); -fx-padding: 4px 8px; -fx-background-radius: 12px;");
            Label wave = new Label("|||l|l|||l||l|");
            wave.setStyle("-fx-text-fill: #ffffff; -fx-font-weight: bold;");
            audioRow.getChildren().addAll(playIcon, wave);
            bubbleCard.getChildren().add(audioRow);
        } else if (content != null && !content.isEmpty()) {
            Label textLbl = new Label(content);
            textLbl.setWrapText(true);
            textLbl.getStyleClass().add(isSent ? "bubble-text-outgoing" : "bubble-text-incoming");
            bubbleCard.getChildren().add(textLbl);
        }

        bubbleWrapper.getChildren().add(bubbleCard);

        // Metadata: Time + Read Check
        HBox metaRow = new HBox(6);
        metaRow.setAlignment(isSent ? Pos.CENTER_RIGHT : Pos.CENTER_LEFT);
        Label timeLbl = new Label(formatTime(msg.get("timestamp")));
        timeLbl.getStyleClass().add("meta-time-text");
        metaRow.getChildren().add(timeLbl);
        if (isSent) {
            Label readLbl = new Label("• Read ✓✓");
            readLbl.setStyle("-fx-font-size: 10px; -fx-text-fill: #10b981;");
            metaRow.getChildren().add(readLbl);
        }
        bubbleWrapper.getChildren().add(metaRow);

        HBox row = new HBox();
        row.setAlignment(isSent ? Pos.CENTER_RIGHT : Pos.CENTER_LEFT);
        row.setPadding(new Insets(4, 10, 4, 10));
        row.getChildren().add(bubbleWrapper);

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
        fileChooser.setTitle("Select Photo or File to Share");
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
    public void handleInsertEmoji(ActionEvent event) {
        messageInputField.appendText(" 🌿");
    }

    @FXML
    public void handleSendVoiceNote(ActionEvent event) {
        messageInputField.setText("[VOICE_NOTE]");
        handleSendMessage(event);
    }

    @FXML
    public void handleLogout(MouseEvent event) {
        stompClient.disconnect();
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/com/messiq/client/fxml/login.fxml"));
            Parent root = loader.load();
            Stage stage = (Stage) rootPane.getScene().getWindow();
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

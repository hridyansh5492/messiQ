package com.messiq.client.network;

import javafx.application.Platform;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

public class StompWebSocketClient {

    private final URI serverUri;
    private WebSocketClient webSocketClient;
    private boolean connected = false;

    private final Map<String, Consumer<String>> topicSubscriptions = new HashMap<>();
    private Consumer<Boolean> connectionStateListener;

    public StompWebSocketClient(String wsUrl) {
        this.serverUri = URI.create(wsUrl);
    }

    public void setConnectionStateListener(Consumer<Boolean> listener) {
        this.connectionStateListener = listener;
    }

    public void connect(String username, Long userId) {
        webSocketClient = new WebSocketClient(serverUri) {
            @Override
            public void onOpen(ServerHandshake handshake) {
                // Send STOMP CONNECT frame
                String connectFrame = "CONNECT\n" +
                        "accept-version:1.2,1.1,1.0\n" +
                        "heart-beat:10000,10000\n" +
                        "login:" + username + "\n" +
                        "passcode:\n" +
                        "\n\0";
                send(connectFrame);
            }

            @Override
            public void onMessage(String message) {
                parseStompFrame(message);
            }

            @Override
            public void onClose(int code, String reason, boolean remote) {
                connected = false;
                if (connectionStateListener != null) {
                    Platform.runLater(() -> connectionStateListener.accept(false));
                }
            }

            @Override
            public void onError(Exception ex) {
                System.err.println("WebSocket Error: " + ex.getMessage());
            }
        };

        webSocketClient.connect();
    }

    private void parseStompFrame(String raw) {
        if (raw == null || raw.trim().isEmpty()) return;

        // Frames might be batched or contain \0 delimiter
        String[] frames = raw.split("\0");
        for (String frame : frames) {
            if (frame.trim().isEmpty()) continue;

            String[] parts = frame.split("\n\n", 2);
            if (parts.length < 2) continue;

            String headersPart = parts[0];
            String body = parts[1];

            String[] headerLines = headersPart.split("\n");
            String command = headerLines[0].trim();

            if ("CONNECTED".equals(command)) {
                connected = true;
                if (connectionStateListener != null) {
                    Platform.runLater(() -> connectionStateListener.accept(true));
                }
                // Resubscribe to registered topics
                topicSubscriptions.keySet().forEach(this::sendSubscribeFrame);
            } else if ("MESSAGE".equals(command)) {
                String destination = null;
                for (String line : headerLines) {
                    if (line.startsWith("destination:")) {
                        destination = line.substring("destination:".length()).trim();
                        break;
                    }
                }

                if (destination != null) {
                    Consumer<String> consumer = topicSubscriptions.get(destination);
                    if (consumer != null) {
                        final String finalBody = body;
                        Platform.runLater(() -> consumer.accept(finalBody));
                    }
                }
            }
        }
    }

    public void subscribe(String destination, Consumer<String> callback) {
        topicSubscriptions.put(destination, callback);
        if (connected) {
            sendSubscribeFrame(destination);
        }
    }

    private void sendSubscribeFrame(String destination) {
        String subFrame = "SUBSCRIBE\n" +
                "id:sub-" + destination.hashCode() + "\n" +
                "destination:" + destination + "\n" +
                "\n\0";
        webSocketClient.send(subFrame);
    }

    public void send(String destination, String jsonPayload) {
        if (webSocketClient != null && webSocketClient.isOpen()) {
            String sendFrame = "SEND\n" +
                    "destination:" + destination + "\n" +
                    "content-type:application/json\n" +
                    "\n" +
                    jsonPayload + "\0";
            webSocketClient.send(sendFrame);
        }
    }

    public void disconnect() {
        if (webSocketClient != null) {
            try {
                webSocketClient.send("DISCONNECT\n\n\0");
                webSocketClient.close();
            } catch (Exception e) {
                // ignore
            }
        }
    }

    public boolean isConnected() {
        return connected;
    }
}

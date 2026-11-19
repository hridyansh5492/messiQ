package com.messiq.server.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable in-memory broker for topics and user queues
        config.enableSimpleBroker("/topic", "/queue");
        // Destination prefix for application mappings
        config.setApplicationDestinationPrefixes("/app");
        // Prefix for user-specific destinations
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Standard WebSocket endpoint with SockJS support for browsers
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .setHandshakeHandler(new UserHandshakeHandler())
                .addInterceptors(new UserHandshakeInterceptor())
                .withSockJS();

        // Plain WebSocket endpoint without SockJS for JavaFX desktop client
        registry.addEndpoint("/ws-direct")
                .setAllowedOriginPatterns("*")
                .setHandshakeHandler(new UserHandshakeHandler())
                .addInterceptors(new UserHandshakeInterceptor());
    }

    private static class UserHandshakeInterceptor implements HandshakeInterceptor {
        @Override
        public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                      WebSocketHandler wsHandler, Map<String, Object> attributes) {
            if (request instanceof ServletServerHttpRequest servletRequest) {
                HttpServletRequest req = servletRequest.getServletRequest();
                String username = req.getParameter("username");
                String userId = req.getParameter("userId");
                if (username != null && !username.isBlank()) {
                    attributes.put("username", username);
                }
                if (userId != null && !userId.isBlank()) {
                    try {
                        attributes.put("userId", Long.parseLong(userId));
                    } catch (NumberFormatException ignored) {}
                }
            }
            return true;
        }

        @Override
        public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Exception exception) {
        }
    }

    private static class UserHandshakeHandler extends DefaultHandshakeHandler {
        @Override
        protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler, Map<String, Object> attributes) {
            String username = (String) attributes.get("username");
            if (username != null && !username.isBlank()) {
                return () -> username;
            }
            return super.determineUser(request, wsHandler, attributes);
        }
    }
}

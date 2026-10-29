package com.messiq.server.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker to carry messages to clients
        // on destinations prefixed with /topic (broadcast/presence) and /queue (user direct)
        config.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages bound for methods annotated with @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
        // Prefix for user-specific queue destinations
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Standard WebSocket endpoint with SockJS support for browsers
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Plain WebSocket endpoint without SockJS for pure Java/JavaFX desktop client
        registry.addEndpoint("/ws-direct")
                .setAllowedOriginPatterns("*");
    }
}

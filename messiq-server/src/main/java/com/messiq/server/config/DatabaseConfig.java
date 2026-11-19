package com.messiq.server.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DatabaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseConfig.class);

    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties properties) {
        String dbUrl = System.getenv("DATABASE_URL");
        if (dbUrl == null || dbUrl.trim().isEmpty()) {
            dbUrl = System.getenv("SPRING_DATASOURCE_URL");
        }

        if (dbUrl != null && !dbUrl.trim().isEmpty()) {
            String trimmed = dbUrl.trim();
            // Automatically convert standard postgres:// or postgresql:// URLs into Java JDBC format
            if (trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://")) {
                try {
                    URI uri = new URI(trimmed);
                    String userInfo = uri.getUserInfo();
                    String username = properties.getUsername();
                    String password = properties.getPassword();
                    if (userInfo != null && userInfo.contains(":")) {
                        String[] parts = userInfo.split(":", 2);
                        username = parts[0];
                        password = parts[1];
                    }
                    int port = uri.getPort() != -1 ? uri.getPort() : 5432;
                    String path = (uri.getPath() != null && !uri.getPath().isEmpty()) ? uri.getPath() : "/postgres";
                    String query = uri.getQuery();
                    String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port + path;
                    if (query != null && !query.isEmpty()) {
                        jdbcUrl += "?" + query;
                        if (!query.contains("sslmode")) {
                            jdbcUrl += "&sslmode=require";
                        }
                    } else {
                        jdbcUrl += "?sslmode=require";
                    }

                    logger.info("Auto-configured Supabase/PostgreSQL connection from DATABASE_URL for host: {}:{}", uri.getHost(), port);
                    properties.setUrl(jdbcUrl);
                    if (username != null) properties.setUsername(username);
                    if (password != null) properties.setPassword(password);
                    properties.setDriverClassName("org.postgresql.Driver");
                } catch (Exception e) {
                    logger.warn("Could not parse DATABASE_URL as URI, falling back to raw URL: {}", e.getMessage());
                    properties.setUrl(trimmed);
                }
            } else {
                properties.setUrl(trimmed);
            }
        }

        return properties.initializeDataSourceBuilder().build();
    }
}

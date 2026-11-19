package com.messiq.server.config;

import org.hibernate.cfg.AvailableSettings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Configuration
public class DatabaseConfig implements HibernatePropertiesCustomizer {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseConfig.class);

    private String detectedDialect = null;

    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties properties) {
        String dbUrl = System.getenv("DATABASE_URL");
        if (dbUrl == null || dbUrl.trim().isEmpty()) {
            dbUrl = System.getenv("SPRING_DATASOURCE_URL");
        }

        if (dbUrl != null && !dbUrl.trim().isEmpty()) {
            ParsedDatabaseUrl parsed = parseDatabaseUrl(dbUrl.trim(), properties);
            if (parsed != null) {
                properties.setUrl(parsed.jdbcUrl);
                if (parsed.username != null) {
                    properties.setUsername(parsed.username);
                }
                if (parsed.password != null) {
                    properties.setPassword(parsed.password);
                }
                if (parsed.driverClassName != null) {
                    properties.setDriverClassName(parsed.driverClassName);
                }
                if (parsed.dialect != null) {
                    this.detectedDialect = parsed.dialect;
                }
                logger.info("Configured datasource from environment: driver={}, dialect={}",
                        parsed.driverClassName, parsed.dialect);
            }
        } else {
            // Default to embedded H2 if no cloud DATABASE_URL is set
            String url = properties.getUrl();
            if (url == null || url.contains(":h2:")) {
                this.detectedDialect = "org.hibernate.dialect.H2Dialect";
                properties.setDriverClassName("org.h2.Driver");
            } else if (url.contains(":postgresql:")) {
                this.detectedDialect = "org.hibernate.dialect.PostgreSQLDialect";
                properties.setDriverClassName("org.postgresql.Driver");
            } else if (url.contains(":mysql:")) {
                this.detectedDialect = "org.hibernate.dialect.MySQLDialect";
                properties.setDriverClassName("com.mysql.cj.jdbc.Driver");
            }
        }

        return properties.initializeDataSourceBuilder().build();
    }

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        if (this.detectedDialect != null) {
            logger.info("Setting explicit Hibernate dialect: {}", this.detectedDialect);
            hibernateProperties.put(AvailableSettings.DIALECT, this.detectedDialect);
        }
    }

    private static ParsedDatabaseUrl parseDatabaseUrl(String rawUrl, DataSourceProperties defaults) {
        String remaining = rawUrl;
        boolean hasJdbcPrefix = remaining.startsWith("jdbc:");
        if (hasJdbcPrefix) {
            remaining = remaining.substring(5);
        }

        boolean isPostgres = remaining.startsWith("postgres://") || remaining.startsWith("postgresql:");
        boolean isMysql = remaining.startsWith("mysql://") || remaining.startsWith("mysql:");

        if (isPostgres || isMysql) {
            // Remove protocol part (e.g. "postgres://" or "postgresql://")
            int protoEnd = remaining.indexOf("://");
            if (protoEnd != -1) {
                remaining = remaining.substring(protoEnd + 3);
            } else {
                int colonSlash = remaining.indexOf(":");
                if (colonSlash != -1) {
                    remaining = remaining.substring(colonSlash + 1);
                    while (remaining.startsWith("/")) {
                        remaining = remaining.substring(1);
                    }
                }
            }

            String username = defaults != null ? defaults.getUsername() : null;
            String password = defaults != null ? defaults.getPassword() : null;

            // Separate credentials from host:port/db using last '@' to protect passwords with '@'
            int atIndex = remaining.lastIndexOf('@');
            if (atIndex != -1) {
                String userInfo = remaining.substring(0, atIndex);
                remaining = remaining.substring(atIndex + 1);

                int colonIndex = userInfo.indexOf(':');
                if (colonIndex != -1) {
                    username = urlDecode(userInfo.substring(0, colonIndex));
                    password = urlDecode(userInfo.substring(colonIndex + 1));
                } else {
                    username = urlDecode(userInfo);
                }
            }

            // Check for Render IPv6 direct connection warning on Supabase
            if (remaining.contains(".supabase.co") && remaining.contains(":5432")) {
                logger.warn("WARNING: Supabase direct connection detected (db.xxx.supabase.co:5432). " +
                        "Render free tier only supports IPv4. If connection fails, switch to Supabase Connection Pooler on port 6543.");
            }

            String jdbcUrl;
            if (isPostgres) {
                if (!remaining.contains("?")) {
                    remaining += "?sslmode=require";
                } else if (!remaining.contains("sslmode")) {
                    remaining += "&sslmode=require";
                }
                jdbcUrl = "jdbc:postgresql://" + remaining;
                return new ParsedDatabaseUrl(jdbcUrl, username, password,
                        "org.postgresql.Driver", "org.hibernate.dialect.PostgreSQLDialect");
            } else {
                jdbcUrl = "jdbc:mysql://" + remaining;
                return new ParsedDatabaseUrl(jdbcUrl, username, password,
                        "com.mysql.cj.jdbc.Driver", "org.hibernate.dialect.MySQLDialect");
            }
        }

        // Already a standard JDBC URL or H2
        String dialect = null;
        String driver = null;
        if (rawUrl.contains(":postgresql:")) {
            dialect = "org.hibernate.dialect.PostgreSQLDialect";
            driver = "org.postgresql.Driver";
        } else if (rawUrl.contains(":mysql:")) {
            dialect = "org.hibernate.dialect.MySQLDialect";
            driver = "com.mysql.cj.jdbc.Driver";
        } else if (rawUrl.contains(":h2:")) {
            dialect = "org.hibernate.dialect.H2Dialect";
            driver = "org.h2.Driver";
        }

        return new ParsedDatabaseUrl(rawUrl, defaults != null ? defaults.getUsername() : null,
                defaults != null ? defaults.getPassword() : null, driver, dialect);
    }

    private static String urlDecode(String val) {
        try {
            return URLDecoder.decode(val, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return val;
        }
    }

    private static class ParsedDatabaseUrl {
        final String jdbcUrl;
        final String username;
        final String password;
        final String driverClassName;
        final String dialect;

        ParsedDatabaseUrl(String jdbcUrl, String username, String password, String driverClassName, String dialect) {
            this.jdbcUrl = jdbcUrl;
            this.username = username;
            this.password = password;
            this.driverClassName = driverClassName;
            this.dialect = dialect;
        }
    }
}

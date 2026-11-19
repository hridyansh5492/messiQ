# ========================================================
# messiQ Production Dockerfile for Render / Cloud Deployment
# ========================================================

# Stage 1: Build the Spring Boot JAR
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /build

# Copy root POM and project source
COPY pom.xml ./
COPY messiq-server/pom.xml ./messiq-server/
COPY messiq-client/pom.xml ./messiq-client/
COPY messiq-server/src ./messiq-server/src

# Package backend server JAR (skipping desktop client and tests)
RUN mvn clean package -pl messiq-server -DskipTests

# Stage 2: Minimal Production JRE Image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create upload and data directories
RUN mkdir -p /app/uploads /app/data

# Copy built JAR from builder stage
COPY --from=builder /build/messiq-server/target/messiq-server-1.0.0.jar app.jar

# Render sets PORT dynamically (defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# Run Spring Boot application
ENTRYPOINT ["sh", "-c", "java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom -jar app.jar"]

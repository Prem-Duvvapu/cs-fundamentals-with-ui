# Stage 1: Build Java artifact using Maven
FROM maven:3.9.15-eclipse-temurin-26 AS builder
WORKDIR /app
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend/src ./src
RUN mvn package -DskipTests

# Stage 2: Minimal Runtime image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
COPY content ./content

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

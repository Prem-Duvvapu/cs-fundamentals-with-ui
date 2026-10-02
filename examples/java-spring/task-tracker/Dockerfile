FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre
RUN groupadd --gid 10001 learner && useradd --uid 10001 --gid learner --no-create-home learner
WORKDIR /app
COPY --from=build /workspace/target/task-tracker-example-0.0.1-SNAPSHOT.jar /app/application.jar
RUN mkdir /app/data && chown learner:learner /app/data
USER 10001:10001
EXPOSE 9191
ENTRYPOINT ["java", "-jar", "/app/application.jar"]
CMD ["--spring.profiles.active=production", "--server.address=0.0.0.0", "--server.port=9191"]

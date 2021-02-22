FROM openjdk:11-jre-slim-buster
RUN addgroup --system spring && adduser --ingroup spring --system spring
USER spring:spring
COPY target/*.jar app.jar
ENTRYPOINT ["java","-jar", "app.jar"]
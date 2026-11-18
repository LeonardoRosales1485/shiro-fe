# syntax=docker/dockerfile:1
# Maven 3.9 + Eclipse Temurin 25 (build y JRE 25 runtime).
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app

# El Core no se copia: es una dependencia publicada (https://sm-soluciones.github.io/sm-core-maven, sin token) y
# dependency:go-offline lo descarga junto con el resto
COPY pom.xml lombok.config ./
COPY app/pom.xml ./app/pom.xml

RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -DskipTests dependency:go-offline

COPY app ./app
# Contrato de endpoint commiteado (docs/api, lo genera mvn -pl app test): prepare-package lo empaqueta en el jar y la
# app lo sirve en /api/docs si contratos.publicar=true
COPY docs/api ./docs/api

# Sin tests (ni compilarlos): la imagen se construye aunque fallen. Los tests se corren a mano (mvn -pl app test)
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -Dmaven.test.skip=true clean package \
    && count="$(find /app/app/target -maxdepth 1 -type f -name '*.jar' \
        ! -name '*-sources.jar' ! -name '*-javadoc.jar' ! -name '*.jar.original' | wc -l | tr -d ' ')" \
    && if [ "$count" -eq 0 ]; then \
         echo "ERROR: no se encontro ningun JAR ejecutable en /app/app/target (se excluyen *-sources.jar, *-javadoc.jar y *.jar.original)" >&2; exit 1; \
       fi \
    && if [ "$count" -gt 1 ]; then \
         echo "ERROR: se encontraron varios JAR ejecutables en /app/app/target; debe quedar exactamente uno:" >&2; \
         find /app/app/target -maxdepth 1 -type f -name '*.jar' \
           ! -name '*-sources.jar' ! -name '*-javadoc.jar' ! -name '*.jar.original' -print >&2; exit 1; \
       fi \
    && f="$(find /app/app/target -maxdepth 1 -type f -name '*.jar' \
        ! -name '*-sources.jar' ! -name '*-javadoc.jar' ! -name '*.jar.original' -print -quit)" \
    && cp "$f" /app/application.jar

FROM eclipse-temurin:25-jre-jammy
WORKDIR /app

# UID/GID fijos para permisos del bind mount de logs en el host (ver docker-compose.yml).
RUN groupadd --gid 10001 spring \
    && useradd --uid 10001 --gid spring --system --no-create-home --shell /usr/sbin/nologin spring

COPY --from=build /app/application.jar /app/application.jar
RUN mkdir -p /app/logs && chown spring:spring /app/application.jar /app/logs

USER spring:spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/application.jar"]

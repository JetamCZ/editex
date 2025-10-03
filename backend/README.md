# Latex Editor

A full-stack LaTeX editor application with Spring Boot backend and React Router frontend.

## Prerequisites

- **Java**: JDK 21 or higher
- **Maven**: 3.6+ (or use the included Maven wrapper)
- **Node.js**: 20+ and npm
- **PostgreSQL**: Required for database

## Backend Setup

### Configuration

Configure database connection in `backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/latex_editor
spring.datasource.username=your_username
spring.datasource.password=your_password
```

### Running the Backend

**Using Maven wrapper (recommended):**

```bash
./mvnw spring-boot:run
```

**Or using installed Maven:**

```bash
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### Building the Backend

```bash
./mvnw clean package
```

The built JAR will be in `target/latex-editor-0.0.1-SNAPSHOT.jar`

To run the built JAR:

```bash
java -jar target/latex-editor-0.0.1-SNAPSHOT.jar
```

## Development

### Running Both Services

Open two terminal windows:

```bash
./mvnw spring-boot:run
```

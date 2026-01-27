package eu.puhony.latex_editor.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Custom Flyway configuration that repairs the schema history before migrating.
 * This helps recover from failed migrations.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            // Repair first to fix any failed migrations
            flyway.repair();
            // Then migrate
            flyway.migrate();
        };
    }
}

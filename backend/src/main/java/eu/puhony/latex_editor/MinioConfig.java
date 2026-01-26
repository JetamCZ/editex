package eu.puhony.latex_editor;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {

    @Value("${minio.url}")
    private String minioUrl;

    @Value("${minio.access.key}")
    private String accessKey;

    @Value("${minio.secret.key}")
    private String secretKey;

    @Value("${minio.bucket.name}")
    private String bucketName;

    @Value("${minio.auto.create.bucket}")
    private boolean autoCreateBucket;

    @Value("${minio.region:}")
    private String region;

    @Bean
    public MinioClient minioClient() {
        MinioClient.Builder builder = MinioClient.builder()
                .endpoint(minioUrl)
                .credentials(accessKey, secretKey);

        if (region != null && !region.isBlank()) {
            builder.region(region);
        }

        MinioClient minioClient = builder.build();

        if (autoCreateBucket) {
            try {
                boolean bucketExists = minioClient.bucketExists(
                        BucketExistsArgs.builder().bucket(bucketName).build()
                );
                if (!bucketExists) {
                    MakeBucketArgs.Builder makeBucketBuilder = MakeBucketArgs.builder().bucket(bucketName);
                    if (region != null && !region.isBlank()) {
                        makeBucketBuilder.region(region);
                    }
                    minioClient.makeBucket(makeBucketBuilder.build());
                    System.out.println("MinIO bucket '" + bucketName + "' created successfully.");
                }
            } catch (Exception e) {
                System.err.println("Error creating MinIO bucket: " + e.getMessage());
            }
        }

        return minioClient;
    }
}

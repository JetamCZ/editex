package eu.puhony.latex_editor.service;

import io.minio.*;
import io.minio.http.Method;
import io.minio.messages.Item;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class MinioService {

    @Autowired
    private MinioClient minioClient;

    @Value("${minio.bucket.name}")
    private String bucketName;

    public String uploadFile(MultipartFile file, String folder) throws Exception {
        String fileName = generateFileName(file.getOriginalFilename());
        String objectName = folder + "/" + fileName;

        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
        }

        return getFileUrl(objectName);
    }

    public String getFileUrl(String objectName) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(objectName)
                            .expiry(7, TimeUnit.DAYS)
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Error generating file URL", e);
        }
    }

    public void deleteFile(String objectName) throws Exception {
        minioClient.removeObject(
                RemoveObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .build()
        );
    }

    public InputStream downloadFile(String objectName) throws Exception {
        return minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .build()
        );
    }

    public String getFileContent(String url) throws Exception {
        String objectName = getObjectNameFromUrl(url);
        if (objectName == null) {
            throw new IllegalArgumentException("Invalid URL: " + url);
        }

        try (InputStream inputStream = downloadFile(objectName)) {
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String generateFileName(String originalFilename) {
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return UUID.randomUUID().toString() + extension;
    }

    public String getObjectNameFromUrl(String url) {
        if (url.contains(bucketName + "/")) {
            return url.substring(url.indexOf(bucketName + "/") + bucketName.length() + 1)
                    .split("\\?")[0];
        }
        return null;
    }

    public String uploadFile(File file, String folder, String contentType) throws Exception {
        String fileName = generateFileName(file.getName());
        String objectName = folder + "/" + fileName;

        try (InputStream inputStream = new FileInputStream(file)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(inputStream, file.length(), -1)
                            .contentType(contentType)
                            .build()
            );
        }

        return getFileUrl(objectName);
    }

    public String uploadFileWithName(File file, String folder, String fileName, String contentType) throws Exception {
        String objectName = folder + "/" + fileName;

        try (InputStream inputStream = new FileInputStream(file)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(inputStream, file.length(), -1)
                            .contentType(contentType)
                            .build()
            );
        }

        return getFileUrl(objectName);
    }

    public void downloadFileToPath(String objectName, File destination) throws Exception {
        try (InputStream inputStream = downloadFile(objectName);
             FileOutputStream outputStream = new FileOutputStream(destination)) {
            inputStream.transferTo(outputStream);
        }
    }

    public String copyFile(String sourceObjectName, String destFolder, String destFileName) throws Exception {
        String destObjectName = destFolder + "/" + destFileName;

        minioClient.copyObject(
                CopyObjectArgs.builder()
                        .bucket(bucketName)
                        .object(destObjectName)
                        .source(CopySource.builder()
                                .bucket(bucketName)
                                .object(sourceObjectName)
                                .build())
                        .build()
        );

        return getFileUrl(destObjectName);
    }

    public String uploadContent(String content, String folder, String fileName, String contentType) throws Exception {
        String objectName = folder + "/" + fileName;
        byte[] contentBytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        try (InputStream inputStream = new java.io.ByteArrayInputStream(contentBytes)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(inputStream, contentBytes.length, -1)
                            .contentType(contentType)
                            .build()
            );
        }

        return getFileUrl(objectName);
    }

    /**
     * Delete all files in a folder (prefix).
     * Used when deleting a branch to clean up S3 storage.
     */
    public void deleteFolder(String folderPrefix) throws Exception {
        // List all objects with the given prefix
        Iterable<Result<Item>> objects = minioClient.listObjects(
                ListObjectsArgs.builder()
                        .bucket(bucketName)
                        .prefix(folderPrefix)
                        .recursive(true)
                        .build()
        );

        // Collect all object names to delete
        List<String> objectsToDelete = new ArrayList<>();
        for (Result<Item> result : objects) {
            objectsToDelete.add(result.get().objectName());
        }

        // Delete each object
        for (String objectName : objectsToDelete) {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build()
            );
        }
    }
}

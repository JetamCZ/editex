export const ContentType = {
    "IMAGE": "image",
    "TEXT": "text",
    "UNKNOWN": "unknown",
    "BINARY": "binary"
}

export const typeMapping = {
    "image/png": ContentType.IMAGE,
    "text/plain": ContentType.TEXT,
    "application/pdf": ContentType.BINARY,
    //"application/octet-stream": ContentType.BINARY,
}

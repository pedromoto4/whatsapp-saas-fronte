"""
Storage module for file uploads
Provides abstraction for different storage backends (Railway Volumes, S3, etc.)
"""
from .storage_service import StorageService, get_storage_service

__all__ = ["StorageService", "get_storage_service"]


"""
Storage Service Abstraction
Provides a unified interface for file storage (Railway Volumes, S3, etc.)
"""
import os
from pathlib import Path
from typing import Optional
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)


class StorageService(ABC):
    """Abstract base class for storage services"""
    
    @abstractmethod
    def get_upload_dir(self) -> Path:
        """Get the upload directory path"""
        pass
    
    @abstractmethod
    def get_public_url(self, filename: str) -> str:
        """Generate public URL for a file"""
        pass
    
    @abstractmethod
    def ensure_directory_exists(self) -> None:
        """Ensure the upload directory exists"""
        pass


class RailwayVolumeStorage(StorageService):
    """
    Storage service using Railway Volumes
    Files are stored in a mounted volume that persists between container restarts
    """
    
    def __init__(self, base_path: Optional[str] = None, base_url: Optional[str] = None):
        """
        Initialize Railway Volume Storage
        
        Args:
            base_path: Base path for uploads (default: /data/uploads or ./uploads)
            base_url: Base URL for public access (default: from env or Railway URL)
        """
        # Get base path from environment or use default
        if base_path:
            self.base_path = Path(base_path)
        else:
            # Try Railway volume mount path first, then fallback to local uploads
            volume_path = os.getenv("RAILWAY_VOLUME_MOUNT_PATH", "/data/uploads")
            if Path(volume_path).exists():
                self.base_path = Path(volume_path)
                logger.info(f"Using Railway volume at: {self.base_path}")
            else:
                # Fallback to local uploads directory
                self.base_path = Path("uploads")
                logger.info(f"Volume not found at {volume_path}, using local directory: {self.base_path}")
        
        # Get base URL for public access
        if base_url:
            self.base_url = base_url.rstrip("/")
        else:
            # Try to get from environment or construct from Railway URL
            railway_url = os.getenv("RAILWAY_PUBLIC_DOMAIN") or os.getenv("RAILWAY_STATIC_URL")
            if railway_url:
                self.base_url = f"https://{railway_url}".rstrip("/")
            else:
                # Fallback to hardcoded URL (should be set via env in production)
                self.base_url = os.getenv(
                    "UPLOAD_BASE_URL",
                    "https://whatsapp-saas-fronte-production.up.railway.app"
                )
        
        logger.info(f"Storage initialized - Base path: {self.base_path}, Base URL: {self.base_url}")
    
    def get_upload_dir(self) -> Path:
        """Get the upload directory path"""
        return self.base_path
    
    def get_public_url(self, filename: str) -> str:
        """Generate public URL for a file"""
        return f"{self.base_url}/whatsapp/uploads/{filename}"
    
    def ensure_directory_exists(self) -> None:
        """Ensure the upload directory exists"""
        try:
            self.base_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Upload directory ensured: {self.base_path.absolute()}")
        except Exception as e:
            logger.error(f"Failed to create upload directory: {e}")
            raise


def get_storage_service() -> StorageService:
    """
    Factory function to get the appropriate storage service
    Currently returns RailwayVolumeStorage, but can be extended to support S3, etc.
    """
    storage_type = os.getenv("STORAGE_TYPE", "railway").lower()
    
    if storage_type == "railway":
        return RailwayVolumeStorage()
    elif storage_type == "s3":
        # Future: return S3Storage()
        raise NotImplementedError("S3 storage not yet implemented")
    else:
        # Default to Railway Volume
        return RailwayVolumeStorage()


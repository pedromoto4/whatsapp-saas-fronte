from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import firebase_admin
from firebase_admin import auth
import json
import os

from app.database import SessionLocal
from app.models import User
from app.schemas import UserCreate
from app.crud import create_user, get_user_by_firebase_uid

# Security
security = HTTPBearer()

async def get_db():
    """Dependency to get database session"""
    async with SessionLocal() as session:
        yield session

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Verify Firebase ID token and return current user"""
    try:
        # Check if Firebase Admin is initialized
        try:
            firebase_admin.get_app()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin not configured. Please configure FIREBASE_CREDENTIALS_JSON."
            )
        
        # Verify the Firebase ID token
        try:
            decoded_token = auth.verify_id_token(credentials.credentials)
        except firebase_admin.exceptions.InvalidArgumentError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token format: {str(e)}"
            )
        except firebase_admin.exceptions.ExpiredIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please refresh your authentication."
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}"
            )
        
        firebase_uid = decoded_token['uid']
        
        # Get user from database
        user = await get_user_by_firebase_uid(db, firebase_uid)
        if not user:
            # Create user if doesn't exist
            user_data = UserCreate(
                firebase_uid=firebase_uid,
                email=decoded_token.get('email', ''),
                name=decoded_token.get('name', ''),
                avatar_url=decoded_token.get('picture', '')
            )
            user = await create_user(db, user_data)
        
        return user
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Firebase auth error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
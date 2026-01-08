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
# Use auto_error=False to handle errors manually and return better error messages
security = HTTPBearer(auto_error=False)

async def get_db():
    """Dependency to get database session"""
    async with SessionLocal() as session:
        yield session

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Verify Firebase ID token and return current user"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Check if credentials were provided
    if not credentials:
        logger.warning("No authorization credentials provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Check if Firebase Admin is initialized
        try:
            firebase_admin.get_app()
        except ValueError:
            logger.error("Firebase Admin not initialized")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin not configured. Please configure FIREBASE_CREDENTIALS_JSON."
            )
        
        # Log token info (first 20 chars only for security)
        token_preview = credentials.credentials[:20] + "..." if len(credentials.credentials) > 20 else credentials.credentials
        logger.info(f"Verifying token: {token_preview}")
        
        # Verify the Firebase ID token
        try:
            decoded_token = auth.verify_id_token(credentials.credentials)
            logger.info(f"Token verified successfully for UID: {decoded_token.get('uid')}")
        except firebase_admin.exceptions.InvalidArgumentError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token format: {str(e)}"
            )
        except firebase_admin.exceptions.ExpiredIdTokenError:
            logger.warning("Token expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please refresh your authentication."
            )
        except firebase_admin.exceptions.InvalidIdTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}"
            )
        
        firebase_uid = decoded_token['uid']
        email = decoded_token.get('email', '')
        
        # Get user from database by Firebase UID
        user = await get_user_by_firebase_uid(db, firebase_uid)
        
        if not user:
            # Check if user exists with same email but different Firebase UID
            from app.crud import get_user_by_email
            if email:
                existing_user = await get_user_by_email(db, email)
                if existing_user:
                    # User exists with same email but different Firebase UID - update it
                    logger.info(f"Updating Firebase UID for existing user {existing_user.id} (email: {email})")
                    existing_user.firebase_uid = firebase_uid
                    if decoded_token.get('name'):
                        existing_user.name = decoded_token.get('name', existing_user.name)
                    if decoded_token.get('picture'):
                        existing_user.avatar_url = decoded_token.get('picture', existing_user.avatar_url)
                    await db.commit()
                    await db.refresh(existing_user)
                    user = existing_user
                else:
                    # Create new user if doesn't exist
                    user_data = UserCreate(
                        firebase_uid=firebase_uid,
                        email=email,
                        name=decoded_token.get('name', ''),
                        avatar_url=decoded_token.get('picture', '')
                    )
                    try:
                        user = await create_user(db, user_data)
                    except Exception as e:
                        # If email already exists (race condition), try to get by email again
                        if 'duplicate key' in str(e).lower() or 'unique constraint' in str(e).lower() or 'email' in str(e).lower():
                            logger.warning(f"Race condition: user created between checks, fetching by email: {email}")
                            existing_user = await get_user_by_email(db, email)
                            if existing_user:
                                existing_user.firebase_uid = firebase_uid
                                await db.commit()
                                await db.refresh(existing_user)
                                user = existing_user
                            else:
                                raise
                        else:
                            raise
            else:
                # No email in token - can't create user
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email not found in token. Cannot create user."
                )
        
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
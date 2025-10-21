"""
Catalog Router
Handles catalog management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.dependencies import get_current_user, get_db
from app.models import User
from app.schemas import CatalogCreate, CatalogUpdate, CatalogResponse
from app.crud import create_catalog_item, get_catalog_items, get_catalog_item, update_catalog_item, delete_catalog_item

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])

@router.post("/", response_model=CatalogResponse)
async def create_item_endpoint(
    item_data: CatalogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new catalog item"""
    item = await create_catalog_item(db, item_data, current_user.id)
    return CatalogResponse.from_orm(item)

@router.get("/", response_model=List[CatalogResponse])
async def get_items_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all catalog items for current user"""
    items = await get_catalog_items(db, current_user.id)
    return [CatalogResponse.from_orm(item) for item in items]

@router.get("/{item_id}", response_model=CatalogResponse)
async def get_item_endpoint(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific catalog item"""
    item = await get_catalog_item(db, item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return CatalogResponse.from_orm(item)

@router.put("/{item_id}", response_model=CatalogResponse)
async def update_item_endpoint(
    item_id: int,
    item_update: CatalogUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a catalog item"""
    item = await update_catalog_item(db, item_id, current_user.id, item_update)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return CatalogResponse.from_orm(item)

@router.delete("/{item_id}")
async def delete_item_endpoint(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a catalog item"""
    success = await delete_catalog_item(db, item_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}


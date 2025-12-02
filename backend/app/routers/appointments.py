"""
Appointments Router
Handles appointment management and availability endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, time
import logging

from app.dependencies import get_current_user, get_db
from app.models import User
from app.schemas import (
    ServiceTypeCreate, ServiceTypeUpdate, ServiceTypeResponse,
    RecurringAvailabilityCreate, RecurringAvailabilityUpdate, RecurringAvailabilityResponse,
    AvailabilityExceptionCreate, AvailabilityExceptionUpdate, AvailabilityExceptionResponse,
    AppointmentCreate, AppointmentUpdate, AppointmentResponse,
    AvailabilitySlotsRequest, AvailabilitySlotsResponse, AvailabilitySlot
)
from app.crud_appointments import (
    create_service_type, get_service_types, get_service_type, update_service_type, delete_service_type,
    create_recurring_availability, get_recurring_availability, get_recurring_availability_by_id,
    update_recurring_availability, delete_recurring_availability,
    create_availability_exception, get_availability_exceptions, get_availability_exception_by_id,
    delete_availability_exception,
    create_appointment, get_appointments, get_appointment, update_appointment, cancel_appointment,
    get_available_slots, check_availability
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

# Service Types endpoints
@router.post("/service-types", response_model=ServiceTypeResponse)
async def create_service_type_endpoint(
    service_type_data: ServiceTypeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new service type"""
    service_type = await create_service_type(db, service_type_data, current_user.id)
    return ServiceTypeResponse.from_orm(service_type)

@router.get("/service-types", response_model=List[ServiceTypeResponse])
async def get_service_types_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all service types for current user"""
    service_types = await get_service_types(db, current_user.id)
    return [ServiceTypeResponse.from_orm(st) for st in service_types]

@router.get("/service-types/{service_type_id}", response_model=ServiceTypeResponse)
async def get_service_type_endpoint(
    service_type_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific service type"""
    service_type = await get_service_type(db, service_type_id, current_user.id)
    if not service_type:
        raise HTTPException(status_code=404, detail="Service type not found")
    return ServiceTypeResponse.from_orm(service_type)

@router.put("/service-types/{service_type_id}", response_model=ServiceTypeResponse)
async def update_service_type_endpoint(
    service_type_id: int,
    service_type_update: ServiceTypeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a service type"""
    service_type = await update_service_type(db, service_type_id, current_user.id, service_type_update)
    if not service_type:
        raise HTTPException(status_code=404, detail="Service type not found")
    return ServiceTypeResponse.from_orm(service_type)

@router.delete("/service-types/{service_type_id}")
async def delete_service_type_endpoint(
    service_type_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a service type"""
    success = await delete_service_type(db, service_type_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Service type not found")
    return {"message": "Service type deleted successfully"}

# Recurring Availability endpoints
@router.post("/availability/recurring", response_model=RecurringAvailabilityResponse)
async def create_recurring_availability_endpoint(
    availability_data: RecurringAvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new recurring availability"""
    try:
        availability = await create_recurring_availability(db, availability_data, current_user.id)
        # Convert Time objects to strings for response
        response_data = RecurringAvailabilityResponse(
            id=availability.id,
            owner_id=availability.owner_id,
            day_of_week=availability.day_of_week,
            start_time=availability.start_time.strftime("%H:%M") if isinstance(availability.start_time, time) else str(availability.start_time),
            end_time=availability.end_time.strftime("%H:%M") if isinstance(availability.end_time, time) else str(availability.end_time),
            slot_duration_minutes=availability.slot_duration_minutes,
            is_active=availability.is_active,
            created_at=availability.created_at,
            updated_at=availability.updated_at
        )
        return response_data
    except Exception as e:
        logger.error(f"Error creating recurring availability: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create recurring availability: {str(e)}"
        )

@router.get("/availability/recurring", response_model=List[RecurringAvailabilityResponse])
async def get_recurring_availability_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all recurring availability for current user"""
    try:
        availability_list = await get_recurring_availability(db, current_user.id)
        # Convert Time objects to strings for response
        result = []
        for a in availability_list:
            result.append(RecurringAvailabilityResponse(
                id=a.id,
                owner_id=a.owner_id,
                day_of_week=a.day_of_week,
                start_time=a.start_time.strftime("%H:%M") if isinstance(a.start_time, time) else str(a.start_time),
                end_time=a.end_time.strftime("%H:%M") if isinstance(a.end_time, time) else str(a.end_time),
                slot_duration_minutes=a.slot_duration_minutes,
                is_active=a.is_active,
                created_at=a.created_at,
                updated_at=a.updated_at
            ))
        return result
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting recurring availability: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recurring availability: {str(e)}"
        )

@router.put("/availability/recurring/{availability_id}", response_model=RecurringAvailabilityResponse)
async def update_recurring_availability_endpoint(
    availability_id: int,
    availability_update: RecurringAvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a recurring availability"""
    try:
        availability = await update_recurring_availability(db, availability_id, current_user.id, availability_update)
        if not availability:
            raise HTTPException(status_code=404, detail="Recurring availability not found")
        # Convert Time objects to strings for response
        response_data = RecurringAvailabilityResponse(
            id=availability.id,
            owner_id=availability.owner_id,
            day_of_week=availability.day_of_week,
            start_time=availability.start_time.strftime("%H:%M") if isinstance(availability.start_time, time) else str(availability.start_time),
            end_time=availability.end_time.strftime("%H:%M") if isinstance(availability.end_time, time) else str(availability.end_time),
            slot_duration_minutes=availability.slot_duration_minutes,
            is_active=availability.is_active,
            created_at=availability.created_at,
            updated_at=availability.updated_at
        )
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating recurring availability: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update recurring availability: {str(e)}"
        )

@router.delete("/availability/recurring/{availability_id}")
async def delete_recurring_availability_endpoint(
    availability_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a recurring availability"""
    success = await delete_recurring_availability(db, availability_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Recurring availability not found")
    return {"message": "Recurring availability deleted successfully"}

# Availability Exceptions endpoints
@router.post("/availability/exceptions", response_model=AvailabilityExceptionResponse)
async def create_availability_exception_endpoint(
    exception_data: AvailabilityExceptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new availability exception"""
    exception = await create_availability_exception(db, exception_data, current_user.id)
    return AvailabilityExceptionResponse.from_orm(exception)

@router.get("/availability/exceptions", response_model=List[AvailabilityExceptionResponse])
async def get_availability_exceptions_endpoint(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get availability exceptions for current user"""
    exceptions = await get_availability_exceptions(db, current_user.id, start_date, end_date)
    return [AvailabilityExceptionResponse.from_orm(e) for e in exceptions]

@router.delete("/availability/exceptions/{exception_id}")
async def delete_availability_exception_endpoint(
    exception_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an availability exception"""
    success = await delete_availability_exception(db, exception_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Availability exception not found")
    return {"message": "Availability exception deleted successfully"}

# Availability Slots endpoint
@router.post("/availability/slots", response_model=AvailabilitySlotsResponse)
async def get_availability_slots_endpoint(
    request: AvailabilitySlotsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get available time slots for a specific date"""
    slots = await get_available_slots(db, current_user.id, request.date, request.service_type_id)
    return AvailabilitySlotsResponse(
        slots=[AvailabilitySlot(datetime=slot, available=True) for slot in slots],
        date=request.date
    )

# Appointments endpoints
@router.post("/", response_model=AppointmentResponse)
async def create_appointment_endpoint(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new appointment"""
    # Validate that the slot is available
    duration_minutes = 30  # default
    if appointment_data.service_type_id:
        service_type = await get_service_type(db, appointment_data.service_type_id, current_user.id)
        if service_type:
            duration_minutes = service_type.duration_minutes
    
    if not await check_availability(db, current_user.id, appointment_data.scheduled_at, duration_minutes):
        raise HTTPException(
            status_code=400,
            detail="The requested time slot is not available"
        )
    
    appointment = await create_appointment(db, appointment_data, current_user.id)
    return AppointmentResponse.from_orm(appointment)

@router.get("/", response_model=List[AppointmentResponse])
async def get_appointments_endpoint(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get appointments for current user"""
    appointments = await get_appointments(db, current_user.id, start_date, end_date, status)
    return [AppointmentResponse.from_orm(a) for a in appointments]

@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment_endpoint(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific appointment"""
    appointment = await get_appointment(db, appointment_id, current_user.id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return AppointmentResponse.from_orm(appointment)

@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment_endpoint(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an appointment"""
    # If scheduled_at is being updated, check availability
    if appointment_update.scheduled_at:
        duration_minutes = 30  # default
        existing_appointment = await get_appointment(db, appointment_id, current_user.id)
        if existing_appointment and existing_appointment.service_type_id:
            service_type = await get_service_type(db, existing_appointment.service_type_id, current_user.id)
            if service_type:
                duration_minutes = service_type.duration_minutes
        
        if not await check_availability(db, current_user.id, appointment_update.scheduled_at, duration_minutes, exclude_appointment_id=appointment_id):
            raise HTTPException(
                status_code=400,
                detail="The requested time slot is not available"
            )
    
    appointment = await update_appointment(db, appointment_id, current_user.id, appointment_update)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return AppointmentResponse.from_orm(appointment)

@router.delete("/{appointment_id}")
async def cancel_appointment_endpoint(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an appointment"""
    appointment = await cancel_appointment(db, appointment_id, current_user.id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment cancelled successfully"}


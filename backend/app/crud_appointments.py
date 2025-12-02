"""
Appointments CRUD Operations
Handles all database operations for appointments, availability, and service types
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, func, Time, Integer, Interval
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, date, time, timedelta
import json
import logging

from app.models import (
    ServiceType, RecurringAvailability, AvailabilityException, 
    Appointment, Contact
)
from app.schemas import (
    ServiceTypeCreate, ServiceTypeUpdate,
    RecurringAvailabilityCreate, RecurringAvailabilityUpdate,
    AvailabilityExceptionCreate, AvailabilityExceptionUpdate,
    AppointmentCreate, AppointmentUpdate
)

logger = logging.getLogger(__name__)

# ServiceType CRUD
async def create_service_type(db: AsyncSession, service_type: ServiceTypeCreate, owner_id: int) -> ServiceType:
    """Create a new service type"""
    db_service_type = ServiceType(**service_type.dict(), owner_id=owner_id)
    db.add(db_service_type)
    await db.commit()
    await db.refresh(db_service_type)
    return db_service_type

async def get_service_types(db: AsyncSession, owner_id: int) -> List[ServiceType]:
    """Get all service types for an owner"""
    result = await db.execute(
        select(ServiceType).where(ServiceType.owner_id == owner_id)
    )
    return result.scalars().all()

async def get_service_type(db: AsyncSession, service_type_id: int, owner_id: int) -> Optional[ServiceType]:
    """Get a specific service type"""
    result = await db.execute(
        select(ServiceType).where(
            and_(ServiceType.id == service_type_id, ServiceType.owner_id == owner_id)
        )
    )
    return result.scalar_one_or_none()

async def update_service_type(
    db: AsyncSession, 
    service_type_id: int, 
    owner_id: int, 
    service_type_update: ServiceTypeUpdate
) -> Optional[ServiceType]:
    """Update a service type"""
    update_data = service_type_update.dict(exclude_unset=True)
    if not update_data:
        return await get_service_type(db, service_type_id, owner_id)
    
    await db.execute(
        update(ServiceType)
        .where(and_(ServiceType.id == service_type_id, ServiceType.owner_id == owner_id))
        .values(**update_data)
    )
    await db.commit()
    return await get_service_type(db, service_type_id, owner_id)

async def delete_service_type(db: AsyncSession, service_type_id: int, owner_id: int) -> bool:
    """Delete a service type"""
    result = await db.execute(
        delete(ServiceType).where(
            and_(ServiceType.id == service_type_id, ServiceType.owner_id == owner_id)
        )
    )
    await db.commit()
    return result.rowcount > 0

# RecurringAvailability CRUD
async def create_recurring_availability(
    db: AsyncSession, 
    availability: RecurringAvailabilityCreate, 
    owner_id: int
) -> RecurringAvailability:
    """Create a new recurring availability"""
    # Parse time strings to Time objects
    start_time_obj = datetime.strptime(availability.start_time, "%H:%M").time()
    end_time_obj = datetime.strptime(availability.end_time, "%H:%M").time()
    
    db_availability = RecurringAvailability(
        owner_id=owner_id,
        day_of_week=availability.day_of_week,
        start_time=start_time_obj,
        end_time=end_time_obj,
        slot_duration_minutes=availability.slot_duration_minutes,
        is_active=availability.is_active
    )
    db.add(db_availability)
    await db.commit()
    await db.refresh(db_availability)
    return db_availability

async def get_recurring_availability(db: AsyncSession, owner_id: int) -> List[RecurringAvailability]:
    """Get all recurring availability for an owner"""
    result = await db.execute(
        select(RecurringAvailability).where(RecurringAvailability.owner_id == owner_id)
    )
    return result.scalars().all()

async def get_recurring_availability_by_id(
    db: AsyncSession, 
    availability_id: int, 
    owner_id: int
) -> Optional[RecurringAvailability]:
    """Get a specific recurring availability"""
    result = await db.execute(
        select(RecurringAvailability).where(
            and_(
                RecurringAvailability.id == availability_id,
                RecurringAvailability.owner_id == owner_id
            )
        )
    )
    return result.scalar_one_or_none()

async def update_recurring_availability(
    db: AsyncSession,
    availability_id: int,
    owner_id: int,
    availability_update: RecurringAvailabilityUpdate
) -> Optional[RecurringAvailability]:
    """Update a recurring availability"""
    update_data = availability_update.dict(exclude_unset=True)
    
    # Parse time strings if provided
    if 'start_time' in update_data:
        update_data['start_time'] = datetime.strptime(update_data['start_time'], "%H:%M").time()
    if 'end_time' in update_data:
        update_data['end_time'] = datetime.strptime(update_data['end_time'], "%H:%M").time()
    
    if not update_data:
        return await get_recurring_availability_by_id(db, availability_id, owner_id)
    
    await db.execute(
        update(RecurringAvailability)
        .where(
            and_(
                RecurringAvailability.id == availability_id,
                RecurringAvailability.owner_id == owner_id
            )
        )
        .values(**update_data)
    )
    await db.commit()
    return await get_recurring_availability_by_id(db, availability_id, owner_id)

async def delete_recurring_availability(db: AsyncSession, availability_id: int, owner_id: int) -> bool:
    """Delete a recurring availability"""
    result = await db.execute(
        delete(RecurringAvailability).where(
            and_(
                RecurringAvailability.id == availability_id,
                RecurringAvailability.owner_id == owner_id
            )
        )
    )
    await db.commit()
    return result.rowcount > 0

# AvailabilityException CRUD
async def create_availability_exception(
    db: AsyncSession,
    exception: AvailabilityExceptionCreate,
    owner_id: int
) -> AvailabilityException:
    """Create a new availability exception"""
    db_exception = AvailabilityException(
        owner_id=owner_id,
        date=exception.date,
        is_blocked=exception.is_blocked,
        custom_slots=exception.custom_slots
    )
    db.add(db_exception)
    await db.commit()
    await db.refresh(db_exception)
    return db_exception

async def get_availability_exceptions(
    db: AsyncSession,
    owner_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[AvailabilityException]:
    """Get availability exceptions for an owner, optionally filtered by date range"""
    query = select(AvailabilityException).where(AvailabilityException.owner_id == owner_id)
    
    if start_date:
        query = query.where(AvailabilityException.date >= start_date)
    if end_date:
        query = query.where(AvailabilityException.date <= end_date)
    
    result = await db.execute(query)
    return result.scalars().all()

async def get_availability_exception_by_id(
    db: AsyncSession,
    exception_id: int,
    owner_id: int
) -> Optional[AvailabilityException]:
    """Get a specific availability exception"""
    result = await db.execute(
        select(AvailabilityException).where(
            and_(
                AvailabilityException.id == exception_id,
                AvailabilityException.owner_id == owner_id
            )
        )
    )
    return result.scalar_one_or_none()

async def delete_availability_exception(db: AsyncSession, exception_id: int, owner_id: int) -> bool:
    """Delete an availability exception"""
    result = await db.execute(
        delete(AvailabilityException).where(
            and_(
                AvailabilityException.id == exception_id,
                AvailabilityException.owner_id == owner_id
            )
        )
    )
    await db.commit()
    return result.rowcount > 0

# Appointment CRUD
async def create_appointment(
    db: AsyncSession,
    appointment: AppointmentCreate,
    owner_id: int
) -> Appointment:
    """Create a new appointment"""
    db_appointment = Appointment(
        owner_id=owner_id,
        contact_id=appointment.contact_id,
        service_type_id=appointment.service_type_id,
        scheduled_at=appointment.scheduled_at,
        status=appointment.status,
        notes=appointment.notes
    )
    db.add(db_appointment)
    await db.commit()
    await db.refresh(db_appointment)
    return db_appointment

async def get_appointments(
    db: AsyncSession,
    owner_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None
) -> List[Appointment]:
    """Get appointments for an owner, optionally filtered by date range and status"""
    query = select(Appointment).where(Appointment.owner_id == owner_id)
    
    if start_date:
        query = query.where(Appointment.scheduled_at >= start_date)
    if end_date:
        query = query.where(Appointment.scheduled_at <= end_date)
    if status:
        query = query.where(Appointment.status == status)
    
    query = query.order_by(Appointment.scheduled_at)
    result = await db.execute(query)
    return result.scalars().all()

async def get_appointments_by_contact(
    db: AsyncSession,
    contact_id: int,
    owner_id: int,
    status: Optional[str] = None,
    include_cancelled: bool = False
) -> List[Appointment]:
    """
    Get appointments for a specific contact
    
    Args:
        db: Database session
        contact_id: Contact ID
        owner_id: Owner ID
        status: Optional status filter (if None, returns active appointments by default)
        include_cancelled: If True, includes cancelled appointments when status is None
    """
    query = select(Appointment).where(
        and_(
            Appointment.contact_id == contact_id,
            Appointment.owner_id == owner_id
        )
    )
    
    if status:
        query = query.where(Appointment.status == status)
    elif not include_cancelled:
        # By default, exclude cancelled appointments
        query = query.where(Appointment.status != "cancelled")
    
    query = query.order_by(Appointment.scheduled_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

async def get_appointment(
    db: AsyncSession,
    appointment_id: int,
    owner_id: int
) -> Optional[Appointment]:
    """Get a specific appointment"""
    result = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.id == appointment_id,
                Appointment.owner_id == owner_id
            )
        )
    )
    return result.scalar_one_or_none()

async def update_appointment(
    db: AsyncSession,
    appointment_id: int,
    owner_id: int,
    appointment_update: AppointmentUpdate
) -> Optional[Appointment]:
    """Update an appointment"""
    update_data = appointment_update.dict(exclude_unset=True)
    if not update_data:
        return await get_appointment(db, appointment_id, owner_id)
    
    await db.execute(
        update(Appointment)
        .where(
            and_(
                Appointment.id == appointment_id,
                Appointment.owner_id == owner_id
            )
        )
        .values(**update_data)
    )
    await db.commit()
    return await get_appointment(db, appointment_id, owner_id)

async def cancel_appointment(db: AsyncSession, appointment_id: int, owner_id: int) -> Optional[Appointment]:
    """Cancel an appointment"""
    await db.execute(
        update(Appointment)
        .where(
            and_(
                Appointment.id == appointment_id,
                Appointment.owner_id == owner_id
            )
        )
        .values(status="cancelled")
    )
    await db.commit()
    return await get_appointment(db, appointment_id, owner_id)

# Availability checking functions
async def get_available_slots(
    db: AsyncSession,
    owner_id: int,
    target_date: datetime,
    service_type_id: Optional[int] = None
) -> List[datetime]:
    """
    Get available time slots for a specific date.
    Returns a list of datetime objects representing available slots.
    """
    try:
        # Get the date part (without time)
        # Handle both timezone-aware and naive datetimes
        if hasattr(target_date, 'date'):
            target_date_only = target_date.date()
        else:
            # If it's a string, try to parse
            if isinstance(target_date, str):
                target_date = datetime.fromisoformat(target_date)
            target_date_only = target_date.date()
        
        day_of_week = target_date_only.weekday()  # 0=Monday, 6=Sunday
        
        # Get recurring availability for this day of week
            select(RecurringAvailability).where(
                and_(
                    RecurringAvailability.owner_id == owner_id,
                    RecurringAvailability.day_of_week == day_of_week,
                    RecurringAvailability.is_active == True
                )
            )
        )
        recurring_list = recurring.scalars().all()
        
        # Check for exceptions for this specific date
        exception = await db.execute(
            select(AvailabilityException).where(
                and_(
                    AvailabilityException.owner_id == owner_id,
                    func.date(AvailabilityException.date) == target_date_only
                )
            )
        )
        exception_obj = exception.scalar_one_or_none()
        
        # If day is blocked, return empty list
        if exception_obj and exception_obj.is_blocked:
            return []
        
        # If custom slots are defined, use those
        if exception_obj and exception_obj.custom_slots:
            try:
                custom_slots_data = json.loads(exception_obj.custom_slots)
                slots = []
                from datetime import timezone
                now = datetime.now(timezone.utc)
                for slot_time_str in custom_slots_data.get('times', []):
                    slot_time = datetime.strptime(slot_time_str, "%H:%M").time()
                    slot_datetime = datetime.combine(target_date_only, slot_time)
                    # Make timezone-aware
                    if slot_datetime.tzinfo is None:
                        slot_datetime = slot_datetime.replace(tzinfo=timezone.utc)
                    if slot_datetime >= now:
                        slots.append(slot_datetime)
                return sorted(slots)
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Error parsing custom slots: {e}")
        
        # Generate slots from recurring availability
        slots = []
        if not recurring_list:
            # No recurring availability configured for this day
            logger.info(f"No recurring availability configured for day {day_of_week} (owner_id={owner_id})")
            return []
        
        for rec in recurring_list:
            # Get service duration (default to slot_duration_minutes)
            duration_minutes = rec.slot_duration_minutes
            if service_type_id:
                service_type = await get_service_type(db, service_type_id, owner_id)
                if service_type:
                    duration_minutes = service_type.duration_minutes
            
            # Generate slots for this recurring availability
            from datetime import timezone
            now = datetime.now(timezone.utc)
            current_time = rec.start_time
            while current_time < rec.end_time:
                slot_datetime = datetime.combine(target_date_only, current_time)
                # Make timezone-aware
                if slot_datetime.tzinfo is None:
                    slot_datetime = slot_datetime.replace(tzinfo=timezone.utc)
                
                # Only include future slots
                if slot_datetime >= now:
                    # Check if this slot conflicts with existing appointments
                    if await check_availability(db, owner_id, slot_datetime, duration_minutes):
                        slots.append(slot_datetime)
                
                # Move to next slot
                current_time = (datetime.combine(date.today(), current_time) + timedelta(minutes=duration_minutes)).time()
        
        return sorted(slots)
    except Exception as e:
        logger.error(f"Error in get_available_slots: {e}", exc_info=True)
        return []  # Return empty list on error

async def check_availability(
    db: AsyncSession,
    owner_id: int,
    slot_datetime: datetime,
    duration_minutes: int,
    exclude_appointment_id: Optional[int] = None
) -> bool:
    """
    Check if a specific time slot is available.
    Returns True if available, False if not.
    
    Args:
        db: Database session
        owner_id: Owner ID
        slot_datetime: The datetime to check
        duration_minutes: Duration of the slot in minutes
        exclude_appointment_id: Optional appointment ID to exclude from conflict check (useful when modifying)
    """
    # Check if slot is in the past
    # Make sure both datetimes are timezone-aware for comparison
    now = datetime.now(slot_datetime.tzinfo) if slot_datetime.tzinfo else datetime.now()
    if slot_datetime < now:
        return False
    
    # Check for conflicting appointments
    # Get all active appointments for this owner
    query = select(Appointment).where(
        and_(
            Appointment.owner_id == owner_id,
            Appointment.status.in_(["pending", "confirmed"]),
            func.date(Appointment.scheduled_at) == slot_datetime.date()
        )
    )
    
    # Exclude the appointment being modified if provided
    if exclude_appointment_id:
        query = query.where(Appointment.id != exclude_appointment_id)
    
    appointments = await db.execute(query)
    appointments_list = appointments.scalars().all()
    
    end_datetime = slot_datetime + timedelta(minutes=duration_minutes)
    
    for appointment in appointments_list:
        # Get appointment duration
        appointment_duration = 30  # default
        if appointment.service_type_id:
            service_type = await get_service_type(db, appointment.service_type_id, owner_id)
            if service_type:
                appointment_duration = service_type.duration_minutes
        
        appointment_end = appointment.scheduled_at + timedelta(minutes=appointment_duration)
        
        # Check for overlap
        # Ensure timezone compatibility - convert to UTC if needed
        slot_dt = slot_datetime
        end_dt = end_datetime
        apt_start = appointment.scheduled_at
        apt_end = appointment_end
        
        # Normalize to UTC for comparison if timezones differ
        from datetime import timezone
        if slot_dt.tzinfo is None:
            slot_dt = slot_dt.replace(tzinfo=timezone.utc)
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
        if apt_start.tzinfo is None:
            apt_start = apt_start.replace(tzinfo=timezone.utc)
        if apt_end.tzinfo is None:
            apt_end = apt_end.replace(tzinfo=timezone.utc)
        
        # Check for overlap
        if (apt_start < end_dt and apt_end > slot_dt):
            return False
    
    # Check if slot is within recurring availability
    day_of_week = slot_datetime.weekday()
    slot_time = slot_datetime.time()
    
    recurring = await db.execute(
        select(RecurringAvailability).where(
            and_(
                RecurringAvailability.owner_id == owner_id,
                RecurringAvailability.day_of_week == day_of_week,
                RecurringAvailability.is_active == True,
                RecurringAvailability.start_time <= slot_time,
                RecurringAvailability.end_time > slot_time
            )
        )
    )
    
    if not recurring.scalar_one_or_none():
        return False
    
    # Check for exceptions
    target_date = slot_datetime.date()
    exception = await db.execute(
        select(AvailabilityException).where(
            and_(
                AvailabilityException.owner_id == owner_id,
                func.date(AvailabilityException.date) == target_date
            )
        )
    )
    exception_obj = exception.scalar_one_or_none()
    
    if exception_obj and exception_obj.is_blocked:
        return False
    
    return True


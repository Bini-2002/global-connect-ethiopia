from __future__ import annotations

from typing import Any, TypedDict


class FeatureDefinition(TypedDict):
    name: str
    label: str
    type: str  # "number", "boolean", "text", "select"
    options: list[str] | None  # For "select" type
    unit: str | None  # e.g., "Rooms", "Mbps", "ETB"


VENDOR_CATEGORIES: dict[str, list[FeatureDefinition]] = {
    "Hotel & Accommodation": [
        {"name": "star_rating", "label": "Star Rating", "type": "number", "options": None, "unit": "Stars"},
        {"name": "room_capacity", "label": "Max Room Capacity", "type": "number", "options": None, "unit": "People"},
        {"name": "hall_size", "label": "Conference Hall Size", "type": "number", "options": None, "unit": "sqm"},
        {"name": "bed_count", "label": "Total Bed Count", "type": "number", "options": None, "unit": "Beds"},
        {"name": "has_pool", "label": "Swimming Pool", "type": "boolean", "options": None, "unit": None},
        {"name": "has_gym", "label": "Gym Access", "type": "boolean", "options": None, "unit": None},
        {"name": "parking_spots", "label": "Parking Capacity", "type": "number", "options": None, "unit": "Cars"},
    ],
    "Venue & Convention Centers": [
        {"name": "seating_capacity", "label": "Max Seating Capacity", "type": "number", "options": None, "unit": "People"},
        {"name": "breakout_rooms", "label": "Breakout Rooms", "type": "number", "options": None, "unit": "Rooms"},
        {"name": "parking_capacity", "label": "Parking Capacity", "type": "number", "options": None, "unit": "Cars"},
        {"name": "wifi_speed", "label": "WiFi Bandwidth", "type": "number", "options": None, "unit": "Mbps"},
        {"name": "has_outdoor_space", "label": "Outdoor Space", "type": "boolean", "options": None, "unit": None},
        {"name": "is_ada_accessible", "label": "ADA Accessible", "type": "boolean", "options": None, "unit": None},
    ],
    "Catering & Food Services": [
        {"name": "cuisine_type", "label": "Cuisine Type", "type": "select", "options": ["Ethiopian", "International", "Fusion", "Continental"], "unit": None},
        {"name": "service_style", "label": "Service Style", "type": "select", "options": ["Buffet", "Plated", "Finger Food"], "unit": None},
        {"name": "dietary_options", "label": "Dietary Options", "type": "select", "options": ["Vegan", "Halal", "Gluten-Free", "Standard"], "unit": None},
        {"name": "max_serving", "label": "Max Serving Capacity", "type": "number", "options": None, "unit": "People"},
        {"name": "has_beverage_license", "label": "Beverage License", "type": "boolean", "options": None, "unit": None},
        {"name": "provides_equipment", "label": "Provides Equipment", "type": "boolean", "options": None, "unit": None},
    ],
    "Audio / Visual & Production": [
        {"name": "screen_type", "label": "Screen Type", "type": "select", "options": ["LED Wall", "Projector", "LCD TV"], "unit": None},
        {"name": "sound_wattage", "label": "Sound System Wattage", "type": "number", "options": None, "unit": "Watts"},
        {"name": "has_streaming", "label": "Live Streaming Support", "type": "boolean", "options": None, "unit": None},
        {"name": "lighting_kit", "label": "Lighting Kits", "type": "select", "options": ["Basic", "Professional", "Concert Grade"], "unit": None},
        {"name": "has_translation", "label": "Translation Support", "type": "boolean", "options": None, "unit": None},
        {"name": "has_technician", "label": "On-site Technician", "type": "boolean", "options": None, "unit": None},
    ],
    "Photography & Videography": [
        {"name": "resolution", "label": "Max Resolution", "type": "select", "options": ["HD", "4K", "8K"], "unit": None},
        {"name": "has_drone", "label": "Drone Coverage", "type": "boolean", "options": None, "unit": None},
        {"name": "crew_size", "label": "Crew Size", "type": "number", "options": None, "unit": "People"},
        {"name": "turnaround_days", "label": "Turnaround Time", "type": "number", "options": None, "unit": "Days"},
        {"name": "has_360_booth", "label": "360 Photo Booth", "type": "boolean", "options": None, "unit": None},
    ],
    "Security & Safety": [
        {"name": "personnel_type", "label": "Personnel Type", "type": "select", "options": ["Uniformed", "Plainclothes", "Both"], "unit": None},
        {"name": "has_vip_protection", "label": "VIP Protection", "type": "boolean", "options": None, "unit": None},
        {"name": "has_surveillance", "label": "Electronic Surveillance", "type": "boolean", "options": None, "unit": None},
        {"name": "is_first_aid_certified", "label": "First Aid Certified", "type": "boolean", "options": None, "unit": None},
        {"name": "max_personnel", "label": "Max Personnel", "type": "number", "options": None, "unit": "Guards"},
    ],
    "Decor & Event Styling": [
        {"name": "style_focus", "label": "Style Focus", "type": "select", "options": ["Traditional", "Modern", "Minimalist", "Luxury"], "unit": None},
        {"name": "has_floral", "label": "Floral Services", "type": "boolean", "options": None, "unit": None},
        {"name": "has_furniture", "label": "Furniture Rental", "type": "boolean", "options": None, "unit": None},
        {"name": "has_setup_service", "label": "Setup/Teardown Included", "type": "boolean", "options": None, "unit": None},
        {"name": "lighting_design", "label": "Lighting Design", "type": "boolean", "options": None, "unit": None},
    ],
    "Transportation & Logistics": [
        {"name": "vehicle_types", "label": "Vehicle Types", "type": "select", "options": ["VIP Sedan", "Mini Bus", "Large Bus", "Van"], "unit": None},
        {"name": "is_bilingual_driver", "label": "Bilingual Driver", "type": "boolean", "options": None, "unit": None},
        {"name": "has_gps", "label": "GPS Tracking", "type": "boolean", "options": None, "unit": None},
        {"name": "has_airport_transfer", "label": "Airport Transfer", "type": "boolean", "options": None, "unit": None},
        {"name": "has_cargo_transport", "label": "Cargo Transport", "type": "boolean", "options": None, "unit": None},
    ],
    "IT & Software Solutions": [
        {"name": "has_event_app", "label": "Event App Support", "type": "boolean", "options": None, "unit": None},
        {"name": "has_rfid_registration", "label": "RFID/QR Registration", "type": "boolean", "options": None, "unit": None},
        {"name": "wifi_support_level", "label": "WiFi Support Level", "type": "select", "options": ["Basic", "High-Density", "Enterprise"], "unit": None},
        {"name": "has_hybrid_support", "label": "Hybrid Event Support", "type": "boolean", "options": None, "unit": None},
        {"name": "has_lead_retrieval", "label": "Lead Retrieval Tools", "type": "boolean", "options": None, "unit": None},
    ],
    "Entertainment & Performers": [
        {"name": "genre", "label": "Genre", "type": "select", "options": ["Live Band", "DJ", "Traditional Dance", "Solo Artist"], "unit": None},
        {"name": "performance_duration", "label": "Max Duration", "type": "number", "options": None, "unit": "Hours"},
        {"name": "has_sound_rental", "label": "Sound Rental Included", "type": "boolean", "options": None, "unit": None},
        {"name": "has_mc", "label": "MC/Host Service", "type": "boolean", "options": None, "unit": None},
        {"name": "rehearsal_available", "label": "Rehearsal Available", "type": "boolean", "options": None, "unit": None},
    ],
}

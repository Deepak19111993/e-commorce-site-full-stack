'use client';

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in Next.js/webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ParkingMapProps {
    availableSlots: number[];
    hasChecked: boolean;
    onBookSlot: (slotId: number) => void;
}

// Simulate parking lot layout — 20 slots in a realistic grid
// Center: ~28.6139°N, 77.2090°E (New Delhi area)
const PARKING_CENTER: [number, number] = [28.6139, 77.2090];

const SLOT_POSITIONS: { id: number; lat: number; lng: number; row: string }[] = (() => {
    const slots: { id: number; lat: number; lng: number; row: string }[] = [];
    const rows = ['A', 'B', 'C', 'D'];
    let id = 1;
    for (let r = 0; r < rows.length; r++) {
        const slotsInRow = r < 2 ? 5 : 5;
        for (let c = 0; c < slotsInRow; c++) {
            slots.push({
                id,
                lat: PARKING_CENTER[0] + (r - 1.5) * 0.00015,
                lng: PARKING_CENTER[1] + (c - 2) * 0.00018,
                row: rows[r],
            });
            id++;
        }
    }
    return slots;
})();

const createSlotIcon = (available: boolean) => {
    const color = available ? '#10b981' : '#ef4444';
    const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="30" height="40">
            <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="18" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="sans-serif">P</text>
        </svg>
    `;
    return L.divIcon({
        html: svgIcon,
        className: '',
        iconSize: [30, 40],
        iconAnchor: [15, 40],
        popupAnchor: [0, -36],
    });
};

export default function ParkingMap({ availableSlots, hasChecked, onBookSlot }: ParkingMapProps) {
    const slotIcons = useMemo(() => {
        return SLOT_POSITIONS.map(slot => ({
            ...slot,
            isAvailable: hasChecked ? availableSlots.includes(slot.id) : true,
        }));
    }, [availableSlots, hasChecked]);

    return (
        <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: 400 }}>
            <MapContainer
                center={PARKING_CENTER}
                zoom={18}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {slotIcons.map(slot => (
                    <Marker
                        key={slot.id}
                        position={[slot.lat, slot.lng]}
                        icon={createSlotIcon(slot.isAvailable)}
                    >
                        <Popup>
                            <div className="text-center min-w-[120px]">
                                <p className="text-sm font-bold text-gray-900 mb-1">Slot P-{slot.id}</p>
                                <p className="text-[10px] uppercase font-bold tracking-wider mb-2" style={{ color: slot.isAvailable ? '#10b981' : '#ef4444' }}>
                                    Row {slot.row} • {slot.isAvailable ? 'Available' : 'Booked'}
                                </p>
                                {slot.isAvailable && (
                                    <button
                                        onClick={() => onBookSlot(slot.id)}
                                        className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                                    >
                                        Book This Slot
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-md px-3 py-2 flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Booked</span>
                </div>
            </div>
        </div>
    );
}

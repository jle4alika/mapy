import { create } from 'zustand';

import type { Place } from '../../entities/types';

type FocusRequest = {
  lat: number;
  lon: number;
  zoom?: number;
  /** Если задан — карта включает слежение за другом */
  followUserId?: string;
  nonce: number;
};

type MapUiState = {
  selectedPlace: Place | null;
  searchQuery: string;
  placesSnapshot: Place[];
  focusRequest: FocusRequest | null;
  panelCollapsed: boolean;
  placeTypeFilter: string | null;
  setSelectedPlace: (place: Place | null) => void;
  setSearchQuery: (q: string) => void;
  setPlacesSnapshot: (places: Place[]) => void;
  requestFocus: (lat: number, lon: number, zoom?: number, followUserId?: string) => void;
  consumeFocus: () => void;
  setPanelCollapsed: (collapsed: boolean) => void;
  togglePanelCollapsed: () => void;
  setPlaceTypeFilter: (type: string | null) => void;
};

export const useMapUiStore = create<MapUiState>((set, get) => ({
  selectedPlace: null,
  searchQuery: '',
  placesSnapshot: [],
  focusRequest: null,
  panelCollapsed: false,
  placeTypeFilter: null,
  setSelectedPlace: (place) => set({ selectedPlace: place }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setPlacesSnapshot: (placesSnapshot) => {
    const prev = get().placesSnapshot;
    if (
      prev.length === placesSnapshot.length &&
      prev.every((p, i) => p.id === placesSnapshot[i]?.id)
    ) {
      return;
    }
    set({ placesSnapshot });
  },
  requestFocus: (lat, lon, zoom, followUserId) =>
    set({
      focusRequest: {
        lat,
        lon,
        zoom,
        followUserId,
        nonce: (get().focusRequest?.nonce ?? 0) + 1,
      },
    }),
  consumeFocus: () => set({ focusRequest: null }),
  setPanelCollapsed: (panelCollapsed) => set({ panelCollapsed }),
  togglePanelCollapsed: () => set({ panelCollapsed: !get().panelCollapsed }),
  setPlaceTypeFilter: (placeTypeFilter) => set({ placeTypeFilter }),
}));

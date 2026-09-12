import { create } from 'zustand';

type MapCameraState = {
  center: { lat: number; lon: number };
  zoom: number;
  setCenter: (lat: number, lon: number) => void;
  setZoom: (zoom: number) => void;
  setCamera: (lat: number, lon: number, zoom?: number) => void;
};

export const useMapCameraStore = create<MapCameraState>((set) => ({
  center: { lat: 55.751244, lon: 37.618423 },
  zoom: 13.5,
  setCenter: (lat, lon) => set({ center: { lat, lon } }),
  setZoom: (zoom) => set({ zoom }),
  setCamera: (lat, lon, zoom) =>
    set((s) => ({ center: { lat, lon }, zoom: zoom ?? s.zoom })),
}));

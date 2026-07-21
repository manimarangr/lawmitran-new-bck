import type { Metadata } from 'next';
import { MapSearchPage } from '../_components/MapSearchPage';

export const metadata: Metadata = {
  title: 'Find a Lawyer — Map View — LawMitran',
  description: 'Browse verified lawyers in India on an interactive map — filter by city, practice area, and more.',
};

export default function LawyersMapPage() {
  return <MapSearchPage />;
}

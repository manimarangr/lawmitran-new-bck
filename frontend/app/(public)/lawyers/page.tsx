import type { Metadata } from 'next';
import { LawyerSearchPage } from './_components/LawyerSearchPage';

export const metadata: Metadata = {
  title: 'Find a Lawyer — LawMitran',
  description: 'Search verified lawyers in India by city, practice area, language, and more.',
};

export default function LawyersPage() {
  return <LawyerSearchPage />;
}

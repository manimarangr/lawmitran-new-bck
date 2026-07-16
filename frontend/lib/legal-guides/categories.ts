/**
 * Legal Guides taxonomy. A controlled list of categories; each guide references
 * a category by `slug`. Icons use the existing Icon set (unknown names render
 * nothing, so they are safe).
 */
export interface GuideCategory {
  slug: string;
  name: string;
  icon: string;
  description: string;
}

export const CATEGORIES: GuideCategory[] = [
  { slug: 'property-real-estate', name: 'Property & Real Estate', icon: 'key', description: 'Buying, selling, renting, and registering property in India.' },
  { slug: 'consumer-rights', name: 'Consumer Rights', icon: 'tags', description: 'Refunds, defective goods, deficient services, and consumer complaints.' },
  { slug: 'family-law', name: 'Family Law', icon: 'users', description: 'Marriage, divorce, maintenance, custody, and succession.' },
  { slug: 'criminal-law', name: 'Criminal Law', icon: 'gavel', description: 'FIRs, bail, complaints, and criminal court procedure.' },
  { slug: 'employment', name: 'Employment', icon: 'briefcase', description: 'Salary dues, termination, and workplace rights.' },
  { slug: 'business-startup', name: 'Business & Startup', icon: 'bolt', description: 'Company registration, agreements, and compliance.' },
  { slug: 'banking-finance', name: 'Banking & Finance', icon: 'star', description: 'Cheque bounce, loans, and banking disputes.' },
  { slug: 'cyber-crime', name: 'Cyber Crime', icon: 'lock', description: 'Online fraud, UPI scams, and reporting cyber crime.' },
  { slug: 'motor-vehicle', name: 'Motor Vehicle', icon: 'bell', description: 'Accident claims, insurance, challans, and licences.' },
  { slug: 'tax-gst', name: 'Tax & GST', icon: 'sliders', description: 'GST registration, income tax basics, and compliance.' },
  { slug: 'senior-citizen-rights', name: 'Senior Citizen Rights', icon: 'user', description: 'Maintenance, property, and protections for the elderly.' },
  { slug: 'women-rights', name: 'Women Rights', icon: 'flag', description: 'Protection from violence, workplace safety, and equality.' },
  { slug: 'government-services', name: 'Government Services', icon: 'gear', description: 'RTI, certificates, and dealing with public authorities.' },
  { slug: 'court-procedures', name: 'Court Procedures', icon: 'pen', description: 'Legal notices, filings, and how cases proceed.' },
];

export const categorySlugs = (): string[] => CATEGORIES.map((c) => c.slug);
export const getCategory = (slug: string): GuideCategory | undefined =>
  CATEGORIES.find((c) => c.slug === slug);
export const categoryName = (slug: string): string => getCategory(slug)?.name ?? slug;

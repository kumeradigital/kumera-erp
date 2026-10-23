export type BusinessProfile = {
  id: string;
  name: string;
  legalName: string;
  rut: string;
  businessActivity: string;
  address: string;
  commune: string;
  city: string;
  contactEmail: string;
  phone: string;
  currency: string;
  timezone: string;
  administratorName: string;
  administratorEmail: string;
  openingStatus?: "open" | "closed";
  openingClosedAt?: string;
};

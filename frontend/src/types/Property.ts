export interface Property {
  id?: number;
  title: string;
  description: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: PropertyType;
  status: PropertyStatus;
  // Backend required fields
  listingType: ListingType; // not null in backend
  priceType?: PriceType;    // required depending on listingType (MONTHLY for RENT, ONE_TIME for SALE)
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  owner?: { id: number } | null;
  createdAt?: string;
  updatedAt?: string;
}

export enum PropertyType {
  HOUSE = 'HOUSE',
  APARTMENT = 'APARTMENT',
  CONDO = 'CONDO',
  TOWNHOUSE = 'TOWNHOUSE',
  VILLA = 'VILLA',
  LAND = 'LAND'
}

export enum PropertyStatus {
  FOR_SALE = 'FOR_SALE',
  FOR_RENT = 'FOR_RENT',
  SOLD = 'SOLD',
  RENTED = 'RENTED'
}

export enum ListingType {
  SALE = 'SALE',
  RENT = 'RENT',
  PG = 'PG'
}

export enum PriceType {
  ONE_TIME = 'ONE_TIME',
  MONTHLY = 'MONTHLY'
}

export interface PropertyFilters {
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  state?: string;
  propertyType?: PropertyType;
  status?: PropertyStatus;
  minBedrooms?: number;
  minBathrooms?: number;
  keyword?: string;
}

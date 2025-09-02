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
  imageUrl?: string;
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

export interface PropertyFilters {
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  propertyType?: PropertyType;
  status?: PropertyStatus;
  minBedrooms?: number;
  minBathrooms?: number;
  keyword?: string;
}

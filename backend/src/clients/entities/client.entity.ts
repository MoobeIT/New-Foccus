export interface Client {
  id: string;
  tenantId: string;
  userId: string; // Owner (photographer)
  name: string;
  email: string;
  phone?: string;
  type: 'individual' | 'business';
  status: 'active' | 'inactive';
  
  // Important dates
  birthday?: Date;
  weddingAnniversary?: Date;
  customDates?: { name: string; date: Date }[];
  
  // Stats
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: Date;
  
  // Notes
  notes?: string;
  tags?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientOrder {
  id: string;
  clientId: string;
  productName: string;
  status: string;
  total: number;
  date: Date;
}

export interface CreateClientDto {
  name: string;
  email: string;
  phone?: string;
  type?: 'individual' | 'business';
  birthday?: Date;
  weddingAnniversary?: Date;
  notes?: string;
  tags?: string[];
}

export interface UpdateClientDto {
  name?: string;
  email?: string;
  phone?: string;
  type?: 'individual' | 'business';
  status?: 'active' | 'inactive';
  birthday?: Date;
  weddingAnniversary?: Date;
  notes?: string;
  tags?: string[];
}

export interface ClientWithOrders extends Client {
  orders: ClientOrder[];
}

export interface UpcomingDate {
  clientId: string;
  clientName: string;
  type: string;
  date: Date;
  daysUntil: number;
}

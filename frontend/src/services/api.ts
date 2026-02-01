// API Service - Centralized HTTP client
interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

class ApiService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    // Use empty string to use relative URLs (proxy will handle it)
    this.baseURL = import.meta.env.VITE_API_URL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          errors: errorData.errors,
        } as ApiError;
      }

      const data = await response.json();
      
      return {
        data,
        success: true,
        message: data.message,
      };
    } catch (error) {
      if (error instanceof TypeError) {
        // Network error
        throw {
          message: 'Erro de conexão. Verifique sua internet.',
          status: 0,
        } as ApiError;
      }
      throw error;
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // File upload
  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const headers = this.getAuthHeaders();
    // Don't set Content-Type for FormData, let browser set it with boundary
    delete headers['Content-Type'];

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers,
    });
  }

  // Specific API endpoints
  
  // Dashboard
  async getDashboardStats() {
    return this.get('/api/v1/admin/dashboard/stats');
  }

  // Products
  async getProducts(params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/products${query}`);
  }

  async createProduct(product: any) {
    return this.post('/api/v1/products', product);
  }

  async updateProduct(id: string, product: any) {
    return this.put(`/api/products/${id}`, product);
  }

  async deleteProduct(id: string) {
    return this.delete(`/api/products/${id}`);
  }

  // Templates
  async getTemplates(params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/templates${query}`);
  }

  async createTemplate(template: any) {
    return this.post('/api/v1/templates', template);
  }

  async updateTemplate(id: string, template: any) {
    return this.put(`/api/templates/${id}`, template);
  }

  async deleteTemplate(id: string) {
    return this.delete(`/api/templates/${id}`);
  }

  // Orders
  async getOrders(params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/orders${query}`);
  }

  async updateOrderStatus(id: string, status: string) {
    return this.patch(`/api/orders/${id}/status`, { status });
  }

  // Users
  async getUsers(params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/users${query}`);
  }

  async createUser(user: any) {
    return this.post('/api/v1/users', user);
  }

  async updateUser(id: string, user: any) {
    return this.put(`/api/users/${id}`, user);
  }

  async deleteUser(id: string) {
    return this.delete(`/api/users/${id}`);
  }

  // Auth
  async login(credentials: { email: string; password: string }) {
    return this.post('/api/v1/auth/login', credentials);
  }

  async register(userData: { name: string; email: string; password: string }) {
    return this.post('/api/v1/auth/register', userData);
  }

  async logout() {
    return this.post('/api/v1/auth/logout');
  }

  async refreshToken() {
    return this.post('/api/v1/auth/refresh');
  }

  // Assets
  async uploadAsset(file: File, metadata?: any) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    return this.upload('/api/v1/assets/upload', formData);
  }

  async getAssets(params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/assets${query}`);
  }

  async deleteAsset(id: string) {
    return this.delete(`/api/assets/${id}`);
  }

  // Settings
  async getSettings() {
    return this.get('/api/v1/admin/settings');
  }

  async updateSettings(settings: any) {
    return this.put('/api/v1/admin/settings', settings);
  }

  // Reports
  async getReports(type: string, params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/admin/reports/${type}${query}`);
  }
}

// Create and export singleton instance
export const api = new ApiService();

// Export types for use in other files
export type { ApiResponse, ApiError };
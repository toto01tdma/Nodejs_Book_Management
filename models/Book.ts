export interface IBook {
  id?: number;
  title: string;
  author: string;
  published_year?: number;
  genre?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface IBookCreate {
  title: string;
  author: string;
  published_year?: number;
  genre?: string;
}

export interface IBookUpdate {
  title?: string;
  author?: string;
  published_year?: number;
  genre?: string;
}

export interface IBookFilters {
  search?: string;
  genre?: string;
  author?: string;
  year?: number;
  limit?: number;
  offset?: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} 
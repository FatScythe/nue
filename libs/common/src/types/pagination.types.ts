export interface PaginationMeta {
  totalRecords: number;
  page: number;
  limit: number;
  totalPages: number;
  previous: number | null;
  next: number | null;
}

export type QueryValue = string | number | boolean | Date | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string | string[];
}

export interface PageResponse<T> {
  content: T[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

function appendPair(target: URLSearchParams, key: string, value: QueryValue): void {
  if (value === undefined || value === null) return;
  if (value instanceof Date) {
    target.append(key, value.toISOString());
    return;
  }
  if (typeof value === "boolean") {
    target.append(key, value ? "true" : "false");
    return;
  }
  const str = String(value);
  if (str.length === 0) return;
  target.append(key, str);
}

export function serializeQuery(params: QueryParams | undefined): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) appendPair(search, key, item);
    } else {
      appendPair(search, key, value);
    }
  }
  const str = search.toString();
  return str.length > 0 ? `?${str}` : "";
}

export function withPaging(query: QueryParams, page: PageRequest = {}): QueryParams {
  return {
    ...query,
    page: page.page,
    size: page.size,
    sort: page.sort,
  };
}

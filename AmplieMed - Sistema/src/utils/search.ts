/**
 * Full-text search utilities for Supabase PostgreSQL
 * Uses tsvector and full-text search operators for better performance
 */

/**
 * SQL migrations for full-text search setup
 * Run these in Supabase SQL editor to enable full-text search
 *
 * @example
 * This should be run once during migrations:
 *
 * -- Add search vector column to patients table
 * ALTER TABLE patients ADD COLUMN search_vector tsvector;
 *
 * -- Create GIN index for faster searches
 * CREATE INDEX patients_search_idx ON patients USING GIN(search_vector);
 *
 * -- Create trigger to update search vector automatically
 * CREATE TRIGGER patients_search_update BEFORE INSERT OR UPDATE ON patients
 * FOR EACH ROW EXECUTE FUNCTION
 * tsvector_update_trigger(search_vector, 'pg_catalog.portuguese', name, cpf, email);
 */

import type { SearchResult } from '../types';

/**
 * Search configuration per table
 * Defines which columns to search in each table
 */
const SEARCH_CONFIG: Record<string, { table: string; columns: string[]; language: string }> = {
  patients: {
    table: 'patients',
    columns: ['name', 'cpf', 'email', 'phone'],
    language: 'pt_BR',
  },
  professionals: {
    table: 'professionals',
    columns: ['name', 'cpf', 'email', 'crm'],
    language: 'pt_BR',
  },
  medicalRecords: {
    table: 'medical_records',
    columns: ['patient_name', 'doctor_name', 'chief_complaint', 'conduct_plan'],
    language: 'pt_BR',
  },
  appointments: {
    table: 'appointments',
    columns: ['patient_name', 'doctor_name', 'specialty', 'notes'],
    language: 'pt_BR',
  },
};

/**
 * Escapes special characters in search query for PostgreSQL full-text search
 * @param query Raw search query
 * @returns Escaped query safe for PostgreSQL
 */
export function escapeSearchQuery(query: string): string {
  return query
    .replace(/[&|'!():*]/g, ' ')
    .trim()
    .split(/\s+/)
    .join(' & ');
}

/**
 * Simple full-text search in Supabase
 * Falls back to ILIKE if search_vector not available
 *
 * @param supabase Supabase client
 * @param table Table name to search
 * @param query Search query
 * @param limit Results limit
 * @returns Search results
 *
 * @example
 * const results = await fullTextSearch(
 *   supabase,
 *   'patients',
 *   'João Silva',
 *   10
 * );
 */
export async function fullTextSearch<T = any>(
  supabase: any,
  table: string,
  query: string,
  limit: number = 10
): Promise<SearchResult<T>> {
  const config = SEARCH_CONFIG[table];

  if (!config) {
    throw new Error(`Search config not defined for table: ${table}`);
  }

  // Build ILIKE conditions for fallback search
  const ilikeConditions = config.columns
    .map(col => `${col}.ilike.%${query}%`)
    .join(',');

  const { data, error, count } = await supabase
    .from(config.table)
    .select('*', { count: 'exact' })
    .or(ilikeConditions)
    .limit(limit);

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return {
    items: (data || []) as T[],
    total: count || 0,
    hasMore: (count || 0) > limit,
  };
}

/**
 * Advanced full-text search using PostgreSQL tsvector
 * Requires search_vector column to be set up
 *
 * @param supabase Supabase client
 * @param table Table to search
 * @param query Search query with operators (& | !)
 * @param options Search options
 *
 * @example
 * const results = await advancedSearch(supabase, 'patients', 'João & Silva', {
 *   limit: 20,
 *   language: 'portuguese'
 * });
 */
export async function advancedSearch<T = any>(
  supabase: any,
  table: string,
  query: string,
  options: {
    limit?: number;
    offset?: number;
    language?: string;
  } = {}
): Promise<SearchResult<T>> {
  const { limit = 10, offset = 0, language = 'portuguese' } = options;

  const escapedQuery = escapeSearchQuery(query);

  // Use RPC or raw SQL for full-text search
  // This requires a custom function in Supabase
  const { data, error, count } = await supabase.rpc('search_full_text', {
    p_table: table,
    p_query: escapedQuery,
    p_limit: limit,
    p_offset: offset,
    p_language: language,
  });

  if (error) {
    // Fallback to simple search if RPC not available
    console.warn('Advanced search RPC failed, falling back to simple search:', error);
    return fullTextSearch(supabase, table, query, limit);
  }

  return {
    items: (data || []) as T[],
    total: count || 0,
    hasMore: (count || 0) > limit + offset,
  };
}

/**
 * Multi-table search across patients, professionals, and records
 * @param supabase Supabase client
 * @param query Search query
 * @param tables Tables to search (default: all)
 * @param limit Results per table
 *
 * @example
 * const results = await globalSearch(supabase, 'João', undefined, 5);
 */
export async function globalSearch<T = any>(
  supabase: any,
  query: string,
  tables: string[] = Object.keys(SEARCH_CONFIG),
  limit: number = 5
): Promise<Record<string, SearchResult<T>>> {
  const results: Record<string, SearchResult<T>> = {};

  // Search in parallel for performance
  const searchPromises = tables.map(async (table) => {
    try {
      const result = await fullTextSearch<T>(supabase, table, query, limit);
      results[table] = result;
    } catch (error) {
      console.error(`Search in ${table} failed:`, error);
      results[table] = { items: [], total: 0, hasMore: false };
    }
  });

  await Promise.all(searchPromises);
  return results;
}

/**
 * SQL function to create search RPC
 * Run this in Supabase SQL editor to enable advancedSearch
 *
 * SQL MIGRATION:
 * ```sql
 * CREATE OR REPLACE FUNCTION search_full_text(
 *   p_table TEXT,
 *   p_query TEXT,
 *   p_limit INT DEFAULT 10,
 *   p_offset INT DEFAULT 0,
 *   p_language TEXT DEFAULT 'portuguese'
 * )
 * RETURNS TABLE (result JSONB, total_count BIGINT) AS $$
 * DECLARE
 *   v_result JSONB[];
 *   v_total BIGINT;
 * BEGIN
 *   EXECUTE format(
 *     'SELECT array_agg(to_jsonb(t.*)) as result, count(*) OVER() as total
 *      FROM %I t
 *      WHERE search_vector @@ plainto_tsquery(%L, %L)
 *      ORDER BY ts_rank(search_vector, plainto_tsquery(%L, %L)) DESC
 *      LIMIT %L OFFSET %L',
 *     p_table, p_language, p_query, p_language, p_query, p_limit, p_offset
 *   ) INTO v_result, v_total;
 *
 *   RETURN QUERY SELECT v_result, v_total;
 * END;
 * $$ LANGUAGE plpgsql;
 * ```
 */

/**
 * Search query builder for complex searches
 *
 * @example
 * const builder = new SearchQueryBuilder('patients')
 *   .where('status', 'active')
 *   .where('gender', 'M')
 *   .search('João')
 *   .build();
 */
export class SearchQueryBuilder {
  private table: string;
  private filters: Array<{ field: string; operator: string; value: any }> = [];
  private searchQuery: string = '';
  private orderBy: string | null = null;
  private limit: number = 10;

  constructor(table: string) {
    this.table = table;
  }

  where(field: string, value: any, operator: string = 'eq'): this {
    this.filters.push({ field, operator, value });
    return this;
  }

  search(query: string, ...fields: string[]): this {
    this.searchQuery = query;
    // Store fields if provided
    return this;
  }

  orderBy(field: string, ascending: boolean = true): this {
    this.orderBy = `${field}.${ascending ? 'asc' : 'desc'}`;
    return this;
  }

  take(limit: number): this {
    this.limit = limit;
    return this;
  }

  build(): { query: string; params: Record<string, any> } {
    let query = `${this.table}?select=*`;

    // Add filters
    for (const filter of this.filters) {
      const operator = filter.operator === 'in' ? 'in' : filter.operator;
      query += `&${filter.field}=${operator}.${filter.value}`;
    }

    // Add ordering
    if (this.orderBy) {
      query += `&order=${this.orderBy}`;
    }

    // Add limit
    query += `&limit=${this.limit}`;

    return {
      query,
      params: { search: this.searchQuery },
    };
  }
}

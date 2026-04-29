'use client';

import { useState, useCallback, useMemo } from 'react';
import { 
  Query, 
  DocumentData, 
  QueryDocumentSnapshot,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  Timestamp
} from 'firebase/firestore';

export interface PaginationState {
  data: DocumentData[];
  isLoading: boolean;
  error: Error | null;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  firstDoc: QueryDocumentSnapshot<DocumentData> | null;
}

export interface UseCursorPaginationOptions {
  firestore: any;
  collectionPath: string;
  pageSize?: number;
  queries?: { type: 'where' | 'orderBy'; field: string; operator?: string; value?: any; dir?: 'asc' | 'desc' }[];
  initialWhereClauses?: { field: string; operator: string; value: any }[];
  transformData?: (docs: DocumentData[]) => DocumentData[];
}

export function useCursorPagination({
  firestore,
  collectionPath,
  pageSize = 20,
  queries = [],
  initialWhereClauses = [],
  transformData
}: UseCursorPaginationOptions) {
  const [data, setData] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const buildQuery = useCallback((cursorDoc?: QueryDocumentSnapshot<DocumentData> | null, isPrev = false) => {
    if (!firestore) return null;

    const colRef = collection(firestore, collectionPath);
    let q: Query<DocumentData>;

    // Build base query with where clauses
    let constraints: any[] = [];
    
    if (initialWhereClauses.length > 0) {
      initialWhereClauses.forEach(clause => {
        constraints.push(where(clause.field, clause.operator, clause.value));
      });
    }

    // Add ordering
    const orderField = queries.find(q => q.type === 'orderBy')?.field || 'createdAt';
    const orderDir = queries.find(q => q.type === 'orderBy')?.dir || 'desc';
    constraints.push(orderBy(orderField, orderDir));

    // Add startAfter or endBefore for cursor
    if (cursorDoc) {
      if (isPrev) {
        constraints.push(orderBy(orderField, orderDir === 'desc' ? 'asc' : 'desc'));
        q = query(colRef, ...constraints, limit(pageSize));
      } else {
        constraints.push(startAfter(cursorDoc));
        q = query(colRef, ...constraints, limit(pageSize));
      }
    } else {
      q = query(colRef, ...constraints, limit(pageSize));
    }

    return q;
  }, [firestore, collectionPath, pageSize, queries, initialWhereClauses]);

  const fetchPage = useCallback(async (cursorDoc?: QueryDocumentSnapshot<DocumentData> | null, isPrev = false) => {
    if (!firestore) return;

    setIsLoading(true);
    setError(null);

    try {
      const q = buildQuery(cursorDoc, isPrev);
      if (!q) return;

      const snapshot = await getDocs(q);
      let docs = snapshot.docs;

      // If prev page, reverse to get correct order
      if (isPrev && cursorDoc) {
        docs = docs.reverse();
      }

      let newData = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DocumentData[];

      // Apply data transformation if provided
      if (transformData) {
        newData = transformData(newData);
      }

      setData(newData);
      setTotalCount(prev => isPrev ? prev : Math.max(prev, (currentPage) * pageSize + newData.length));
      
      // Update cursors
      if (docs.length > 0) {
        setLastDoc(docs[docs.length - 1]);
        setFirstDoc(docs[0]);
      }

      // Check if there are more pages
      setHasNextPage(docs.length === pageSize);
      
      // For prev, we need to check if there's a previous page
      if (isPrev) {
        setHasPrevPage(cursorDoc ? true : false);
      }

    } catch (err) {
      console.error('Pagination error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [firestore, buildQuery, transformData, currentPage, pageSize]);

  const loadInitialData = useCallback(async () => {
    setIsInitialLoad(true);
    setCurrentPage(1);
    setHasPrevPage(false);
    setFirstDoc(null);
    setLastDoc(null);
    await fetchPage(null, false);
  }, [fetchPage]);

  const goToNextPage = useCallback(async () => {
    if (!hasNextPage || isLoading) return;
    
    const nextPageNum = currentPage + 1;
    setCurrentPage(nextPageNum);
    
    // Store current first doc for prev navigation
    const currentFirst = firstDoc;
    
    await fetchPage(lastDoc, false);
    
    // Restore first doc reference
    if (currentFirst) {
      setFirstDoc(currentFirst);
      setHasPrevPage(true);
    }
  }, [hasNextPage, isLoading, currentPage, lastDoc, firstDoc, fetchPage]);

  const goToPrevPage = useCallback(async () => {
    if (!hasPrevPage || isLoading || !firstDoc) return;
    
    const prevPageNum = currentPage - 1;
    setCurrentPage(prevPageNum);
    
    await fetchPage(firstDoc, true);
    setHasNextPage(true);
  }, [hasPrevPage, isLoading, currentPage, firstDoc, fetchPage]);

  const refresh = useCallback(async () => {
    await fetchPage(null, false);
  }, [fetchPage]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    isLoading,
    isInitialLoading: isInitialLoad,
    error,
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    hasPrevPage,
    pageSize,
    loadInitialData,
    goToNextPage,
    goToPrevPage,
    refresh
  };
}

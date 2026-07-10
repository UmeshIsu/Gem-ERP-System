'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface MasterItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

export function useMasterData(entity: 'gemType' | 'purchaseLocation' | 'seller' | 'buyer' | 'machine' | 'laboratory') {
  return useQuery({
    queryKey: ['master', entity],
    queryFn: () => api.get<MasterItem[]>(`/settings/master/${entity}`),
    staleTime: 5 * 60_000,
  });
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  code: string;
  description?: string;
  stages: { id: string; kind: string; sortOrder: number; isOptional: boolean }[];
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ['workflow', 'templates'],
    queryFn: () => api.get<WorkflowTemplate[]>('/workflow/templates'),
    staleTime: 5 * 60_000,
  });
}

export interface CompanyProfile {
  id: string;
  companyName: string;
  legalName?: string | null;
  ownerName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  currency: string;
  logoUrl?: string | null;
}

export function useCompany() {
  return useQuery({
    queryKey: ['company'],
    queryFn: () => api.get<CompanyProfile>('/company'),
    staleTime: 10 * 60_000,
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.get<MasterItem[]>('/financials/categories'),
    staleTime: 5 * 60_000,
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-client';
import type { CreateLeadPayload, Lead, LeadQuery, LeadStatus } from '@/types/lead';
import { STATUS_LABEL } from '@/types/lead';
import {
  type LeadListResult,
  createLead,
  fetchLeadStats,
  fetchLeads,
  updateLeadStatus,
} from '../api';

export const leadKeys = {
  all: ['leads'] as const,
  list: (query: LeadQuery) => ['leads', 'list', query] as const,
  stats: () => ['leads', 'stats'] as const,
};

export function useLeads(query: LeadQuery) {
  return useQuery({
    queryKey: leadKeys.list(query),
    queryFn: () => fetchLeads(query),
    placeholderData: (previous) => previous,
  });
}

export function useLeadStats() {
  return useQuery({
    queryKey: leadKeys.stats(),
    queryFn: fetchLeadStats,
  });
}

export function useCreateLead(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (payload: CreateLeadPayload) => createLead(payload),
    onSuccess: (lead) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.all });
      notify({
        tone: 'success',
        title: 'Lead added',
        description: `${lead.name} is now in the pipeline.`,
      });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      // A duplicate email is shown inline on the field, not as a toast.
      if (error instanceof ApiError && error.code === 'DUPLICATE_EMAIL') return;

      notify({
        tone: 'error',
        title: 'Could not add the lead',
        description: error instanceof ApiError ? error.message : 'Something went wrong.',
      });
    },
  });
}

interface StatusVariables {
  id: string;
  status: LeadStatus;
}

export function useUpdateLeadStatus(query: LeadQuery) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const listKey = leadKeys.list(query);

  return useMutation({
    mutationFn: ({ id, status }: StatusVariables) => updateLeadStatus(id, status),

    // Repaint the row immediately; the pill is the whole point of the interaction.
    onMutate: async ({ id, status }: StatusVariables) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<LeadListResult>(listKey);

      queryClient.setQueryData<LeadListResult>(listKey, (current) =>
        current
          ? {
              ...current,
              leads: current.leads.map((lead: Lead) =>
                lead.id === id ? { ...lead, status } : lead,
              ),
            }
          : current,
      );

      return { previous };
    },

    onError: (error: unknown, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);

      notify({
        tone: 'error',
        title: 'Status not updated',
        description: error instanceof ApiError ? error.message : 'Something went wrong.',
      });
    },

    onSuccess: (lead) => {
      notify({
        tone: 'success',
        title: `Moved to ${STATUS_LABEL[lead.status]}`,
        description: lead.name,
      });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

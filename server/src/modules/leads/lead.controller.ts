import type { Request, Response } from 'express';

import { type ApiPaginated, type ApiSuccess, buildPageMeta } from '../../shared/types/api';
import { asyncHandler } from '../../shared/utils/async-handler';
import {
  createLeadSchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
  updateLeadStatusSchema,
} from './lead.schema';
import type { LeadService } from './lead.service';
import type { Lead, LeadStats } from './lead.types';

export class LeadController {
  constructor(private readonly service: LeadService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = listLeadsQuerySchema.parse(req.query);
    const { items, total } = await this.service.listLeads(query);

    const body: ApiPaginated<Lead> = {
      data: items,
      meta: buildPageMeta(query.page, query.pageSize, total),
    };

    res.json(body);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = createLeadSchema.parse(req.body);
    const lead = await this.service.createLead(input);

    const body: ApiSuccess<Lead> = { data: lead };
    res.status(201).location(`/api/leads/${lead.id}`).json(body);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = leadIdParamSchema.parse(req.params);
    const lead = await this.service.getLeadById(id);

    const body: ApiSuccess<Lead> = { data: lead };
    res.json(body);
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = leadIdParamSchema.parse(req.params);
    const { status } = updateLeadStatusSchema.parse(req.body);
    const lead = await this.service.updateLeadStatus(id, status);

    const body: ApiSuccess<Lead> = { data: lead };
    res.json(body);
  });

  stats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await this.service.getStats();

    const body: ApiSuccess<LeadStats> = { data: stats };
    res.json(body);
  });
}

import { type FilterQuery, type SortOrder, isValidObjectId } from 'mongoose';

import { escapeRegex } from '../../shared/utils/escape-regex';
import { type LeadAttributes, LeadModel, type LeadRecord, toLead } from './lead.model';
import type { LeadRepository } from './lead.repository';
import {
  type CreateLeadData,
  type Lead,
  type LeadStats,
  type LeadStatus,
  type ListLeadsFilter,
  type PaginatedLeads,
  emptyStatusCounts,
} from './lead.types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function buildQuery(filter: ListLeadsFilter): FilterQuery<LeadAttributes> {
  const query: FilterQuery<LeadAttributes> = {};

  if (filter.status && filter.status.length > 0) {
    query.status = { $in: filter.status };
  }

  if (filter.search) {
    const pattern = new RegExp(escapeRegex(filter.search), 'i');
    query.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  return query;
}

export class MongoLeadRepository implements LeadRepository {
  async create(data: CreateLeadData): Promise<Lead> {
    const created = await LeadModel.create(data);
    return toLead(created);
  }

  async findById(id: string): Promise<Lead | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await LeadModel.findById(id).lean<LeadRecord | null>().exec();
    return doc ? toLead(doc) : null;
  }

  async findByEmail(email: string): Promise<Lead | null> {
    const doc = await LeadModel.findOne({ email: email.toLowerCase() })
      .lean<LeadRecord | null>()
      .exec();
    return doc ? toLead(doc) : null;
  }

  async list(filter: ListLeadsFilter): Promise<PaginatedLeads> {
    const query = buildQuery(filter);
    const direction: SortOrder = filter.sortDirection === 'asc' ? 1 : -1;

    // _id breaks ties so pages stay stable when sorting on a non-unique field.
    const sort: Record<string, SortOrder> = { [filter.sortBy]: direction, _id: direction };

    const [docs, total] = await Promise.all([
      LeadModel.find(query)
        .sort(sort)
        .skip((filter.page - 1) * filter.pageSize)
        .limit(filter.pageSize)
        .lean<LeadRecord[]>()
        .exec(),
      LeadModel.countDocuments(query).exec(),
    ]);

    return { items: docs.map(toLead), total };
  }

  async updateStatus(id: string, status: LeadStatus): Promise<Lead | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await LeadModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true },
    )
      .lean<LeadRecord | null>()
      .exec();
    return doc ? toLead(doc) : null;
  }

  async stats(): Promise<LeadStats> {
    const since = new Date(Date.now() - SEVEN_DAYS_MS);

    const [result] = await LeadModel.aggregate<{
      byStatus: { _id: LeadStatus; count: number }[];
      total: { value: number }[];
      recent: { value: number }[];
    }>([
      {
        $facet: {
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          total: [{ $count: 'value' }],
          recent: [{ $match: { createdAt: { $gte: since } } }, { $count: 'value' }],
        },
      },
    ]).exec();

    const byStatus = emptyStatusCounts();
    for (const row of result?.byStatus ?? []) {
      byStatus[row._id] = row.count;
    }

    const closed = byStatus.WON + byStatus.LOST;

    return {
      total: result?.total[0]?.value ?? 0,
      byStatus,
      conversionRate: closed === 0 ? null : byStatus.WON / closed,
      createdLast7Days: result?.recent[0]?.value ?? 0,
    };
  }
}

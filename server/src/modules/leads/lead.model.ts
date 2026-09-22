import { type HydratedDocument, type Model, Schema, type Types, model } from 'mongoose';

import { DEFAULT_LEAD_STATUS, LEAD_STATUSES, type Lead, type LeadStatus } from './lead.types';

export interface LeadAttributes {
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadDocument = HydratedDocument<LeadAttributes>;

const leadSchema = new Schema<LeadAttributes>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      maxlength: 32,
    },
    status: {
      type: String,
      required: true,
      enum: { values: [...LEAD_STATUSES], message: '{VALUE} is not a valid lead status' },
      default: DEFAULT_LEAD_STATUS,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'leads',
  },
);

leadSchema.index({ email: 1 }, { unique: true, name: 'uniq_lead_email' });
leadSchema.index({ status: 1, createdAt: -1 }, { name: 'status_created_at' });
leadSchema.index({ createdAt: -1 }, { name: 'created_at_desc' });

export const LeadModel: Model<LeadAttributes> = model<LeadAttributes>('Lead', leadSchema);

export interface LeadRecord extends LeadAttributes {
  _id: Types.ObjectId | string;
}

export function toLead(doc: LeadRecord): Lead {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

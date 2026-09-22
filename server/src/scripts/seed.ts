import { connectDatabase, disconnectDatabase } from '../config/database';
import { LeadModel } from '../modules/leads/lead.model';
import type { LeadStatus } from '../modules/leads/lead.types';
import { logger } from '../shared/logger';

interface SeedLead {
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  daysAgo: number;
}

const SEED_LEADS: SeedLead[] = [
  { name: 'Ananya Rao', email: 'ananya.rao@northwind.co', phone: '+91 98200 11223', status: 'NEW', daysAgo: 0 },
  { name: 'Vikram Shetty', email: 'vikram.shetty@acme.io', phone: '+91 98450 12345', status: 'NEW', daysAgo: 1 },
  { name: 'Priya Nair', email: 'priya.nair@zenith.dev', phone: '+1 (415) 555-0142', status: 'CONTACTED', daysAgo: 2 },
  { name: 'Rahul Mehta', email: 'rahul.mehta@brightline.in', phone: '+91 99001 22334', status: 'QUALIFIED', daysAgo: 3 },
  { name: 'Sneha Kulkarni', email: 'sneha@meridianlabs.com', phone: '+91 97654 33210', status: 'WON', daysAgo: 5 },
  { name: 'Daniel Okafor', email: 'daniel.okafor@quaystone.co.uk', phone: '+44 20 7946 0958', status: 'CONTACTED', daysAgo: 6 },
  { name: 'Meera Iyer', email: 'meera.iyer@finserve.in', phone: '+91 90040 55667', status: 'LOST', daysAgo: 8 },
  { name: 'Arjun Desai', email: 'arjun@pivotalgrowth.com', phone: '+91 93210 44556', status: 'QUALIFIED', daysAgo: 9 },
  { name: 'Laura Bennett', email: 'laura.bennett@cascaderetail.com', phone: '+1 (206) 555-0188', status: 'WON', daysAgo: 12 },
  { name: 'Karthik Subramanian', email: 'karthik.s@vertexauto.in', phone: '+91 98800 77665', status: 'NEW', daysAgo: 14 },
  { name: 'Fatima Sheikh', email: 'fatima.sheikh@harbourtech.ae', phone: '+971 50 123 4567', status: 'CONTACTED', daysAgo: 17 },
  { name: 'Tom Whitaker', email: 'tom.whitaker@orchardfoods.co.uk', phone: '+44 161 496 0221', status: 'LOST', daysAgo: 21 },
  { name: 'Nisha Pillai', email: 'nisha.pillai@lumenhealth.in', phone: '+91 96320 88990', status: 'QUALIFIED', daysAgo: 24 },
  { name: 'Marcus Lindqvist', email: 'marcus@nordholm.se', phone: '+46 8 123 456', status: 'NEW', daysAgo: 28 },
];

function dateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10 + (days % 8), (days * 7) % 60, 0, 0);
  return date;
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');

  await connectDatabase();

  const existing = await LeadModel.countDocuments();

  if (existing > 0 && !force) {
    logger.warn(
      { existing },
      'collection is not empty, re-run with --force to wipe and reseed',
    );
    await disconnectDatabase();
    return;
  }

  if (force) {
    const { deletedCount } = await LeadModel.deleteMany({});
    logger.info({ deletedCount }, 'cleared existing leads');
  }

  const documents = SEED_LEADS.map(({ daysAgo, ...lead }) => {
    const createdAt = dateDaysAgo(daysAgo);
    return { ...lead, createdAt, updatedAt: createdAt };
  });

  // Saved one by one with timestamps off: the schema sets them automatically,
  // and the seed is only useful if the dates are spread out enough to exercise
  // sorting and the last-7-days count.
  for (const document of documents) {
    await new LeadModel(document).save({ timestamps: false });
  }

  logger.info({ inserted: documents.length }, 'seed complete');
  await disconnectDatabase();
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'seed failed');
  process.exit(1);
});

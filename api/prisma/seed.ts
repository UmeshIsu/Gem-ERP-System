import { PrismaClient, Role, StageKind, StoneKind } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── Per-deployment configuration (set these in .env before seeding a new customer) ──
const COMPANY_NAME = process.env.COMPANY_NAME ?? 'Abeywardhane Gems';
const COMPANY_LEGAL_NAME = process.env.COMPANY_LEGAL_NAME ?? '';
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS ?? '';
const COMPANY_PHONE = process.env.COMPANY_PHONE ?? '';
const CURRENCY = process.env.CURRENCY ?? 'LKR';

const OWNER_NAME = process.env.OWNER_NAME ?? 'Abeywardhane';
const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? 'owner@abeywardhanegems.lk').toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? 'Abeywardhane@2026';

const SEED_SUPPORT_ACCOUNT = (process.env.SEED_SUPPORT_ACCOUNT ?? 'true') === 'true';
const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL ?? 'support@auragem.lk').toLowerCase();
const SUPPORT_PASSWORD = process.env.SUPPORT_PASSWORD ?? 'Vendor@Support2026';

const SEED_SAMPLE_DATA = (process.env.SEED_SAMPLE_DATA ?? 'false') === 'true';

async function main() {
  // ── Company profile (single row) ───────────────────────
  const existingCompany = await prisma.companyProfile.findFirst();
  if (existingCompany) {
    await prisma.companyProfile.update({
      where: { id: existingCompany.id },
      data: {
        companyName: COMPANY_NAME,
        legalName: COMPANY_LEGAL_NAME || null,
        ownerName: OWNER_NAME,
        address: COMPANY_ADDRESS || null,
        phone: COMPANY_PHONE || null,
        currency: CURRENCY,
      },
    });
  } else {
    await prisma.companyProfile.create({
      data: {
        companyName: COMPANY_NAME,
        legalName: COMPANY_LEGAL_NAME || null,
        ownerName: OWNER_NAME,
        address: COMPANY_ADDRESS || null,
        phone: COMPANY_PHONE || null,
        currency: CURRENCY,
      },
    });
  }

  // ── Accounts: the business owner (+ optional hidden vendor support account) ──
  await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { fullName: OWNER_NAME, role: Role.OWNER, isActive: true },
    create: {
      email: OWNER_EMAIL,
      fullName: OWNER_NAME,
      role: Role.OWNER,
      passwordHash: await bcrypt.hash(OWNER_PASSWORD, 12),
    },
  });

  if (SEED_SUPPORT_ACCOUNT) {
    await prisma.user.upsert({
      where: { email: SUPPORT_EMAIL },
      update: { role: Role.SUPER_ADMIN, isActive: true },
      create: {
        email: SUPPORT_EMAIL,
        fullName: 'System Support',
        role: Role.SUPER_ADMIN,
        passwordHash: await bcrypt.hash(SUPPORT_PASSWORD, 12),
      },
    });
  }

  // ── Master data (useful starting data for any gem company) ──
  const gemTypes = [
    { name: 'Blue Sapphire', species: 'Corundum', variety: 'Sapphire', colorHint: 'Blue' },
    { name: 'Geuda', species: 'Corundum', variety: 'Geuda', colorHint: 'Milky' },
    { name: 'Yellow Sapphire', species: 'Corundum', variety: 'Sapphire', colorHint: 'Yellow' },
    { name: 'Padparadscha', species: 'Corundum', variety: 'Sapphire', colorHint: 'Pinkish Orange' },
    { name: 'Ruby', species: 'Corundum', variety: 'Ruby', colorHint: 'Red' },
    { name: 'Star Sapphire', species: 'Corundum', variety: 'Star Sapphire', colorHint: 'Blue/Grey' },
    { name: 'Cats Eye', species: 'Chrysoberyl', variety: 'Cymophane', colorHint: 'Honey' },
    { name: 'Alexandrite', species: 'Chrysoberyl', variety: 'Alexandrite', colorHint: 'Color Change' },
    { name: 'Spinel', species: 'Spinel', variety: 'Spinel', colorHint: 'Various' },
    { name: 'Garnet', species: 'Garnet', variety: 'Various', colorHint: 'Red/Orange' },
    { name: 'Moonstone', species: 'Feldspar', variety: 'Adularia', colorHint: 'Blue Sheen' },
    { name: 'Tourmaline', species: 'Tourmaline', variety: 'Various', colorHint: 'Various' },
  ];
  for (const g of gemTypes) {
    await prisma.gemType.upsert({ where: { name: g.name }, update: {}, create: g });
  }

  const locations = ['Ratnapura', 'Nivithigala', 'Elahera', 'Balangoda', 'Rakwana', 'Pelmadulla', 'Kuruwita', 'Embilipitiya'];
  for (const name of locations) {
    await prisma.purchaseLocation.upsert({
      where: { name },
      update: {},
      create: { name, district: ['Elahera'].includes(name) ? 'Matale' : 'Ratnapura' },
    });
  }

  const machines = [
    { name: 'Gas Furnace 01', type: 'GAS' as const, maxTempC: 1850, location: 'Workshop A' },
    { name: 'Gas Furnace 02', type: 'GAS' as const, maxTempC: 1900, location: 'Workshop A' },
    { name: 'Electric Kiln 01', type: 'ELECTRIC' as const, maxTempC: 1250, location: 'Workshop B' },
    { name: 'Electric Kiln 02', type: 'ELECTRIC' as const, maxTempC: 1250, location: 'Workshop B' },
  ];
  for (const m of machines) {
    await prisma.machine.upsert({ where: { name: m.name }, update: {}, create: m });
  }

  const labs = ['GIA', 'GRS', 'Lotus Gemology', 'EGL Colombo', 'GIC Sri Lanka'];
  for (const name of labs) {
    await prisma.laboratory.upsert({ where: { name }, update: {}, create: { name } });
  }

  const systemCategories = [
    'Heat Treatment', 'Electric Treatment', 'Cutting', 'Certification',
    'Transport', 'Commission', 'Export Charges', 'Taxes',
  ];
  for (const name of systemCategories) {
    await prisma.expenseCategory.upsert({ where: { name }, update: {}, create: { name, isSystem: true } });
  }
  const customCategories = ['Photography', 'Insurance', 'Courier', 'Packaging', 'Fuel', 'Salary Allocation', 'Machine Maintenance'];
  for (const name of customCategories) {
    await prisma.expenseCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  // ── Workflow templates ─────────────────────────────────
  const templates: { code: string; name: string; description: string; stages: [StageKind, boolean][] }[] = [
    {
      code: 'A', name: 'Direct Sale / Export',
      description: 'Purchase → Inspection → Certification (optional) → Export/Sale',
      stages: [
        [StageKind.PURCHASE, false], [StageKind.INSPECTION, false],
        [StageKind.CERTIFICATION, true], [StageKind.EXPORT_SALE, false],
      ],
    },
    {
      code: 'B', name: 'Rough Stone Processing',
      description: 'Purchase → Crack Removal (optional) → Cutting → Certification → Export',
      stages: [
        [StageKind.PURCHASE, false], [StageKind.INSPECTION, false], [StageKind.CRACK_REMOVAL, true],
        [StageKind.CUTTING, false], [StageKind.CERTIFICATION, false], [StageKind.EXPORT_SALE, false],
      ],
    },
    {
      code: 'C', name: 'Geuda Heat Treatment',
      description: 'Purchase → Crack Removal (opt) → Split (opt) → Gas Heat → Electric (opt) → Cutting → Certification → Export',
      stages: [
        [StageKind.PURCHASE, false], [StageKind.INSPECTION, false], [StageKind.CRACK_REMOVAL, true],
        [StageKind.SPLITTING, true], [StageKind.GAS_HEAT, false], [StageKind.ELECTRIC_TREATMENT, true],
        [StageKind.CUTTING, false], [StageKind.CERTIFICATION, false], [StageKind.EXPORT_SALE, false],
      ],
    },
    {
      code: 'D', name: 'Already Cut Stone',
      description: 'Purchase → Certification → Export',
      stages: [
        [StageKind.PURCHASE, false], [StageKind.CERTIFICATION, false], [StageKind.EXPORT_SALE, false],
      ],
    },
  ];
  for (const t of templates) {
    const tpl = await prisma.workflowTemplate.upsert({
      where: { code: t.code },
      update: {},
      create: { code: t.code, name: t.name, description: t.description },
    });
    for (let i = 0; i < t.stages.length; i++) {
      const [kind, isOptional] = t.stages[i];
      await prisma.workflowTemplateStage.upsert({
        where: { templateId_kind: { templateId: tpl.id, kind } },
        update: { sortOrder: i, isOptional },
        create: { templateId: tpl.id, kind, sortOrder: i, isOptional },
      });
    }
  }

  // ── Optional demo data (off by default; enable with SEED_SAMPLE_DATA=true for a sales demo) ──
  if (SEED_SAMPLE_DATA && (await prisma.stone.count()) === 0) {
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: OWNER_EMAIL } });
    const geuda = await prisma.gemType.findUniqueOrThrow({ where: { name: 'Geuda' } });
    const blue = await prisma.gemType.findUniqueOrThrow({ where: { name: 'Blue Sapphire' } });
    const ratnapura = await prisma.purchaseLocation.findUniqueOrThrow({ where: { name: 'Ratnapura' } });
    const elahera = await prisma.purchaseLocation.findUniqueOrThrow({ where: { name: 'Elahera' } });
    const tplC = await prisma.workflowTemplate.findUniqueOrThrow({ where: { code: 'C' }, include: { stages: true } });
    const tplA = await prisma.workflowTemplate.findUniqueOrThrow({ where: { code: 'A' }, include: { stages: true } });

    const makeStages = (tpl: typeof tplC) =>
      tpl.stages
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s, i) => ({
          kind: s.kind,
          sortOrder: i,
          status: s.kind === StageKind.PURCHASE ? ('COMPLETED' as const) : ('PENDING' as const),
          completedAt: s.kind === StageKind.PURCHASE ? new Date() : null,
        }));

    const samples = [
      { code: 'G0001', gemTypeId: geuda.id, purchaseLocationId: ratnapura.id, stoneKind: StoneKind.GEUDA, weightCt: '48.500', shape: 'Rough', color: 'Milky White', origin: 'Sri Lanka', purchaseDate: new Date('2026-05-12'), purchaseCost: '850000', currentValue: '1200000', tpl: tplC, notes: 'Demo geuda lot.' },
      { code: 'G0002', gemTypeId: blue.id, purchaseLocationId: elahera.id, stoneKind: StoneKind.ROUGH, weightCt: '12.320', shape: 'Rough', color: 'Medium Blue', origin: 'Sri Lanka', purchaseDate: new Date('2026-06-02'), purchaseCost: '1450000', currentValue: '2100000', tpl: tplC, notes: '' },
      { code: 'G0003', gemTypeId: blue.id, purchaseLocationId: ratnapura.id, stoneKind: StoneKind.CUT, weightCt: '3.150', shape: 'Cushion', color: 'Royal Blue', clarity: 'VS', origin: 'Sri Lanka', purchaseDate: new Date('2026-06-20'), purchaseCost: '2400000', currentValue: '3800000', tpl: tplA, notes: 'Demo cut stone.' },
    ];
    for (const s of samples) {
      const { tpl, ...data } = s;
      await prisma.stone.create({
        data: {
          ...data,
          workflowTemplateId: tpl.id,
          createdById: owner.id,
          tags: [],
          stages: { create: makeStages(tpl) },
          events: { create: { kind: 'STONE_CREATED', stage: StageKind.PURCHASE, title: 'Stone purchased', userId: owner.id } },
        },
      });
    }
    await prisma.counter.upsert({ where: { key: 'stone' }, update: { value: 3 }, create: { key: 'stone', value: 3 } });
  }

  console.log(`✔ Seed complete for "${COMPANY_NAME}".`);
  console.log(`  Owner login: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  if (SEED_SUPPORT_ACCOUNT) console.log(`  Support login (vendor): ${SUPPORT_EMAIL} / ${SUPPORT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Sample contact data, keyed by siteCode. Existing sites get their contact
// fields filled in; unknown siteCodes are created as new sample sites.
const SAMPLES: { siteCode: string; name: string; location: string; state: string; contactPerson: string; contactPhone: string; contactEmail: string; budget: number; status: string }[] = [
  { siteCode: 'SITE-001', name: 'TPP Adani Godda', location: 'Godda, Jharkhand', state: 'Jharkhand', contactPerson: 'Rajesh Kumar', contactPhone: '+91-9876543210', contactEmail: 'rajesh@godda.adani.in', budget: 62000000, status: 'Active' },
  { siteCode: 'SITE-002', name: 'TPP NTPC Barh', location: 'Barh, Bihar', state: 'Bihar', contactPerson: 'Ankit Verma', contactPhone: '+91-9876543211', contactEmail: 'ankit.verma@ntpc.co.in', budget: 48000000, status: 'Active' },
  { siteCode: 'SITE-003', name: 'HO Mumbai', location: 'Andheri East, Mumbai', state: 'Maharashtra', contactPerson: 'Suresh Mahto', contactPhone: '+91-9876543212', contactEmail: 'ho@voltcore.in', budget: 9000000, status: 'Active' },
  { siteCode: 'SITE-004', name: 'BALCO Smelter Korba', location: 'Korba, Chhattisgarh', state: 'Chhattisgarh', contactPerson: 'Prakash Sahu', contactPhone: '+91-9876543213', contactEmail: 'prakash@balco.in', budget: 38000000, status: 'Active' },
  { siteCode: 'SITE-005', name: 'Coal India Rajmahal', location: 'Rajmahal, Jharkhand', state: 'Jharkhand', contactPerson: 'Deepak Mishra', contactPhone: '+91-9876543214', contactEmail: 'deepak@coalindia.in', budget: 27000000, status: 'Active' },
  { siteCode: 'SITE-006', name: 'Tata Steel Bhamapah', location: 'Bhamapah, Jharkhand', state: 'Jharkhand', contactPerson: 'Amit Singh', contactPhone: '+91-9876543215', contactEmail: 'amit.singh@tatasteel.in', budget: 62000000, status: 'Active' },
  { siteCode: 'SITE-007', name: 'JSW Vijayanagar Plant', location: 'Bellary, Karnataka', state: 'Karnataka', contactPerson: 'Manoj Rao', contactPhone: '+91-9876543216', contactEmail: 'manoj.rao@jsw.in', budget: 41000000, status: 'Active' },
]

async function main() {
  let created = 0
  let updated = 0
  for (const s of SAMPLES) {
    const existing = await db.finSite.findUnique({ where: { siteCode: s.siteCode } })
    if (existing) {
      await db.finSite.update({
        where: { id: existing.id },
        data: {
          name: s.name,
          location: s.location,
          state: s.state,
          contactPerson: s.contactPerson,
          contactPhone: s.contactPhone,
          contactEmail: s.contactEmail,
          budget: s.budget,
          status: s.status,
        },
      })
      updated++
    } else {
      await db.finSite.create({
        data: {
          siteCode: s.siteCode,
          name: s.name,
          location: s.location,
          state: s.state,
          contactPerson: s.contactPerson,
          contactPhone: s.contactPhone,
          contactEmail: s.contactEmail,
          budget: s.budget,
          status: s.status,
        },
      })
      created++
    }
  }
  console.log(`Site sample data done — ${updated} updated, ${created} created`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())

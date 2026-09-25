const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.finSite.findMany().then(sites => {
  console.log(JSON.stringify(sites, null, 2));
  return db.$disconnect();
}).catch(e => { console.error(e.message); db.$disconnect(); });

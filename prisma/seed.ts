import prisma from '@/lib/prisma';

async function main() {
  // ── Chicken Products ────────────────────────────────────
  const products = [
    { name: 'Whole Chicken', pricePerKg: 3500, stock: 100 },
    { name: 'Chicken Wings', pricePerKg: 4200, stock: 80 },
    { name: 'Chicken Breast', pricePerKg: 5000, stock: 60 },
    { name: 'Chicken Thighs', pricePerKg: 3800, stock: 75 },
    { name: 'Drumsticks', pricePerKg: 3600, stock: 90 },
    { name: 'Gizzards', pricePerKg: 4500, stock: 50 },
    { name: 'Chicken Backs', pricePerKg: 2800, stock: 120 },
    { name: 'Turkey Wings', pricePerKg: 5500, stock: 40 },
  ];

  await prisma.product.createMany({
    data: products,
    skipDuplicates: true,
  });

  console.log(`📦 ${products.length} chicken products seeded`);

  // ── Test Customer ───────────────────────────────────────
  const customer = await prisma.customer.upsert({
    where: { phone: '+2348012345678' },
    update: {},
    create: {
      phone: '+2348012345678',
      name: 'Adebayo O.',
      balance: 0,
      creditLimit: 50000,
    },
  });

  console.log(
    `👤 Test customer: ${customer.phone} (${customer.name}) — balance ₦${Number(customer.balance).toFixed(2)}`
  );

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

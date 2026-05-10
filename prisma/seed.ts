import { PrismaClient, ActivityCategory, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const cities = [
  {
    name: "Tokyo",
    country: "Japan",
    region: "Asia",
    costIndex: 78,
    popularity: 96,
    description: "Neon skylines, temples, and world-class food.",
  },
  {
    name: "Paris",
    country: "France",
    region: "Europe",
    costIndex: 85,
    popularity: 94,
    description: "Art, cafés, and riverside strolls.",
  },
  {
    name: "Barcelona",
    country: "Spain",
    region: "Europe",
    costIndex: 68,
    popularity: 90,
    description: "Gaudí architecture and Mediterranean beaches.",
  },
  {
    name: "New York",
    country: "United States",
    region: "North America",
    costIndex: 88,
    popularity: 93,
    description: "Broadway, museums, and iconic neighborhoods.",
  },
  {
    name: "Lisbon",
    country: "Portugal",
    region: "Europe",
    costIndex: 58,
    popularity: 82,
    description: "Hills, trams, and Atlantic sunsets.",
  },
  {
    name: "Seoul",
    country: "South Korea",
    region: "Asia",
    costIndex: 70,
    popularity: 86,
    description: "K-culture, palaces, and night markets.",
  },
  {
    name: "Cape Town",
    country: "South Africa",
    region: "Africa",
    costIndex: 52,
    popularity: 79,
    description: "Table Mountain and coastal drives.",
  },
  {
    name: "Reykjavik",
    country: "Iceland",
    region: "Europe",
    costIndex: 92,
    popularity: 74,
    description: "Northern lights and geothermal wonders.",
  },
];

const catalogByCity: Record<
  string,
  Array<{
    title: string;
    description: string;
    category: ActivityCategory;
    costLevel: number;
    durationHours: number;
  }>
> = {
  Tokyo: [
    {
      title: "Shibuya crossing & evening walk",
      description: "Experience the famous scramble and nearby izakayas.",
      category: "SIGHTSEEING",
      costLevel: 1,
      durationHours: 2,
    },
    {
      title: "Tsukiji outer market food tour",
      description: "Sample fresh seafood and street snacks.",
      category: "FOOD",
      costLevel: 2,
      durationHours: 3,
    },
    {
      title: "Day trip to Hakone",
      description: "Onsen, ropeway views of Mt. Fuji on clear days.",
      category: "RELAXATION",
      costLevel: 3,
      durationHours: 10,
    },
  ],
  Paris: [
    {
      title: "Louvre highlights",
      description: "Skip-the-line tips and must-see wings.",
      category: "CULTURE",
      costLevel: 2,
      durationHours: 3,
    },
    {
      title: "Seine evening cruise",
      description: "Illuminated bridges and relaxed pacing.",
      category: "SIGHTSEEING",
      costLevel: 2,
      durationHours: 2,
    },
    {
      title: "Montmartre walking tour",
      description: "Artists' square and Sacré-Cœur views.",
      category: "CULTURE",
      costLevel: 1,
      durationHours: 2.5,
    },
  ],
  Barcelona: [
    {
      title: "Sagrada Família interior visit",
      description: "Gaudí's masterpiece — book timed entry.",
      category: "CULTURE",
      costLevel: 2,
      durationHours: 2,
    },
    {
      title: "Tapas crawl in El Born",
      description: "Small plates and local vermouth.",
      category: "FOOD",
      costLevel: 2,
      durationHours: 3,
    },
  ],
  "New York": [
    {
      title: "Central Park bike loop",
      description: "Meadows, reservoirs, and skyline glimpses.",
      category: "SIGHTSEEING",
      costLevel: 1,
      durationHours: 2,
    },
    {
      title: "Broadway show",
      description: "Classic NYC night out.",
      category: "NIGHTLIFE",
      costLevel: 3,
      durationHours: 3,
    },
  ],
  Lisbon: [
    {
      title: "Alfama & miradouros",
      description: "Tile-clad alleys and panoramic viewpoints.",
      category: "SIGHTSEEING",
      costLevel: 1,
      durationHours: 3,
    },
    {
      title: "Pastéis de Belém tasting",
      description: "Iconic custard tarts near the monastery.",
      category: "FOOD",
      costLevel: 1,
      durationHours: 1.5,
    },
  ],
  Seoul: [
    {
      title: "Gyeongbokgung palace tour",
      description: "Royal architecture and changing of the guard.",
      category: "CULTURE",
      costLevel: 1,
      durationHours: 2,
    },
    {
      title: "Korean BBQ dinner",
      description: "Grill-at-the-table classics in Hongdae.",
      category: "FOOD",
      costLevel: 2,
      durationHours: 2,
    },
  ],
  "Cape Town": [
    {
      title: "Table Mountain cableway",
      description: "Summit views — check wind conditions.",
      category: "ADVENTURE",
      costLevel: 2,
      durationHours: 3,
    },
    {
      title: "V&A Waterfront stroll",
      description: "Harbor views, markets, and seafood.",
      category: "SHOPPING",
      costLevel: 2,
      durationHours: 2,
    },
  ],
  Reykjavik: [
    {
      title: "Golden Circle day tour",
      description: "Geysir, Gullfoss, and Þingvellir.",
      category: "ADVENTURE",
      costLevel: 3,
      durationHours: 8,
    },
    {
      title: "Sky Lagoon soak",
      description: "Ocean-view geothermal spa.",
      category: "RELAXATION",
      costLevel: 3,
      durationHours: 3,
    },
  ],
};

async function main() {
  const demoHash = await bcrypt.hash("demo1234", 10);
  await prisma.user.upsert({
    where: { email: "demo@traveloop.app" },
    update: {},
    create: {
      email: "demo@traveloop.app",
      passwordHash: demoHash,
      name: "Demo Traveler",
      role: UserRole.USER,
    },
  });

  const adminHash = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@traveloop.app" },
    update: {},
    create: {
      email: "admin@traveloop.app",
      passwordHash: adminHash,
      name: "Traveloop Admin",
      role: UserRole.ADMIN,
    },
  });

  for (const c of cities) {
    const existing = await prisma.city.findFirst({
      where: { name: c.name, country: c.country },
    });
    const city = existing
      ? await prisma.city.update({
          where: { id: existing.id },
          data: {
            region: c.region,
            costIndex: c.costIndex,
            popularity: c.popularity,
            description: c.description,
          },
        })
      : await prisma.city.create({
          data: {
            name: c.name,
            country: c.country,
            region: c.region,
            costIndex: c.costIndex,
            popularity: c.popularity,
            description: c.description,
          },
        });

    const entries = catalogByCity[c.name];
    if (!entries?.length) continue;
    const catalogCount = await prisma.activityCatalog.count({
      where: { cityId: city.id },
    });
    if (catalogCount > 0) continue;

    await prisma.activityCatalog.createMany({
      data: entries.map((e) => ({
        cityId: city.id,
        title: e.title,
        description: e.description,
        category: e.category,
        costLevel: e.costLevel,
        durationHours: e.durationHours,
      })),
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

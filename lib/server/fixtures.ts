import type { Article } from "@/lib/types";

type Seed = {
  title: string;
  description: string;
  source: string;
  topics: string[];
  daysAgo: number;
};

/**
 * Demo corpus used when GNEWS_API_KEY is unset.
 *
 * This exists so that `git clone && npm run dev` produces a working app with no
 * signup, and so CI and the e2e suite never touch the network or burn the
 * 100-requests/day free-tier quota.
 */
const SEEDS: Seed[] = [
  {
    title: "Researchers publish an open benchmark for long-context reasoning",
    description:
      "The suite spans 200k-token documents and reports a sharp drop in accuracy once retrieval depth exceeds a model's effective context window.",
    source: "The Verge",
    topics: ["artificial intelligence", "technology", "science"],
    daysAgo: 0,
  },
  {
    title: "Chipmaker unveils an inference accelerator aimed at on-device models",
    description:
      "The part targets sustained low-power inference for laptops, with vendors claiming a threefold efficiency gain over last year's silicon.",
    source: "Ars Technica",
    topics: ["artificial intelligence", "technology", "business"],
    daysAgo: 0,
  },
  {
    title: "EU regulators outline transparency duties for general-purpose AI",
    description:
      "Draft guidance would require model providers to publish training-data summaries and incident reporting channels before deployment.",
    source: "Reuters",
    topics: ["artificial intelligence", "world news", "business"],
    daysAgo: 1,
  },
  {
    title: "Study finds code assistants shift review effort rather than remove it",
    description:
      "Teams merged changes faster but spent proportionally more time in review, with defect rates roughly unchanged across a twelve-month window.",
    source: "IEEE Spectrum",
    topics: ["artificial intelligence", "technology", "science"],
    daysAgo: 1,
  },
  {
    title: "Open-weights model family released under a permissive licence",
    description:
      "The release includes checkpoints, an evaluation harness and the data-filtering pipeline, an unusually complete package for the category.",
    source: "TechCrunch",
    topics: ["artificial intelligence", "technology"],
    daysAgo: 2,
  },
  {
    title: "Hospitals trial ambient documentation tools in outpatient clinics",
    description:
      "Early results point to shorter note-taking time, though clinicians flagged transcription errors in specialist terminology.",
    source: "STAT",
    topics: ["health", "artificial intelligence", "science"],
    daysAgo: 2,
  },
  {
    title: "Quantum error-correction milestone reported below threshold",
    description:
      "The logical qubit stayed coherent longer than its constituent physical qubits, a prerequisite for scaling beyond laboratory demonstrations.",
    source: "Nature",
    topics: ["science", "technology"],
    daysAgo: 3,
  },
  {
    title: "Telescope survey catalogues thousands of previously unseen galaxies",
    description:
      "The dataset covers a patch of sky observed for six months and is being released without an embargo period.",
    source: "Sky & Telescope",
    topics: ["science", "world news"],
    daysAgo: 3,
  },
  {
    title: "Grid operators lean on forecasting models to smooth renewable output",
    description:
      "Short-horizon predictions are being used to schedule storage discharge, cutting curtailment during high-wind periods.",
    source: "Bloomberg",
    topics: ["business", "science", "technology"],
    daysAgo: 4,
  },
  {
    title: "Semiconductor supply chain shifts toward regional packaging capacity",
    description:
      "Advanced packaging remains the bottleneck, and new plants are unlikely to change availability before the next product cycle.",
    source: "Financial Times",
    topics: ["business", "technology", "world news"],
    daysAgo: 4,
  },
  {
    title: "Antibiotic candidate identified through structure-based screening",
    description:
      "The compound cleared a resistant strain in animal models; human trials remain several years out.",
    source: "Science",
    topics: ["health", "science"],
    daysAgo: 5,
  },
  {
    title: "Wearables study links sleep regularity to metabolic markers",
    description:
      "Consistency of sleep timing predicted outcomes better than total duration across a cohort of 40,000 participants.",
    source: "The Guardian",
    topics: ["health", "science"],
    daysAgo: 5,
  },
  {
    title: "Browser vendors agree on a standard for local model execution",
    description:
      "The proposal defines a common API surface so pages can run small models without shipping their own runtime.",
    source: "The Register",
    topics: ["technology", "artificial intelligence"],
    daysAgo: 6,
  },
  {
    title: "Undersea cable project adds capacity on a transatlantic route",
    description:
      "The link is designed for 400 Tbps and is scheduled to enter service after regulatory review in three jurisdictions.",
    source: "Data Center Dynamics",
    topics: ["technology", "world news", "business"],
    daysAgo: 6,
  },
  {
    title: "Central banks weigh the productivity effects of automation",
    description:
      "Officials cautioned that measured gains remain concentrated in a small number of sectors despite broad adoption.",
    source: "Wall Street Journal",
    topics: ["business", "world news"],
    daysAgo: 7,
  },
  {
    title: "Startup funding rebounds in developer tooling",
    description:
      "Investors pointed to shorter sales cycles and usage-based pricing as the main drivers behind renewed interest.",
    source: "TechCrunch",
    topics: ["business", "technology"],
    daysAgo: 7,
  },
  {
    title: "Climate model ensemble narrows uncertainty on regional rainfall",
    description:
      "Higher-resolution runs reduced the spread of projections for monsoon timing, though extremes remain hard to bound.",
    source: "Carbon Brief",
    topics: ["science", "world news"],
    daysAgo: 8,
  },
  {
    title: "Archaeologists date a settlement earlier than previously believed",
    description:
      "Radiocarbon results push occupation back by roughly nine centuries, complicating the accepted migration timeline.",
    source: "Smithsonian",
    topics: ["science", "world news"],
    daysAgo: 8,
  },
  {
    title: "Public sector pilots retrieval systems over legislative archives",
    description:
      "The prototype answers procedural questions with citations, and refuses when the archive lacks a supporting passage.",
    source: "Politico",
    topics: ["artificial intelligence", "world news"],
    daysAgo: 9,
  },
  {
    title: "Cobalt-free battery chemistry reaches pilot production",
    description:
      "Energy density trails incumbent cells, but the supply profile and cost curve are considerably more favourable.",
    source: "MIT Technology Review",
    topics: ["technology", "science", "business"],
    daysAgo: 9,
  },
  {
    title: "Air quality sensors reveal street-level pollution gradients",
    description:
      "Readings varied by a factor of four within a single neighbourhood, prompting a review of monitoring station placement.",
    source: "BBC News",
    topics: ["health", "world news", "science"],
    daysAgo: 10,
  },
  {
    title: "Vaccination campaign reaches coverage target ahead of schedule",
    description:
      "Health authorities credited mobile clinics and pharmacy partnerships for closing the gap in rural districts.",
    source: "Associated Press",
    topics: ["health", "world news"],
    daysAgo: 10,
  },
  {
    title: "Compiler release cuts build times on large monorepos",
    description:
      "Incremental caching was reworked around content hashing, with the biggest gains on projects above a million lines.",
    source: "InfoWorld",
    topics: ["technology"],
    daysAgo: 11,
  },
  {
    title: "Trade talks stall over digital services provisions",
    description:
      "Negotiators remain split on data localisation, leaving the broader agreement without a firm signing date.",
    source: "Reuters",
    topics: ["world news", "business"],
    daysAgo: 11,
  },
];

function toArticle(seed: Seed, index: number): Article {
  const publishedAt = new Date(
    Date.UTC(2026, 7, 13, 9, 0, 0) - seed.daysAgo * 86_400_000 - index * 1_800_000,
  ).toISOString();

  const slug = seed.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return {
    id: `demo-${index}-${slug}`,
    title: seed.title,
    description: seed.description,
    url: `https://example.com/demo/${slug}`,
    // Null on purpose: the card renders a deterministic gradient placeholder,
    // which is the same path real articles take when their image is missing.
    image: null,
    publishedAt,
    source: { name: seed.source, url: null },
  };
}

const DEMO_ARTICLES: Article[] = SEEDS.map(toArticle);

/** Filters the demo corpus the way the real endpoint would, so the UI behaves
 *  identically in demo mode — including empty results for nonsense queries. */
export function searchFixtures(query: string): Article[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return DEMO_ARTICLES;

  const terms = needle.split(/\s+/).filter(Boolean);

  const matches = DEMO_ARTICLES.filter((article, index) => {
    const seed = SEEDS[index];
    const haystack = [
      article.title,
      article.description ?? "",
      article.source.name,
      ...(seed?.topics ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return terms.some((term) => haystack.includes(term));
  });

  return matches;
}

export const DEMO_CORPUS_SIZE = DEMO_ARTICLES.length;

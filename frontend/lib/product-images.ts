/**
 * Stable placeholder images from Picsum (seed-based so they always load).
 * Use descriptive seeds for variety; optional width/height for Next/Image.
 */
const p = (seed: string, w = 800, h = 600) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`

export const PRODUCT_IMAGES = {
  // Learning, books, study
  booksLibrary: p('vedya-books-library'),
  studyNotebook: p('vedya-study-notebook'),
  booksStack: p('vedya-books-stack'),
  personStudying: p('vedya-person-study'),
  reading: p('vedya-reading'),
  studyDesk: p('vedya-study-desk'),
  // Tech, laptop, digital
  laptopCode: p('vedya-laptop-code'),
  laptopWork: p('vedya-laptop-work'),
  coding: p('vedya-coding'),
  // Collaboration, team
  collaboration: p('vedya-collaboration'),
  teamDiscussion: p('vedya-team-discuss'),
  teamwork: p('vedya-teamwork'),
  // Analytics, dashboard
  dashboard: p('vedya-dashboard', 1200, 800),
  analytics: p('vedya-analytics', 1200, 800),
  // Classroom, education
  classroom: p('vedya-classroom'),
  // AI / conceptual
  techAbstract: p('vedya-tech-abstract'),
  innovation: p('vedya-innovation'),
  dataScience: p('vedya-data-science'),
  // Insights section chart panels (Picsum — stable, always loads)
  aiInsightsPanel: p('vedya-ai-insights', 1200, 675),
  aiDataPanel: p('vedya-ai-data', 1200, 675),
  // Assessment, writing
  writing: p('vedya-writing'),
  checklist: p('vedya-checklist'),
} as const

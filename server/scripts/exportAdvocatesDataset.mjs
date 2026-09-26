#!/usr/bin/env node
/*
 * NYAYAI — Export the 500 synthetic advocate dataset.
 *
 * Reads the EXISTING source of truth (the same files the NYAYAI demo is
 * generated from) and writes a single, indexed, committed JSON export:
 *
 *   server/data/advocates/advocates-500.json
 *
 * Sources (never mutated):
 *   server/data/advocate-profiles.json           -> 500 advocate profiles
 *   server/data/corpus-generation-manifest.json  -> 5,000 case ground truth
 *
 * This script does NOT create or modify advocate or case data. It only
 * derives per-advocate stats that already exist in the corpus manifest and
 * re-presents the existing profile fields under a documented camelCase
 * schema. Run: node scripts/exportAdvocatesDataset.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, '..');
const PROFILES_PATH = path.join(serverRoot, 'data', 'advocate-profiles.json');
const MANIFEST_PATH = path.join(serverRoot, 'data', 'corpus-generation-manifest.json');
const OUT_DIR = path.join(serverRoot, 'data', 'advocates');
const OUT_PATH = path.join(OUT_DIR, 'advocates-500.json');

const profiles = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const perFile = manifest.perFile;

if (perFile.length !== 5000) {
  throw new Error(`Expected 5,000 cases in corpus-generation-manifest, got ${perFile.length}`);
}

// Group cases by advocate, preserving manifest order (advocate indexed).
const byAdvocate = new Map();
for (const file of perFile) {
  const list = byAdvocate.get(file.advocate_id) || [];
  list.push(file);
  byAdvocate.set(file.advocate_id, list);
}

function experienceLevel(profile) {
  if (profile.partner) return 'Partner';
  if (profile.years_experience >= 20) return 'Senior Advocate';
  if (profile.years_experience >= 10) return 'Experienced Advocate';
  return 'Advocate';
}

function statsFor(caseFiles) {
  const byArea = {};
  const courts = [];
  const courtLevels = [];
  const byStatus = {};
  const years = [];
  for (const f of caseFiles) {
    const r = f.record;
    byArea[r.practice_area] = (byArea[r.practice_area] || 0) + 1;
    if (!courts.includes(r.court)) courts.push(r.court);
    if (!courtLevels.includes(r.court_level)) courtLevels.push(r.court_level);
    byStatus[r.case_status] = (byStatus[r.case_status] || 0) + 1;
    years.push(r.filing_year);
  }
  return {
    totalCases: caseFiles.length,
    casesByPracticeArea: byArea,
    courtsHandled: courts,
    courtLevels: courtLevels,
    filingYears: { min: Math.min(...years), max: Math.max(...years) },
    casesByStatus: byStatus
  };
}

const advocates = [];
for (const id of Object.keys(profiles).sort()) {
  const p = profiles[id];
  const caseFiles = (byAdvocate.get(id) || []).sort((a, b) => a.case_id.localeCompare(b.case_id));
  advocates.push({
    advocateId: id,
    advocateIndex: p.advocate_index,
    name: p.name,
    gender: p.gender,
    email: p.email,
    barRegistration: p.bar_registration,
    firm: p.firm,
    partner: p.partner,
    primaryPracticeArea: p.primary_practice_area,
    primaryPracticeLabel: p.primary_practice_label,
    practiceAreas: p.practice_areas,
    jurisdiction: p.state,
    state: p.state,
    city: p.city,
    yearsExperience: p.years_experience,
    enrolledYear: p.enrolled_year,
    experienceLevel: experienceLevel(p),
    languages: p.languages,
    niches: p.niches,
    averageCasesPerYear: p.average_cases_per_year,
    successProxy: p.success_proxy,
    syntheticStatus: p.synthetic_status,
    sourceType: p.source_type,
    caseCount: caseFiles.length,
    cases: caseFiles.map((f) => f.case_id),
    statistics: statsFor(caseFiles)
  });
}

if (advocates.length !== 500) {
  throw new Error(`Expected exactly 500 advocates, got ${advocates.length}`);
}

const dataset = {
  dataset: 'NYAYAI Synthetic Advocate Dataset',
  version: '1.0',
  totalAdvocates: advocates.length,
  synthetic: true,
  description:
    'The 500 synthetic advocate profiles and their 5,000 linked historical case files used by the NYAYAI legal demonstration. Exported one-to-one from the existing NYAYAI corpus source of truth (advocate-profiles.json + corpus-generation-manifest.json); it is an indexed representation of the same advocates the application already uses, not a newly generated dataset.',
  generatedFrom: 'existing NYAYAI advocate profiles',
  sources: {
    profiles: path.relative(serverRoot, PROFILES_PATH),
    caseManifest: path.relative(serverRoot, MANIFEST_PATH)
  },
  advocates
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2) + '\n', 'utf8');
console.log(`Wrote ${advocates.length} advocates (${perFile.length} linked cases) -> ${path.relative(serverRoot, OUT_PATH)}`);
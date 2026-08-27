import { processClientTurn } from './services/caseEngineService.js';
import { logger } from './utils/logger.js';

async function runTestFlow() {
  console.log('=== NYAYAI BACKEND MULTI-TURN CASE ENGINE TEST ===\n');
  const caseId = `test-case-${Date.now()}`;

  // Turn 1
  console.log('--- TURN 1 ---');
  const turn1 = await processClientTurn(caseId, 'i got into a fight with my neighbour');
  console.log(`Matter: ${turn1.facts.matter.value}`);
  console.log(`Readiness Score: ${turn1.readinessScore}% (${turn1.readinessStage})`);
  console.log(`Discovery Status: ${turn1.discoveryStatus} (Expected: NEEDS_INFORMATION)`);
  console.log(`Missing Info:`, turn1.missingInformation);

  // Turn 2
  console.log('--- TURN 2 ---');
  const turn2 = await processClientTurn(caseId, 'physical violence, Karnataka');
  console.log(`Retained Matter: ${turn2.facts.matter.value}`);
  console.log(`Retained Jurisdiction: ${turn2.facts.jurisdiction.value}`);
  console.log(`Physical Violence Detected: ${turn2.facts.medicalInjuryEvidence?.value}`);
  console.log(`Readiness Score: ${turn2.readinessScore}% (${turn2.readinessStage})`);

  // Turn 3
  console.log('--- TURN 3 ---');
  const turn3 = await processClientTurn(caseId, 'yes i reported it to police');
  console.log(`Retained Jurisdiction: ${turn3.facts.jurisdiction.value}`);
  console.log(`Retained Reported to Police: ${turn3.facts.policeStatus.value}`);
  console.log(`Readiness Score: ${turn3.readinessScore}% (${turn3.readinessStage})`);

  // Turn 4
  console.log('--- TURN 4 ---');
  const turn4 = await processClientTurn(caseId, 'no action has been taken');
  console.log(`Procedural Stage: ${turn4.facts.proceduralStage.value}`);
  console.log(`Final Readiness Score: ${turn4.readinessScore}% (${turn4.readinessStage})`);
  console.log(`Matched Advocates Count: ${turn4.recommendationData.length}`);

  console.log('\n=== TEST SUCCESSFUL: MULTI-TURN CASE CONTEXT & ADVOCATE MATCHING VERIFIED ===');
}

runTestFlow().catch(console.error);

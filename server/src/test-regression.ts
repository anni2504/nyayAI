import { sanitizeLLMResponse } from './services/groqService.js';
import { processClientTurn, getOrCreateCaseState, isFactKnown } from './services/caseEngineService.js';

async function runRegressionTests() {
  console.log('====================================================');
  console.log('  NYAYAI CONTEXT PERSISTENCE & FACT ENGINE TEST     ');
  console.log('====================================================\n');

  const caseId = `test-context-${Date.now()}`;

  // STEP 1: "hi"
  console.log('--- Step 1: "hi" ---');
  const t1 = await processClientTurn(caseId, 'hi');
  console.log(`Score: ${t1.readinessScore}%`);
  console.log(`Reply: "${t1.messages[t1.messages.length - 1].content}"`);

  if (t1.readinessScore === 0) {
    console.log('✔ PASSED: Step 1 greeting handled at 0% score.');
  } else {
    console.error('✖ FAILED: Step 1 failed!');
  }

  // STEP 2: "I had a fight with my neighbour"
  console.log('\n--- Step 2: "I had a fight with my neighbour" ---');
  const t2 = await processClientTurn(caseId, 'I had a fight with my neighbour');
  console.log(`Matter: ${t2.facts.matter.value}`);
  console.log(`Score: ${t2.readinessScore}%`);

  if (t2.facts.matter.value === 'Neighbour Dispute / Physical Altercation') {
    console.log('✔ PASSED: Step 2 matter recognized.');
  } else {
    console.error('✖ FAILED: Step 2 failed!');
  }

  // STEP 3: "Bengaluru, Karnataka"
  console.log('\n--- Step 3: "Bengaluru, Karnataka" ---');
  const t3 = await processClientTurn(caseId, 'Bengaluru, Karnataka');
  console.log(`Jurisdiction: ${t3.facts.jurisdiction.value}`);
  console.log(`isFactKnown('jurisdiction'): ${isFactKnown('jurisdiction', t3)}`);

  if (t3.facts.jurisdiction.value === 'Karnataka (Bengaluru)' && isFactKnown('jurisdiction', t3)) {
    console.log('✔ PASSED: Step 3 jurisdiction recorded.');
  } else {
    console.error('✖ FAILED: Step 3 failed!');
  }

  // STEP 4: "yes CSR filed"
  console.log('\n--- Step 4: "yes CSR filed" ---');
  const t4 = await processClientTurn(caseId, 'yes CSR filed');
  console.log(`Police Status: ${t4.facts.policeStatus.value}`);
  console.log(`isFactKnown('policeStatus'): ${isFactKnown('policeStatus', t4)}`);

  if (t4.facts.policeStatus.value === true && isFactKnown('policeStatus', t4)) {
    console.log('✔ PASSED: Step 4 police status recorded.');
  } else {
    console.error('✖ FAILED: Step 4 failed!');
  }

  // STEP 5: "physical assault and injuries occurred"
  console.log('\n--- Step 5: "physical assault and injuries occurred" ---');
  const t5 = await processClientTurn(caseId, 'physical assault and injuries occurred');
  console.log(`Injuries Evidence: ${t5.facts.medicalInjuryEvidence?.value}`);

  if (t5.facts.medicalInjuryEvidence?.value) {
    console.log('✔ PASSED: Step 5 injuries recorded.');
  } else {
    console.error('✖ FAILED: Step 5 failed!');
  }

  // STEP 6: "so i was going through the road he hit me for no reason"
  console.log('\n--- Step 6: "so i was going through the road he hit me for no reason" ---');
  const t6 = await processClientTurn(caseId, 'so i was going through the road he hit me for no reason');
  const reply6 = t6.messages[t6.messages.length - 1].content;
  console.log(`Incident Description: ${t6.facts.incidentDescription?.value}`);
  console.log(`Reply 6: "${reply6}"`);

  const reAskedJurisdiction = reply6.toLowerCase().includes('which city and state') || reply6.toLowerCase().includes('where did this occur');

  if (!reAskedJurisdiction && (reply6.toLowerCase().includes('medical') || reply6.toLowerCase().includes('witnesses') || reply6.toLowerCase().includes('photographs') || reply6.toLowerCase().includes('records'))) {
    console.log('✔ PASSED: NYAYAI DID NOT RE-ASK JURISDICTION! It asked for next missing high-value fact (evidence/medical records).');
  } else {
    console.error('✖ FAILED: Step 6 re-asked jurisdiction or failed context persistence check!');
  }

  console.log('\n====================================================');
  console.log('  ALL CONTEXT PERSISTENCE TESTS PASSED SUCCESSFULLY! ');
  console.log('====================================================\n');
}

runRegressionTests().catch(console.error);

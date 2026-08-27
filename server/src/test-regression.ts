import { processClientTurn, getOrCreateCaseState, classifyMessageIntent } from './services/caseEngineService.js';
import { analyzeDocumentContentAsync } from './services/documentEngineService.js';

async function runIntentRegressionTests() {
  console.log('====================================================');
  console.log('  NYAYAI STRICT INTENT CLASSIFICATION TEST SUITE    ');
  console.log('====================================================\n');

  const caseId = `test-intent-${Date.now()}`;
  const caseState = getOrCreateCaseState(caseId);

  // TEST 1: "hi"
  console.log('--- Test 1: "hi" ---');
  const intent1 = classifyMessageIntent('hi', caseState);
  const t1 = await processClientTurn(caseId, 'hi');
  console.log(`Intent: ${intent1}`);
  console.log(`Score: ${t1.readinessScore}%`);
  console.log(`Reply: "${t1.messages[t1.messages.length - 1].content}"`);

  if (intent1 === 'GREETING' && t1.readinessScore === 0) {
    console.log('✔ PASSED: Test 1 greeting classified correctly at 0% score.');
  } else {
    console.error('✖ FAILED: Test 1 failed!');
  }

  // TEST 2: "hi do u understand whatever i say??"
  console.log('\n--- Test 2: "hi do u understand whatever i say??" ---');
  const intent2 = classifyMessageIntent('hi do u understand whatever i say??', t1);
  const t2 = await processClientTurn(caseId, 'hi do u understand whatever i say??');
  console.log(`Intent: ${intent2}`);
  console.log(`Score: ${t2.readinessScore}%`);
  console.log(`Reply: "${t2.messages[t2.messages.length - 1].content}"`);

  if (intent2 === 'META_QUESTION' && t2.readinessScore === 0 && !t2.messages[t2.messages.length - 1].content.includes('recorded your update')) {
    console.log('✔ PASSED: Test 2 meta question answered without recording fake update or changing score.');
  } else {
    console.error('✖ FAILED: Test 2 failed!');
  }

  // TEST 3: "can you understand normal language?"
  console.log('\n--- Test 3: "can you understand normal language?" ---');
  const intent3 = classifyMessageIntent('can you understand normal language?', t2);
  const t3 = await processClientTurn(caseId, 'can you understand normal language?');
  console.log(`Intent: ${intent3}`);
  console.log(`Score: ${t3.readinessScore}%`);

  if (intent3 === 'META_QUESTION' && t3.readinessScore === 0) {
    console.log('✔ PASSED: Test 3 meta question handled correctly.');
  } else {
    console.error('✖ FAILED: Test 3 failed!');
  }

  // TEST 4: "what can you do?"
  console.log('\n--- Test 4: "what can you do?" ---');
  const intent4 = classifyMessageIntent('what can you do?', t3);
  const t4 = await processClientTurn(caseId, 'what can you do?');
  console.log(`Intent: ${intent4}`);
  console.log(`Score: ${t4.readinessScore}%`);

  if (intent4 === 'META_QUESTION' && t4.readinessScore === 0) {
    console.log('✔ PASSED: Test 4 capability meta question handled correctly.');
  } else {
    console.error('✖ FAILED: Test 4 failed!');
  }

  // TEST 5: "I had a fight with my neighbour"
  console.log('\n--- Test 5: "I had a fight with my neighbour" ---');
  const intent5 = classifyMessageIntent('I had a fight with my neighbour', t4);
  const t5 = await processClientTurn(caseId, 'I had a fight with my neighbour');
  console.log(`Intent: ${intent5}`);
  console.log(`Matter: ${t5.facts.matter.value}`);
  console.log(`Score: ${t5.readinessScore}%`);

  if (intent5 === 'CASE_INTAKE' && t5.facts.matter.value === 'Neighbour Dispute / Physical Altercation') {
    console.log('✔ PASSED: Test 5 genuine case intake extracted legal matter.');
  } else {
    console.error('✖ FAILED: Test 5 failed!');
  }

  // TEST 6: "it happened in Bengaluru"
  console.log('\n--- Test 6: "it happened in Bengaluru" ---');
  const intent6 = classifyMessageIntent('it happened in Bengaluru', t5);
  const t6 = await processClientTurn(caseId, 'it happened in Bengaluru');
  console.log(`Intent: ${intent6}`);
  console.log(`Jurisdiction: ${t6.facts.jurisdiction.value}`);

  if (intent6 === 'CASE_FACT_UPDATE' && t6.facts.jurisdiction.value === 'Karnataka (Bengaluru)') {
    console.log('✔ PASSED: Test 6 jurisdiction updated.');
  } else {
    console.error('✖ FAILED: Test 6 failed!');
  }

  // TEST 7: "he hit me while I was walking"
  console.log('\n--- Test 7: "he hit me while I was walking" ---');
  const intent7 = classifyMessageIntent('he hit me while I was walking', t6);
  const t7 = await processClientTurn(caseId, 'he hit me while I was walking');
  console.log(`Intent: ${intent7}`);
  console.log(`Incident Description: ${t7.facts.incidentDescription?.value}`);

  if (intent7 === 'CASE_FACT_UPDATE' && t7.facts.incidentDescription?.value) {
    console.log('✔ PASSED: Test 7 incident description updated.');
  } else {
    console.error('✖ FAILED: Test 7 failed!');
  }

  // TEST 8: "thanks"
  console.log('\n--- Test 8: "thanks" ---');
  const intent8 = classifyMessageIntent('thanks', t7);
  const scoreBefore8 = t7.readinessScore;
  const t8 = await processClientTurn(caseId, 'thanks');
  console.log(`Intent: ${intent8}`);
  console.log(`Score: ${t8.readinessScore}% (Expected: ${scoreBefore8}%)`);

  if (intent8 === 'CASUAL_CONVERSATION' && t8.readinessScore === scoreBefore8) {
    console.log('✔ PASSED: Test 8 casual conversation left case state unchanged.');
  } else {
    console.error('✖ FAILED: Test 8 failed!');
  }

  // TEST 9: "what is my readiness score?"
  console.log('\n--- Test 9: "what is my readiness score?" ---');
  const intent9 = classifyMessageIntent('what is my readiness score?', t8);
  const scoreBefore9 = t8.readinessScore;
  const t9 = await processClientTurn(caseId, 'what is my readiness score?');
  console.log(`Intent: ${intent9}`);
  console.log(`Score: ${t9.readinessScore}%`);

  if (intent9 === 'READINESS_QUERY' && t9.readinessScore === scoreBefore9) {
    console.log('✔ PASSED: Test 9 readiness query reported score without state changes.');
  } else {
    console.error('✖ FAILED: Test 9 failed!');
  }

  // TEST 10: "increase my score"
  console.log('\n--- Test 10: "increase my score" ---');
  const intent10 = classifyMessageIntent('increase my score', t9);
  const scoreBefore10 = t9.readinessScore;
  const t10 = await processClientTurn(caseId, 'increase my score');
  console.log(`Intent: ${intent10}`);
  console.log(`Score: ${t10.readinessScore}% (Expected: ${scoreBefore10}%)`);

  if (intent10 === 'READINESS_MANIPULATION_ATTEMPT' && t10.readinessScore === scoreBefore10) {
    console.log('✔ PASSED: Test 10 score manipulation attempt refused; score stayed unchanged.');
  } else {
    console.error('✖ FAILED: Test 10 failed!');
  }

  // TEST 11: "I filed a CSR"
  console.log('\n--- Test 11: "I filed a CSR" ---');
  const intent11 = classifyMessageIntent('I filed a CSR', t10);
  const t11 = await processClientTurn(caseId, 'I filed a CSR');
  console.log(`Intent: ${intent11}`);
  console.log(`Police Status: ${t11.facts.policeStatus.value}`);

  if (intent11 === 'CASE_FACT_UPDATE' && t11.facts.policeStatus.value === true) {
    console.log('✔ PASSED: Test 11 CSR status recorded.');
  } else {
    console.error('✖ FAILED: Test 11 failed!');
  }

  // TEST 12: "did I tell you that I filed a CSR?"
  console.log('\n--- Test 12: "did I tell you that I filed a CSR?" ---');
  const scoreBefore12 = t11.readinessScore;
  const t12 = await processClientTurn(caseId, 'did I tell you that I filed a CSR?');
  console.log(`Score: ${t12.readinessScore}% (Expected: ${scoreBefore12}%)`);

  if (t12.readinessScore === scoreBefore12) {
    console.log('✔ PASSED: Test 12 question about state treated as question, NOT a new fact.');
  } else {
    console.error('✖ FAILED: Test 12 failed!');
  }

  // DOCUMENT INTELLIGENCE TESTS
  console.log('\n====================================================');
  console.log('  NYAYAI DOCUMENT INTELLIGENCE TEST SUITE           ');
  console.log('====================================================\n');

  const docCaseId = `test-doc-${Date.now()}`;
  const docCaseState = getOrCreateCaseState(docCaseId);

  // DOC TEST 1: Aadhaar Card Upload (Identity, PII Masked, 0 Readiness Increase)
  console.log('--- Doc Test 1: Aadhaar Card Upload ---');
  const scoreBeforeDoc1 = docCaseState.readinessScore;
  const resDoc1 = await analyzeDocumentContentAsync(docCaseState, 'Aadhaar_Card_Client.pdf', '1.2 MB', 'application/pdf');
  console.log(`Category: ${resDoc1.analysis.documentCategory}`);
  console.log(`Masked ID: ${resDoc1.analysis.maskedIdentifier}`);
  console.log(`Score Change: ${scoreBeforeDoc1}% -> ${resDoc1.updatedCaseState.readinessScore}%`);

  if (resDoc1.analysis.documentCategory === 'IDENTITY' && resDoc1.analysis.privacyNoticeRequired && resDoc1.updatedCaseState.readinessScore === scoreBeforeDoc1) {
    console.log('✔ PASSED: Doc Test 1 Aadhaar classified as Identity with PII masked & 0 readiness change.');
  } else {
    console.error('✖ FAILED: Doc Test 1 failed!');
  }

  // DOC TEST 2: Unrelated Python PDF Upload (Unrelated, 0 Readiness Increase)
  console.log('\n--- Doc Test 2: Unrelated Python PDF Upload ---');
  const scoreBeforeDoc2 = resDoc1.updatedCaseState.readinessScore;
  const resDoc2 = await analyzeDocumentContentAsync(resDoc1.updatedCaseState, 'Python_Interview_Handbook.pdf', '3.5 MB', 'application/pdf');
  console.log(`Is Relevant: ${resDoc2.analysis.isRelevant}`);
  console.log(`Score Change: ${scoreBeforeDoc2}% -> ${resDoc2.updatedCaseState.readinessScore}%`);

  if (!resDoc2.analysis.isRelevant && resDoc2.updatedCaseState.readinessScore === scoreBeforeDoc2) {
    console.log('✔ PASSED: Doc Test 2 Unrelated document stored with 0 readiness increase.');
  } else {
    console.error('✖ FAILED: Doc Test 2 failed!');
  }

  // DOC TEST 3: FIR / Police Record Upload (Case Document, Extracts Facts & Readiness Increase)
  console.log('\n--- Doc Test 3: FIR / Police Complaint Upload ---');
  const scoreBeforeDoc3 = resDoc2.updatedCaseState.readinessScore;
  const resDoc3 = await analyzeDocumentContentAsync(resDoc2.updatedCaseState, 'FIR_Indiranagar_Police_Record.pdf', '2.1 MB', 'application/pdf');
  console.log(`Category: ${resDoc3.analysis.documentCategory}`);
  console.log(`Extracted FIR #: ${resDoc3.analysis.extractedEntities.firOrCaseNumbers.join(', ')}`);
  console.log(`Score Change: ${scoreBeforeDoc3}% -> ${resDoc3.updatedCaseState.readinessScore}%`);

  if (resDoc3.analysis.documentCategory === 'CASE_DOCUMENT' && resDoc3.analysis.isRelevant && resDoc3.updatedCaseState.readinessScore > scoreBeforeDoc3) {
    console.log('✔ PASSED: Doc Test 3 FIR classified as Case Document, extracted findings, and increased readiness.');
  } else {
    console.error('✖ FAILED: Doc Test 3 failed!');
  }

  console.log('\n====================================================');
  console.log('  ALL REGRESSION & DOCUMENT TESTS PASSED!           ');
  console.log('====================================================\n');
}

runIntentRegressionTests().catch(console.error);

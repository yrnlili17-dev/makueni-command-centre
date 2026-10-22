import test from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH_FACTS, RESEARCH_SOURCES, getMakueniResearch, buildMakueniResearchAnswer, isMakueniResearchQuestion, buildCountyEvidenceReview } from '../src/data/makueni-research.ts';

test('every fact is Makueni-only with a reviewed official source and dated evidence type', () => {
  const ids = new Set();
  for (const f of RESEARCH_FACTS) {
    assert.equal(f.countyCode, '017');
    assert.equal(f.geography, 'Makueni County');
    assert.ok(!ids.has(f.id)); ids.add(f.id);
    const source = RESEARCH_SOURCES.find(s => s.id === f.sourceId);
    assert.ok(source, f.sourceId);
    assert.equal(source.kind, 'official');
    assert.ok(['document-reviewed', 'page-reviewed'].includes(source.status));
    assert.ok(f.period && f.kind && f.unit && f.caution && f.locator);
    if (source.status === 'document-reviewed') {
      assert.match(source.sha256, /^[a-f0-9]{64}$/);
      assert.ok(source.reviewedPdfPages.includes(f.pdfPage), `${f.id}: source page must have been reviewed`);
    }
  }
});

test('retrieval respects topic, case, no-match and result limits', () => {
  const water = getMakueniResearch('WATER', 'water', 3);
  assert.equal(water.facts.length, 3);
  assert.ok(water.facts.every(f => f.topic === 'water'));
  assert.equal(getMakueniResearch('zzzzunmatched').facts.length, 0);
  assert.equal(getMakueniResearch('', 'all', Infinity).facts.length, RESEARCH_FACTS.length);
  assert.equal(getMakueniResearch('', 'all', -3).facts.length, 1);
  assert.equal(getMakueniResearch('x'.repeat(500)).query.length, 400);
});

test('source conflicts, denominator differences and rounded sanitation values remain visible', () => {
  const fact = id => RESEARCH_FACTS.find(f => f.id === id);
  assert.deepEqual(['area-2018', 'county-area-profile', 'area-2023'].map(id => fact(id).value), [8008.7, 8008.9, 8176.7]);
  const sanitation = ['sanitation-improved-2019', 'sanitation-unimproved-2019', 'sanitation-shared-2019', 'sanitation-open-2019'].map(fact);
  assert.equal(sanitation.reduce((n, f) => n + f.value, 0), 100.4);
  assert.equal(fact('potable-coverage-2017').unit, '% of population');
  assert.equal(fact('safe-water-baseline-2021').unit, '% of households');
  assert.equal(fact('safe-water-target-2027').kind, 'target');
  assert.equal(fact('population-projection-2027').kind, 'projection');
  assert.match(fact('population-projection-2027').caution, /1,087,775/);
});

test('factual answers preserve links, historical labels and current-evidence limitations', () => {
  const answer = buildMakueniResearchAnswer('sanitation 2019');
  assert.match(answer, /33/);
  assert.match(answer, /2019/);
  assert.match(answer, /PDF page 11/);
  assert.match(answer, /worldbank.org/);
  assert.match(answer, /do not establish current conditions/);
});

test('unreviewed discoveries cannot become numerical facts or candidate assessments', () => {
  const excluded = RESEARCH_SOURCES.filter(s => !['document-reviewed', 'page-reviewed'].includes(s.status));
  for (const s of excluded) assert.ok(RESEARCH_FACTS.every(f => f.sourceId !== s.id));
  assert.equal(isMakueniResearchQuestion('Explain Makueni CIDP water baselines'), true);
  assert.equal(isMakueniResearchQuestion('Help me navigate settings'), false);
  assert.match(buildMakueniResearchAnswer('unmatched'), /No reviewed indicator/);
  assert.match(buildCountyEvidenceReview().note, /not a candidate assessment/);
});


test('natural questions rank the requested indicator above general CIDP metadata', () => {
  const rows = getMakueniResearch('What does the Makueni CIDP say about safe-water baselines and targets?', 'all', 6).facts;
  assert.ok(rows.some(f => f.id === 'safe-water-baseline-2021'));
  assert.ok(rows.some(f => f.id === 'safe-water-target-2027'));
  assert.ok(rows.every(f => f.topic === 'water'));
  assert.equal(getMakueniResearch('health facilities', 'all', 1).facts[0].topic, 'health');
});

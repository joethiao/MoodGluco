// Tests unitaires MoodGluco — logique métier (exécutés avec le test runner de Node).
// Chaque fonction reproduit fidèlement la logique de l'application (mêmes seuils,
// mêmes règles) afin de la tester de façon isolée.
//
// Lancer :  node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ─── 1. Garde-fou : refus des demandes médicales (src/services/ollamaClient.js) ──
const MEDICAL_REFUSAL_PATTERNS = [
  /\bdiagnos(?:e|er|is|tic|tique|tiques?)\b/i,
  /\btraitement\b/i,
  /\bdose(?:s)?\b/i,
  /\bdosage\b/i,
  /\bprescri(?:re|ption)?\b/i,
  /\bwhat\s+do\s+i\s+have\b/i,
  /\burgent\b/i,
];
function shouldRefuseMedicalRequest(text = '') {
  const t = String(text).trim();
  if (!t) return false;
  return MEDICAL_REFUSAL_PATTERNS.some((p) => p.test(t));
}

// ─── 2. Impact glycémique d'un repas (seuils de l'application) ───────────────────
function glycemicImpact(carbs) {
  if (carbs < 30) return 'low';
  if (carbs < 50) return 'medium';
  return 'high';
}

// ─── 3. Statut d'un médicament (src/screens/MedicationsScreen.js) ────────────────
const toMinutes = (hhmm) => {
  const [h, m] = (hhmm || '').split(':').map(Number);
  return h * 60 + m;
};
function medicationStatus(med, nowMinutes, todayKey) {
  if (med.taken[todayKey]) return 'none';
  for (const t of med.schedule) {
    const m = toMinutes(t);
    if (nowMinutes >= m - 5 && nowMinutes < m) return 'pre-due';
    if (nowMinutes >= m && nowMinutes - m <= 60) return 'due';
    if (nowMinutes - m > 60) return 'missed';
  }
  return 'none';
}

// ─── 4. Détection des tendances (src/screens/AnalysisScreen.js) ──────────────────
function detectPatterns(moods, glucose, meals) {
  const out = [];
  const evening = moods.filter((mo) => {
    const h = new Date(mo.timestamp).getHours();
    return h >= 18 && h <= 23 && mo.mood <= 2;
  });
  if (evening.length >= 2) out.push('Stress le soir');
  if (glucose.filter((g) => g.value > 140).length >= 3) out.push('Pics de glycemie frequents');
  if (meals.length >= 3 && meals.filter((m) => m.glycemicImpact === 'high').length >= 2)
    out.push('Repas a impact glycemique eleve');
  if (out.length === 0) out.push('Continuez le suivi');
  return out;
}

// ─── 5. Bilan du jour (écran « Mon bilan du jour ») ──────────────────────────────
function dailyReport(glucose) {
  const values = glucose.map((g) => g.value);
  return {
    count: values.length,
    average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    min: Math.min(...values),
    max: Math.max(...values),
    inRange: values.every((v) => v >= 70 && v <= 180),
  };
}

// =================================================================================
//  TESTS
// =================================================================================

test('Garde-fou : refuse une demande de changement de dose', () => {
  assert.equal(shouldRefuseMedicalRequest('Change my insulin dose to 20 units'), true);
});

test('Garde-fou : refuse « what do I have » et « urgent »', () => {
  assert.equal(shouldRefuseMedicalRequest('what do i have'), true);
  assert.equal(shouldRefuseMedicalRequest('this is urgent'), true);
});

test('Garde-fou : laisse passer une question alimentaire normale', () => {
  assert.equal(shouldRefuseMedicalRequest('Can I eat bread?'), false);
  assert.equal(shouldRefuseMedicalRequest('What can I eat for breakfast?'), false);
});

test('Impact glycemique : low / medium / high selon les glucides', () => {
  assert.equal(glycemicImpact(25), 'low');
  assert.equal(glycemicImpact(45), 'medium');
  assert.equal(glycemicImpact(60), 'high');
});

test('Medicament : « a prendre » dans l\'heure qui suit l\'horaire', () => {
  const med = { schedule: ['08:00'], taken: {} };
  assert.equal(medicationStatus(med, 8 * 60 + 30, '2026-06-04'), 'due');
});

test('Medicament : « oublie » plus d\'une heure apres l\'horaire', () => {
  const med = { schedule: ['08:00'], taken: {} };
  assert.equal(medicationStatus(med, 9 * 60 + 30, '2026-06-04'), 'missed');
});

test('Medicament : « bientot » 5 minutes avant l\'horaire', () => {
  const med = { schedule: ['08:00'], taken: {} };
  assert.equal(medicationStatus(med, 7 * 60 + 57, '2026-06-04'), 'pre-due');
});

test('Medicament : aucun rappel si deja pris aujourd\'hui', () => {
  const med = { schedule: ['08:00'], taken: { '2026-06-04': true } };
  assert.equal(medicationStatus(med, 8 * 60 + 30, '2026-06-04'), 'none');
});

test('Tendances : detecte les pics de glycemie (>=3 valeurs > 140)', () => {
  const glucose = [{ value: 150 }, { value: 145 }, { value: 160 }, { value: 120 }];
  assert.ok(detectPatterns([], glucose, []).includes('Pics de glycemie frequents'));
});

test('Tendances : message neutre quand il n\'y a pas de donnees', () => {
  assert.deepEqual(detectPatterns([], [], []), ['Continuez le suivi']);
});

test('Bilan du jour : moyenne, min, max et zone cible', () => {
  const r = dailyReport([{ value: 126 }, { value: 163 }]);
  assert.equal(r.count, 2);
  assert.equal(r.average, 145);
  assert.equal(r.min, 126);
  assert.equal(r.max, 163);
  assert.equal(r.inRange, true);
});

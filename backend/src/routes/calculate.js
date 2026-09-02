/**
 * Calculation routes — FR5/FR6/FR7 (calculation) + FR8 (validation) +
 * FR9 (step breakdown), now requiring authentication and persisting
 * each result to history (FR10) tagged with the selected category (FR3).
 */

const express = require('express');
const { runWeightBasedCalculation, runBSABasedCalculation } = require('../calculations');
const { validateWeight, validateHeight, validateDose } = require('../validation');
const { requireAuth } = require('../middleware/auth');

const CATEGORIES = [
  'General',
  'Adult Medical/Surgical',
  'Oncology',
  'Outpatient/Ambulatory',
  'Intensive Care',
  'Emergency Department',
  'Paediatrics',
  'Pharmacy',
];

function createCalculateRouter(db) {
  const router = express.Router();

  function validateCategory(category) {
    if (!CATEGORIES.includes(category)) {
      return `Category must be one of: ${CATEGORIES.join(', ')}.`;
    }
    return null;
  }

  function saveRecord({ userId, category, calcType, result }) {
    // FR10 — append-only insert; no update/delete path exists (NFR10).
    db.prepare(
      'INSERT INTO calculations (user_id, category, calc_type, result) VALUES (?, ?, ?, ?)'
    ).run(userId, category, calcType, result);
  }

  router.post('/weight-based', requireAuth, (req, res) => {
    const { category, weightValue, weightUnit, dosePerKg } = req.body;

    const errors = [
      validateCategory(category),
      validateWeight(weightValue, weightUnit),
      validateDose(dosePerKg, 'Dose per kg'),
    ].filter(Boolean);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const result = runWeightBasedCalculation(Number(weightValue), weightUnit, Number(dosePerKg));

    saveRecord({ userId: req.user.id, category, calcType: 'weight-based', result: result.result });

    return res.json(result);
  });

  router.post('/bsa-based', requireAuth, (req, res) => {
    const { category, weightValue, weightUnit, heightCm, dosePerM2 } = req.body;

    const errors = [
      validateCategory(category),
      validateWeight(weightValue, weightUnit),
      validateHeight(heightCm),
      validateDose(dosePerM2, 'Dose per m²'),
    ].filter(Boolean);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const result = runBSABasedCalculation(
      Number(weightValue),
      weightUnit,
      Number(heightCm),
      Number(dosePerM2)
    );

    saveRecord({ userId: req.user.id, category, calcType: 'bsa-based', result: result.result });

    return res.json(result);
  });

  return router;
}

module.exports = { createCalculateRouter, CATEGORIES };

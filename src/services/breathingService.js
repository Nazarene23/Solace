const path = require('node:path');

const {
  loadContentPacks,
} = require('../utils/contentLoader');

const breathingExercises = loadContentPacks(
  path.join(__dirname, '../data/breathing'),
);

function getBreathingExercise(category) {
  const matchingExercises =
    breathingExercises.filter(
      (exercise) =>
        exercise.category === category,
    );

  if (matchingExercises.length === 0) {
    throw new Error(
      `No breathing exercises found for category: ${category}`,
    );
  }

  return matchingExercises[
    Math.floor(
      Math.random() * matchingExercises.length,
    )
  ];
}

module.exports = {
  getBreathingExercise,
};
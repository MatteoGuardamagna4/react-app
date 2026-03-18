/**
 * Preprocessing and clustering logic.
 *
 * Since we don't have the Python KMeans model in JS, we use a simplified
 * rule-based clustering that mimics the 4-cluster behavior based on
 * experience level and workout frequency.
 */

export function preprocessUserInput(userData) {
  const bmi = userData.weight_kg / (userData.height_m ** 2);
  const exp = userData.experience_level;
  const estimatedMaxBpm = 220 - userData.age;
  const estimatedAvgBpm = estimatedMaxBpm * (0.6 + exp * 0.05);
  const estimatedRestingBpm = 80 - exp * 5;
  const estimatedFatPct = (userData.gender === 'Male' ? 25 : 30) - exp * 3;
  const estimatedCalories = (userData.session_duration * 300) + (exp * 100);

  return {
    age: userData.age,
    weight: userData.weight_kg,
    height: userData.height_m,
    maxBpm: estimatedMaxBpm,
    avgBpm: estimatedAvgBpm,
    restingBpm: estimatedRestingBpm,
    sessionDuration: userData.session_duration,
    calories: estimatedCalories,
    fatPct: estimatedFatPct,
    waterIntake: userData.water_intake,
    frequency: userData.workout_frequency,
    experience: exp,
    bmi,
  };
}

export function assignCluster(features) {
  // Simplified rule-based clustering mimicking KMeans behavior:
  // Cluster 0: Beginner, low frequency
  // Cluster 1: Intermediate, moderate frequency
  // Cluster 2: Advanced, high frequency
  // Cluster 3: High BMI or specialized goals
  const { experience, frequency, bmi } = features;

  if (bmi > 30 && experience <= 1) return 3;
  if (experience >= 3 && frequency >= 5) return 2;
  if (experience >= 2 && frequency >= 3) return 1;
  return 0;
}

const CLUSTER_STATS = {
  0: { avg_calories: 320, avg_bpm: 128, cluster_size: 245 },
  1: { avg_calories: 450, avg_bpm: 142, cluster_size: 198 },
  2: { avg_calories: 580, avg_bpm: 155, cluster_size: 156 },
  3: { avg_calories: 380, avg_bpm: 135, cluster_size: 174 },
};

export function getClusterSummary(cluster) {
  return CLUSTER_STATS[cluster] || CLUSTER_STATS[0];
}

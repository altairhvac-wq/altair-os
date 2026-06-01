export type DispatchRecommendationConfidence = "high" | "medium" | "low";

export type DispatchTechnicianRecommendation = {
  technicianId: string;
  technicianName: string;
  confidence: DispatchRecommendationConfidence;
  reasons: string[];
};

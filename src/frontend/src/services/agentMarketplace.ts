// Agent marketplace types and data

export interface Agent {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  previewImage: string;
  category: "automation" | "analysis" | "communication" | "productivity";
  nodeType: string; // Type to use in React Flow
}

export interface PurchasedAgent {
  agentId: string;
  purchaseDate: string;
  agent: Agent;
}

// Dummy agent data
export const marketplaceAgents: Agent[] = [
  {
    id: "weather-pro",
    name: "Weather Pro Agent",
    description:
      "Advanced weather forecasting agent with real-time data analysis and predictive modeling. Perfect for travel planning and outdoor activities.",
    price: 29.99,
    rating: 4.8,
    reviewCount: 342,
    tags: ["weather", "forecasting", "real-time", "travel"],
    previewImage: "🌤️",
    category: "analysis",
    nodeType: "weatherAgent",
  },
  {
    id: "client-support",
    name: "Smart Client Agent",
    description:
      "AI-powered customer support agent with natural language processing and sentiment analysis. Handles inquiries 24/7 with human-like responses.",
    price: 49.99,
    rating: 4.9,
    reviewCount: 728,
    tags: ["customer-service", "nlp", "support", "24/7"],
    previewImage: "🤖",
    category: "communication",
    nodeType: "clientAgent",
  },
  {
    id: "data-analyst",
    name: "Data Analytics Agent",
    description:
      "Powerful data analysis agent that processes large datasets, generates insights, and creates visualizations. Perfect for business intelligence.",
    price: 79.99,
    rating: 4.7,
    reviewCount: 156,
    tags: ["analytics", "data-science", "visualization", "business"],
    previewImage: "📊",
    category: "analysis",
    nodeType: "dataAgent",
  },
];

// Filter and sort options
export const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "automation", label: "Automation" },
  { value: "analysis", label: "Analysis" },
  { value: "communication", label: "Communication" },
  { value: "productivity", label: "Productivity" },
];

export const sortOptions = [
  { value: "name", label: "Alphabetical" },
  { value: "category", label: "Category" },
];

// Local storage helpers
export const getPurchasedAgents = (): PurchasedAgent[] => {
  try {
    const stored = localStorage.getItem("purchasedAgents");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addPurchasedAgent = (agent: Agent): void => {
  try {
    const purchasedAgents = getPurchasedAgents();
    const newPurchase: PurchasedAgent = {
      agentId: agent.id,
      purchaseDate: new Date().toISOString(),
      agent,
    };
    purchasedAgents.push(newPurchase);
    localStorage.setItem("purchasedAgents", JSON.stringify(purchasedAgents));
  } catch (error) {
    console.error("Failed to save purchased agent:", error);
  }
};

export const isPurchased = (agentId: string): boolean => {
  const purchasedAgents = getPurchasedAgents();
  return purchasedAgents.some((purchase) => purchase.agentId === agentId);
};

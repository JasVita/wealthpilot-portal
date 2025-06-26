import { Coins, PieChart, Layers, Calendar } from "lucide-react";

interface InfoCard {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
}

const InfoCards = () => {
  const cards: InfoCard[] = [
    {
      title: "Total Market Value",
      value: "$2,847,290",
      icon: Coins,
      subtitle: "+2.4% this month",
    },
    {
      title: "% of Total Portfolio",
      value: "23.8%",
      icon: PieChart,
      subtitle: "Well balanced",
    },
    {
      title: "# Structured Notes",
      value: "14",
      icon: Layers,
      subtitle: "Active positions",
    },
    {
      title: "Maturing ≤ 30 days",
      value: "$385,000",
      icon: Calendar,
      subtitle: "2 notes maturing",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="glass-card rounded-lg p-6 hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-[#11223D]/70 mb-1">{card.title}</p>
              <p className="text-2xl font-semibold text-[#11223D]">{card.value}</p>
            </div>
            <div className="ml-4">
              <card.icon className="w-6 h-6 text-[#0CA3A3]" />
            </div>
          </div>
          {card.subtitle && <p className="text-xs text-[#11223D]/50">{card.subtitle}</p>}
        </div>
      ))}
    </div>
  );
};

export default InfoCards;

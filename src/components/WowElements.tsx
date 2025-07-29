import React from 'react';
import { motion } from 'framer-motion';

interface WowElementProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  stats?: Array<{
    label: string;
    value: string;
    trend?: string;
  }>;
  expansion?: {
    possibilities: string[];
    futureVision: string[];
    successStories: string[];
  };
}

export const WowElement: React.FC<WowElementProps> = ({
  title,
  description,
  icon,
  color,
  stats,
  expansion,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-center mb-4">
        <div className="text-3xl mr-3">{icon}</div>
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
      </div>

      <p className="text-gray-600 mb-6">{description}</p>

      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">{stat.label}</div>
              <div className="text-lg font-semibold">{stat.value}</div>
              {stat.trend && <div className="text-sm text-green-500">{stat.trend}</div>}
            </div>
          ))}
        </div>
      )}

      {expansion && (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">확장 가능성</h4>
            <ul className="list-disc list-inside text-gray-600">
              {expansion.possibilities.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">미래 비전</h4>
            <ul className="list-disc list-inside text-gray-600">
              {expansion.futureVision.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">성공 사례</h4>
            <ul className="list-disc list-inside text-gray-600">
              {expansion.successStories.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const WowElements: React.FC<{
  elements: WowElementProps[];
}> = ({ elements }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {elements.map((element, index) => (
        <WowElement key={index} {...element} />
      ))}
    </div>
  );
};

import React from 'react';

interface FlowNodeCardProps {
  node: {
    id: string;
    icon: string;
    title: string;
    subtitle: string;
    duration: string;
    preview: string;
    techTags: string[];
    level?: number;
  };
  onClick: () => void;
}

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
];

const FlowNodeCard: React.FC<FlowNodeCardProps> = ({ node, onClick }) => {
  const idx = parseInt(node.id, 10) - 1;
  const level = node.level || 0;

  return (
    <div
      className={`flow-step step${node.id}`}
      style={{
        background: '#fff',
        borderRadius: 20,
        padding: 24,
        minWidth: 220,
        maxWidth: 260,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        margin: '0 10px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translateY(${level * 20}px)`,
        animation: 'cardEntrance 0.5s ease-out',
      }}
      onClick={onClick}
      onMouseOver={e => {
        (e.currentTarget as HTMLDivElement).style.transform = `translateY(${level * 20 - 8}px) scale(1.02)`;
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 12px 40px rgba(108, 92, 231, 0.15)';
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLDivElement).style.transform = `translateY(${level * 20}px)`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
      }}
    >
      <style>
        {`
          @keyframes cardEntrance {
            from {
              opacity: 0;
              transform: translateY(${level * 20 + 20}px);
            }
            to {
              opacity: 1;
              transform: translateY(${level * 20}px);
            }
          }
        `}
      </style>
      <div
        className="step-number"
        style={{
          position: 'absolute',
          top: -12,
          left: 24,
          width: 24,
          height: 24,
          background: '#fff',
          border: '3px solid #6C5CE7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: '#6C5CE7',
          zIndex: 3,
        }}
      >
        {node.id}
      </div>
      <div
        className="step-icon"
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          marginBottom: 16,
          background: gradients[idx % gradients.length],
          color: '#fff',
          transition: 'all 0.3s ease',
        }}
      >
        {node.icon}
      </div>
      <div
        className="step-title"
        style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 6 }}
      >
        {node.title}
      </div>
      <div
        className="step-subtitle"
        style={{ fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 1.4 }}
      >
        {node.subtitle}
      </div>
      <div
        className="step-duration"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#F0F7FF',
          color: '#6C5CE7',
          padding: '6px 12px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        ⏱️ {node.duration}
      </div>
      <div
        className="step-preview"
        style={{
          background: '#F8F9FA',
          borderRadius: 12,
          padding: 12,
          fontSize: 13,
          color: '#666',
          marginBottom: 16,
        }}
      >
        {node.preview}
      </div>
      <div
        className="step-tech"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}
      >
        {node.techTags.map(tag => (
          <span
            key={tag}
            className="tech-tag"
            style={{
              background: '#E1ECFF',
              color: '#6C5CE7',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default FlowNodeCard;

import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'How-AI API Documentation',
        version: '1.0.0',
        description: '자동화 레시피 생성 및 관리 API 문서',
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
          description: 'API 서버',
        },
      ],
      components: {
        schemas: {
          AutomationData: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              header: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  subtitle: { type: 'string' },
                },
              },
              flowDiagram: {
                type: 'object',
                properties: {
                  nodes: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/FlowNode',
                    },
                  },
                  connections: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/FlowConnection',
                    },
                  },
                },
              },
            },
          },
          FlowNode: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string' },
              color: { type: 'string' },
              details: {
                type: 'object',
                properties: {
                  guide: { type: 'string' },
                  code: { type: 'string' },
                  tips: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  planB: { type: 'string' },
                  failureCases: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  expansion: { type: 'string' },
                },
              },
            },
          },
          FlowConnection: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              type: { type: 'string', enum: ['solid', 'dashed'] },
              color: { type: 'string' },
              path: { type: 'string' },
            },
          },
        },
      },
    },
  });
  return spec;
};

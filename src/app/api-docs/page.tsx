import { getApiDocs } from '../api/swagger';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocs() {
  const spec = getApiDocs();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API 문서</h1>
      <SwaggerUI spec={spec} />
    </div>
  );
}

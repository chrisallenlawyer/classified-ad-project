import { useEffect, useState } from 'react';
import { getPromotedListings } from '../services/supabaseApi';

export function ApiTest() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testApi = async () => {
      try {
        console.log('Testing API...');
        const response = await getPromotedListings(2);
        console.log('API Response:', response);
        setData(response);
      } catch (err) {
        console.error('API Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testApi();
  }, []);

  if (loading) return <div className="p-4 bg-yellow-100">Testing API...</div>;
  if (error) return <div className="p-4 bg-red-100">Error: {error}</div>;
  
  return (
    <div className="p-4 bg-green-100">
      <h3 className="font-bold">API Test Results:</h3>
      <pre className="text-xs mt-2">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}





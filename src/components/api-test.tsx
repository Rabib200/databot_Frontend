"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export function ApiTestComponent() {
  const [apiUrl, setApiUrl] = useState('http://52.230.98.48');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testApiConnection = async () => {
    setIsLoading(true);
    setStatus(null);
    
    try {
      // Try to connect to the API
      const response = await fetch(`${apiUrl}/`);
      
      if (response.ok) {
        const data = await response.json();
        setStatus(`Connected successfully! API responded with: ${JSON.stringify(data)}`);
        toast.success('API connection successful!');
      } else {
        setStatus(`Connection failed with status: ${response.status}`);
        toast.error('API connection failed');
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('API connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Connection Test</CardTitle>
        <CardDescription>
          Test the connection to your FastAPI backend
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Input 
              value={apiUrl} 
              onChange={(e) => setApiUrl(e.target.value)} 
              placeholder="API URL"
              className="flex-1"
            />
            <Button onClick={testApiConnection} disabled={isLoading}>
              {isLoading ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
          
          {status && (
            <div className={`p-3 rounded-md text-sm ${status.includes('Error') || status.includes('failed') ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'}`}>
              {status}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        Make sure your FastAPI server is running on the specified URL
      </CardFooter>
    </Card>
  );
}

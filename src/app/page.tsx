import { DataAnalysisInterface } from "@/components/data-analysis-interface";
import { ApiTestComponent } from "@/components/api-test";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            AI Data Analysis System
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Upload your data files and chat with our AI assistant to get insights
          </p>
        </header>
        
        <Tabs defaultValue="data-analysis" className="mb-10">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="data-analysis">Data Analysis</TabsTrigger>
            <TabsTrigger value="api-test">API Test</TabsTrigger>
          </TabsList>
          <TabsContent value="data-analysis">
            <DataAnalysisInterface />
          </TabsContent>
          <TabsContent value="api-test">
            <div className="max-w-md mx-auto mt-6">
              <ApiTestComponent />
            </div>
            
            <Card className="max-w-md mx-auto mt-6">
              <CardHeader>
                <CardTitle>Backend API Configuration</CardTitle>
                <CardDescription>
                  Information about the FastAPI backend setup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-medium">API Endpoints:</h3>
                    <ul className="list-disc pl-5 mt-2">
                      <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/upload/excel/</code> - Upload Excel files</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/chat/</code> - Chat with AI about data</li>
                      <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/conversations/{"{file_id}"}</code> - Get conversation history</li>
                    </ul>
                  </div>
                  <p>Make sure your FastAPI server is running and accessible at the specified URL.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <footer className="mt-20 text-center text-gray-500 dark:text-gray-400 text-sm py-4 border-t border-gray-200 dark:border-gray-800">
          <p>© {new Date().getFullYear()} AI Data Analysis System. Powered by Azure OpenAI.</p>
        </footer>
      </div>
    </div>
  );
}


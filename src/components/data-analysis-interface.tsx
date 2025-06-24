"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { uploadFile, sendChatMessage } from "@/services/api";
import { DataVisualization, parseChartDataFromResponse, ChartData } from "./data-visualization";

// Define interfaces for TypeScript
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  charts?: ChartData[];
}

interface FileData {
  file_id: string;
  filename: string;
  summary: {
    rows: number;
    columns: string[];
    data_types: Record<string, string>;
  };
  data_preview: Record<string, unknown>[];
}

export function DataAnalysisInterface() {
  // State variables
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [visualizationCharts, setVisualizationCharts] = useState<ChartData[]>([]);

  // Function to handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if file is Excel or CSV
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      toast.error("Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulated upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 5;
      });
    }, 100);
    
    try {
      // Use the API service to upload the file
      const data = await uploadFile(file);
      setFileData(data);
      setActiveFileId(data.file_id);
      
      // Add welcome message from assistant
      setMessages([
        {
          role: "assistant",
          content: `I've processed your file "${data.filename}". This dataset has ${data.summary.rows} rows and ${data.summary.columns.length} columns. How can I help you analyze this data?`,
          timestamp: new Date().toISOString()
        }
      ]);
      
      toast.success("File uploaded successfully!");
      
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file. Please try again.");
    } finally {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => setIsUploading(false), 500);
    }
  };

  // Function to send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeFileId) return;
    
    const userMessage = {
      role: "user" as const,
      content: newMessage,
      timestamp: new Date().toISOString()
    };
    
    // Update UI immediately with user message
    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsSending(true);
    
    try {
      // Use the API service to send the message
      const data = await sendChatMessage(activeFileId, userMessage.content);
      
      // Parse chart data from the analysis text
      const charts = parseChartDataFromResponse(data.analysis);
      
      // Update visualization charts when new charts are available
      if (charts.length > 0) {
        setVisualizationCharts(charts);
      }
      
      // Add assistant response with any chart data
      setMessages(prev => [
        ...prev, 
        {
          role: "assistant",
          content: data.analysis,
          timestamp: new Date().toISOString(),
          charts: charts.length > 0 ? charts : undefined
        }
      ]);
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to get a response. Please try again.");
      
      // Add error message
      setMessages(prev => [
        ...prev, 
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {!activeFileId ? (
        // File Upload UI
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Upload Your Data</CardTitle>
            <CardDescription>
              Upload an Excel or CSV file to begin analyzing your data with our AI assistant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800">
              <svg
                className="w-12 h-12 mb-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Excel files (XLSX, XLS) or CSV files
              </p>
              
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="mt-4"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              
              {isUploading && (
                <div className="w-full mt-4">
                  <p className="text-sm mb-2">Uploading... {uploadProgress}%</p>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Data Analysis Interface with Chat and Visualization in separate sections
        <div className="flex flex-col gap-6">
          {/* Top section with file info and chat */}
          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            {/* File Information Card */}
            <Card className="h-[600px] overflow-hidden">
              <CardHeader className="p-4">
                <CardTitle className="text-lg">File Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 overflow-auto">
                {fileData && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-1">Filename</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                        {fileData.filename}
                        <span className="ml-2">
                          <Badge variant="outline">
                            {fileData.filename.toLowerCase().endsWith('.csv') 
                              ? 'CSV' 
                              : fileData.filename.toLowerCase().endsWith('.xlsx') 
                                ? 'XLSX' 
                                : 'XLS'}
                          </Badge>
                        </span>
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-1">Data Summary</h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400">
                        <li>Rows: {fileData.summary.rows}</li>
                        <li>Columns: {fileData.summary.columns.length}</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-1">Columns</h4>
                      <div className="flex flex-wrap gap-1">
                        {fileData.summary.columns.map((column, index) => (
                          <Badge key={index} variant="outline">
                            {column}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <Tabs defaultValue="preview">
                      <TabsList className="w-full">
                        <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
                        <TabsTrigger value="types" className="flex-1">Data Types</TabsTrigger>
                      </TabsList>
                      <TabsContent value="preview" className="mt-2">
                        <div className="overflow-x-auto">
                          {fileData.data_preview && fileData.data_preview.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {Object.keys(fileData.data_preview[0]).map((key) => (
                                    <TableHead key={key} className="whitespace-nowrap">
                                      {key}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {fileData.data_preview.slice(0, 5).map((row, rowIndex) => (
                                  <TableRow key={rowIndex}>
                                    {Object.values(row).map((value, colIndex) => (
                                      <TableCell key={colIndex} className="whitespace-nowrap">
                                        {value !== null ? String(value) : "null"}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-gray-500">No preview available</p>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="types">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Column</TableHead>
                                <TableHead>Type</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fileData.summary.data_types && Object.entries(fileData.summary.data_types).map(([column, type], index) => (
                                <TableRow key={index}>
                                  <TableCell>{column}</TableCell>
                                  <TableCell>{type}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Chat with AI Card */}
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="p-4 border-b">
                <CardTitle>Chat with AI Assistant</CardTitle>
                <CardDescription>
                  Ask questions about your data and get intelligent insights
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex items-center mb-2">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarFallback>AI</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">AI Assistant</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className="text-xs opacity-70 mt-1 text-right">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">AI Assistant</span>
                        </div>
                        <div className="mt-2">
                          <div className="flex gap-2 items-center">
                            <div className="animate-pulse h-2 w-2 rounded-full bg-gray-400"></div>
                            <div className="animate-pulse h-2 w-2 rounded-full bg-gray-400 animation-delay-200"></div>
                            <div className="animate-pulse h-2 w-2 rounded-full bg-gray-400 animation-delay-400"></div>
                            <span className="text-sm text-gray-500 ml-1">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="p-4 border-t mt-auto">
                <form
                  className="flex w-full gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                >
                  <Textarea
                    placeholder="Ask a question about your data..."
                    className="min-h-[44px] flex-1 resize-none"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={isSending}
                  />
                  <Button type="submit" disabled={isSending || !newMessage.trim()}>
                    {isSending ? (
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                      </svg>
                    )}
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </div>
          
          {/* Visualization Section - Separated from Chat Interface */}
          <Card className="min-h-[400px] overflow-hidden">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-lg">Data Visualizations</CardTitle>
              <CardDescription>
                Visual representations of your data based on your queries
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 overflow-auto">
              {visualizationCharts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-300 mb-4"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M18 8L12 2 6 8" />
                    <path d="M12 2v16" />
                  </svg>
                  <p className="text-sm text-gray-500 mb-2">No visualizations available yet</p>
                  <p className="text-xs text-gray-400">
                    Try asking questions like &quot;Show me a chart of...&quot; or &quot;Visualize the distribution of...&quot;
                  </p>
                </div>
              ) : (
                <DataVisualization charts={visualizationCharts} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

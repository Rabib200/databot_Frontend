"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import ReactMarkdown from 'react-markdown';

// Define interfaces for TypeScript
interface Message {
  role: "user" | "assistant";
  content: string;
  formattedContent?: string; // Optional formatted content with charts removed
  timestamp: string;
  charts?: ChartData[];
  isTyping?: boolean; // Flag to indicate if this message is currently being typed
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

  // State for typing effect
  const [typingText, setTypingText] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [fullResponse, setFullResponse] = useState<string>("");

  // Reference for the messages container
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Enhanced function to scroll to the bottom of the messages with smooth animation
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const scrollHeight = container.scrollHeight;
      const currentScroll = container.scrollTop + container.clientHeight;
      
      // If we're already close to the bottom, use smooth scroll
      // Otherwise, jump to bottom instantly (user might have scrolled up deliberately)
      if (scrollHeight - currentScroll < 200) {
        container.scrollTo({
          top: scrollHeight,
          behavior: 'smooth'
        });
      } else if (isTyping) {
        // Force scroll to bottom during typing regardless of position
        container.scrollTop = scrollHeight;
      }
    }
  }, [messagesContainerRef, isTyping]);

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
      
      // Add welcome message from assistant with formatting
      const welcomeMessage = `**File Analysis Complete!**

I've processed your file "**${data.filename}**". 

Here's a summary of your data:
* **Rows:** ${data.summary.rows}
* **Columns:** ${data.summary.columns.length}

How can I help you analyze this data? You can ask me to:
* Generate visualizations
* Calculate statistics
* Find trends or patterns
* Summarize key insights`;

      setMessages([
        {
          role: "assistant",
          content: welcomeMessage,
          formattedContent: welcomeMessage,
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
  const sendMessage = async (messageText?: string) => {
    const messageContent = messageText || newMessage;
    if (!messageContent.trim() || !activeFileId) return;
    
    const userMessage = {
      role: "user" as const,
      content: messageContent,
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
      
      // Format the response to remove chart JSON and enhance readability
      const formattedContent = formatAIResponse(data.analysis);
      
      // Add a temporary placeholder message
      const timestamp = new Date().toISOString();
      const newMessage: Message = {
        role: "assistant",
        content: "", // Start with empty content that will be filled gradually
        formattedContent: "", // Will be gradually filled
        timestamp: timestamp,
        isTyping: true, // Flag to indicate this message is being typed
        charts: charts.length > 0 ? charts : undefined
      };
      
      // Add the placeholder message
      setMessages(prev => [...prev, newMessage]);
      
      // Start the typing effect
      simulateTyping(formattedContent, () => {
        // When typing is complete, update the message with the full content
        setMessages(prev => prev.map(msg => 
          msg.timestamp === timestamp 
            ? {
                ...msg,
                content: data.analysis, // Complete original content
                formattedContent: formattedContent, // Complete formatted content
                isTyping: false
              } 
            : msg
        ));
      });
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to get a response. Please try again.");
      
      // Add error message with formatting
      const errorMessage = "**Sorry!** I encountered an error. Please try again.";
      setMessages(prev => [
        ...prev, 
        {
          role: "assistant",
          content: errorMessage,
          formattedContent: errorMessage,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Function to format AI responses - removing chart code blocks and enhancing formatting
  const formatAIResponse = (content: string): string => {
    // Remove chart data blocks
    const cleanedContent = content.replace(/```chart-data\n[\s\S]*?\n```/g, '');
    
    // Remove any empty markdown code blocks that might be left
    const noEmptyBlocks = cleanedContent.replace(/```\s*```/g, '');
    
    // Remove excessive line breaks and cleanup
    return noEmptyBlocks
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ consecutive line breaks with 2
      .replace(/---\s*\n\s*\n/g, '---\n') // Clean up after markdown horizontal rules
      .trim();
  };

  // State for dynamic insights suggestions
  const [suggestedInsights, setSuggestedInsights] = useState<string[]>([
    "Generate data visualizations",
    "Analyze patterns in data",
    "Show summary statistics",
    "Detect outliers or anomalies",
    "Compare key metrics"
  ]);
  
  // Function to handle clicking on a suggested insight
  const handleInsightClick = (insight: string) => {
    setNewMessage(insight);
    // Automatically send the message
    sendMessage(insight);
  };

  // Helper function to find columns by keywords
  const findColumnByKeywords = useCallback((columns: string[], keywords: string[]): string | undefined => {
    return columns.find(col => 
      keywords.some(keyword => col.toLowerCase().includes(keyword.toLowerCase()))
    );
  }, []);
  
  // Helper to check if a string value could be a number
  const isNumericString = useCallback((value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    return !isNaN(parseFloat(value)) && isFinite(Number(value));
  }, []);

  // Function to generate dynamic suggestions based on file data
  const generateSuggestions = useCallback((data: FileData): string[] => {
    const suggestions: string[] = [];
    
    // Get columns by type
    const numericColumns: string[] = [];
    const dateColumns: string[] = [];
    const textColumns: string[] = [];
    const locationColumns: string[] = [];
    
    // Helper to detect if a column contains numeric data by sampling the preview
    const containsNumericData = (columnName: string): boolean => {
      if (!data.data_preview || data.data_preview.length === 0) return false;
      
      // Check the first few rows to see if the values are numeric strings
      for (let i = 0; i < Math.min(3, data.data_preview.length); i++) {
        const row = data.data_preview[i];
        if (row && columnName in row) {
          const value = row[columnName];
          if (typeof value === 'number') return true;
          if (isNumericString(value)) return true;
        }
      }
      return false;
    };
    
    // First pass: Categorize columns based on types and actual values
    Object.entries(data.summary.data_types).forEach(([column, type]) => {
      // Check for date columns
      if (type.includes("date") || type.includes("time") || 
          column.toLowerCase().includes("date") || column.toLowerCase().includes("time")) {
        dateColumns.push(column);
      } 
      // Check for numeric columns - either by type or by analyzing the actual data
      else if (type.includes("int") || type.includes("float") || type.includes("number") || type.includes("double") || 
               containsNumericData(column)) {
        numericColumns.push(column);
      } 
      // Everything else is considered text
      else {
        textColumns.push(column);
      }

      // Check for location/area related columns
      if (column.toLowerCase().includes("area") || 
          column.toLowerCase().includes("location") || 
          column.toLowerCase().includes("region") || 
          column.toLowerCase().includes("city") || 
          column.toLowerCase().includes("country") ||
          column.toLowerCase().includes("hub")) {
        locationColumns.push(column);
      }
    });
    
    // Generate suggestions based on column types
    if (numericColumns.length > 0) {
      // Add numeric analysis suggestions
      suggestions.push(`Show top 5 items by ${numericColumns[0]}`);
      suggestions.push(`Analyze distribution of ${numericColumns[0]}`);
    }
    
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      // Add time-based suggestions with numeric analysis
      suggestions.push(`Show ${numericColumns[0]} trends over ${dateColumns[0]}`);
    } else if (dateColumns.length > 0) {
      suggestions.push(`Analyze patterns in ${dateColumns[0]}`);
    }
    
    if (textColumns.length > 0 && numericColumns.length > 0) {
      // Add categorical analysis suggestions
      suggestions.push(`Compare ${numericColumns[0]} by ${textColumns[0]}`);
    }
    
    if (locationColumns.length > 0 && numericColumns.length > 0) {
      suggestions.push(`View ${numericColumns[0]} by ${locationColumns[0]}`);
    }
    
    // Look for specific column names
    const revenueColumn = findColumnByKeywords(numericColumns, ["revenue", "sales", "price", "amount", "total"]);
    const customerColumn = findColumnByKeywords(textColumns, ["customer", "client", "user", "name"]);
    // We'll keep this for potential future use
    const productColumn = findColumnByKeywords(textColumns, ["product", "item", "service", "goods", "dish", "menu"]);
    const hubColumn = findColumnByKeywords(textColumns, ["hub", "branch", "location", "store"]);
    const deliveredColumn = findColumnByKeywords(numericColumns, ["delivered", "delivery", "fulfilled"]);
    const rejectedColumn = findColumnByKeywords(numericColumns, ["rejected", "cancelled", "returned"]);
    const discountColumn = findColumnByKeywords(numericColumns, ["discount", "promo", "coupon"]);
    const commissionColumn = findColumnByKeywords(numericColumns, ["commission", "fee", "charge"]);
    
    // Restaurant/Sales data specific suggestions
    if (customerColumn) {
      if (revenueColumn) {
        suggestions.push(`Show top ${customerColumn}s by ${revenueColumn}`);
      }
      
      if (deliveredColumn && rejectedColumn) {
        suggestions.push(`Compare ${deliveredColumn} vs ${rejectedColumn} by ${customerColumn}`);
      }
    }

    if (revenueColumn) {
      if (hubColumn) {
        suggestions.push(`Compare ${revenueColumn} across different ${hubColumn}s`);
      }
      
      if (discountColumn) {
        suggestions.push(`Analyze impact of ${discountColumn}s on ${revenueColumn}`);
      }
      
      suggestions.push(`Show top performers by ${revenueColumn}`);
    }

    if (deliveredColumn && hubColumn) {
      suggestions.push(`Analyze delivery performance by ${hubColumn}`);
    }
    
    if (commissionColumn && revenueColumn) {
      suggestions.push(`Show relationship between ${commissionColumn} and ${revenueColumn}`);
    }
    
    // Use product column if available
    if (productColumn) {
      suggestions.push(`Analyze performance of different ${productColumn} types`);
    }
    
    // Always add some general analysis suggestions if we have too few
    if (suggestions.length < 3) {
      suggestions.push("Detect patterns or anomalies");
      suggestions.push("Generate summary statistics");
      suggestions.push("Visualize key relationships");
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }, [findColumnByKeywords, isNumericString]);

  // Function to simulate typing effect with smooth scrolling
  const simulateTyping = useCallback((text: string, callback?: () => void) => {
    setIsTyping(true);
    setTypingText("");
    setFullResponse(text);
    
    let index = 0;
    // Adaptive typing speed based on text length - faster for longer texts
    const baseInterval = 1; // Base speed in milliseconds
    const typingInterval = text.length > 1000 ? baseInterval / 2 : baseInterval; // Ultra-fast for long responses
    
    const typeNextCharacter = () => {
      if (index < text.length) {
        // Type multiple characters at once for faster typing - adaptive chunk sizing
        let chunkSize;
        if (text.length > 2000) {
          chunkSize = 10; // Very large chunks for very long responses
        } else if (text.length > 1000) {
          chunkSize = 8; // Large chunks for long responses
        } else if (text.length > 500) {
          chunkSize = 5; // Medium chunks for medium responses
        } else {
          chunkSize = 3; // Small chunks for short responses
        }
        const endIndex = Math.min(index + chunkSize, text.length);
        const chunk = text.substring(index, endIndex);
        
        setTypingText(prevText => prevText + chunk);
        index = endIndex;
        
        // Minimal pauses for faster experience
        const nextInterval = text.charAt(index - 1) === '.' || 
                            text.charAt(index - 1) === '?' || 
                            text.charAt(index - 1) === '!' ? 
                            typingInterval * 2 : // Even shorter pauses at punctuation
                            typingInterval;
        
        // Ensure auto-scroll during typing
        requestAnimationFrame(scrollToBottom);
        
        setTimeout(typeNextCharacter, nextInterval);
      } else {
        setIsTyping(false);
        if (callback) callback();
        // Final scroll to ensure we're at the bottom
        setTimeout(scrollToBottom, 50);
      }
    };
    
    setTimeout(typeNextCharacter, typingInterval);
  }, [scrollToBottom]);

  // Enhanced auto-scroll behavior with different strategies for different situations
  useEffect(() => {
    // Check if we're typing - if so, ensure scroll to bottom happens on every character
    if (isTyping && typingText) {
      requestAnimationFrame(scrollToBottom);
    } 
    // When messages change (new message or finished typing), also scroll
    else if (messages.length > 0) {
      // Small delay to ensure content is rendered before scrolling
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, typingText, isTyping, scrollToBottom]);
  
  // Separate effect to handle scroll position observation
  useEffect(() => {
    // Create an IntersectionObserver to detect when we're at the bottom
    const observer = new IntersectionObserver(
      (entries) => {
        // When the indicator is visible, we're at the bottom
        const isAtBottom = entries[0]?.isIntersecting;
        // Only auto-scroll if we're already at the bottom or actively typing
        if (isAtBottom || isTyping) {
          requestAnimationFrame(scrollToBottom);
        }
      },
      { threshold: 0.5 }
    );
    
    // Create a scroll indicator element
    const scrollIndicator = document.createElement('div');
    scrollIndicator.style.height = '1px';
    scrollIndicator.style.width = '100%';
    
    // Add it to the container
    if (messagesContainerRef.current) {
      messagesContainerRef.current.appendChild(scrollIndicator);
      observer.observe(scrollIndicator);
    }
    
    return () => {
      observer.disconnect();
      scrollIndicator.remove();
    };
  }, [isTyping, scrollToBottom]);

  // Update suggestions when file data changes
  useEffect(() => {
    if (fileData) {
      const dynamicSuggestions = generateSuggestions(fileData);
      setSuggestedInsights(dynamicSuggestions);
    }
  }, [fileData, generateSuggestions]);

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
            <Card className="h-[700px] overflow-hidden">
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
            <Card className="h-[900px] flex flex-col">
              <CardHeader className="p-4 border-b">
                <CardTitle>Chat with AI Assistant</CardTitle>
                <CardDescription>
                  Ask questions about your data and get intelligent insights
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4" ref={messagesContainerRef}>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center">
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
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <p className="text-sm text-gray-500 mb-2">Ready to analyze your data</p>
                      <p className="text-xs text-gray-400 mb-4">
                        Try asking questions or click on a suggested insight below
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {suggestedInsights.slice(0, 3).map((insight, index) => (
                          <Badge 
                            key={index}
                            variant="outline" 
                            className="cursor-pointer hover:bg-accent transition-colors py-1.5 px-3"
                            onClick={() => handleInsightClick(insight)}
                          >
                            {insight}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => (
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
                        <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                          {message.isTyping ? (
                            <div className="typing-container relative">
                              <span className="typing-text">{typingText}</span>
                              <span className="inline-block w-1.5 h-4 ml-0.5 bg-gray-400 animate-blink absolute"></span>
                            </div>
                          ) : (
                            <ReactMarkdown>
                              {message.role === "assistant" && message.formattedContent ? message.formattedContent : message.content}
                            </ReactMarkdown>
                          )}
                        </div>
                        <div className="text-xs opacity-70 mt-1 text-right">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )))}
                  
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
              
              <CardFooter className="flex-col space-y-4 p-4 border-t mt-auto">
                {/* Auto Insights Section */}
                <div className="w-full">
                  <p className="text-xs text-muted-foreground mb-2">Suggested Insights:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedInsights.map((insight, index) => (
                      <Badge 
                        key={index}
                        variant="outline" 
                        className="cursor-pointer hover:bg-accent transition-colors py-1.5 px-3"
                        onClick={() => handleInsightClick(insight)}
                      >
                        {insight}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <form
                  className="flex w-full gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                >
                  <Textarea
                    placeholder="Ask a question about your data..."
                    className="min-h-[50px] flex-1 resize-none"
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
          <Card className="min-h-[450px] overflow-hidden">
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

"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [code, setCode] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(800);
  const [isResizing, setIsResizing] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [fileTree, setFileTree] = useState([]);
  const fileMenuRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedDirs, setExpandedDirs] = useState(new Set());
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! How can I help you with your code today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [language, setLanguage] = useState("plaintext");
  const editorRef = useRef(null);
  const suggestionTimeoutRef = useRef(null);
  // Store file handles for later access
  const fileHandles = useRef(new Map());

  // Add this function to determine language from file extension
  const getLanguageFromFileName = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    const languageMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      php: "php",
      rb: "ruby",
      rs: "rust",
      sql: "sql",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      // Add more mappings as needed
    };

    return languageMap[extension] || "plaintext";
  };

  // Add effect to trigger Monaco editor layout update
  useEffect(() => {
    // Give the animation time to complete before triggering a layout update
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 300);

    return () => clearTimeout(timer);
  }, [isChatOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: input }]);

    // Add loading message
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Generating response...",
        isLoading: true,
      },
    ]);

    setInput("");
    setIsGenerating(true);

    try {
      // Get the current code from the editor, regardless of whether a file is selected
      const currentCode = code || ""; // Use empty string as fallback
      const currentLanguage = language || "plaintext"; // Use plaintext as fallback

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          code: currentCode,
          language: currentLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate response");
      }

      const data = await response.json();

      // Replace loading message with actual response
      setMessages((prev) =>
        prev.slice(0, -1).concat({
          role: "assistant",
          content: data.response,
        })
      );
    } catch (error) {
      console.error("Error:", error);
      // Replace loading message with error message
      setMessages((prev) =>
        prev.slice(0, -1).concat({
          role: "assistant",
          content: "Sorry, I encountered an error while generating a response.",
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Loading animation component
  const LoadingDots = () => {
    const [dots, setDots] = useState("");

    useEffect(() => {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);

      return () => clearInterval(interval);
    }, []);

    return <span className="animate-pulse">{dots}</span>;
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target)) {
        setIsFileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle folder selection
  const handleFolderSelect = async () => {
    try {
      // Show folder picker
      const dirHandle = await window.showDirectoryPicker();
      const fileTree = await parseDirectory(dirHandle);
      setFileTree(fileTree);
      setIsFileMenuOpen(false);
    } catch (error) {
      // Check if it's an abort error (user cancelled)
      if (error.name === "AbortError") {
        // Just close the menu, no need for error handling
        setIsFileMenuOpen(false);
        return;
      }
      // Handle other errors
      console.error("Error selecting folder:", error);
    }
  };

  // parseDirectory to store file handles
  async function parseDirectory(dirHandle, path = "") {
    const entries = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === "directory") {
        const children = await parseDirectory(entry, `${path}/${entry.name}`);
        entries.push({
          name: entry.name,
          type: "directory",
          path: `${path}/${entry.name}`,
          children,
        });
      } else {
        const filePath = `${path}/${entry.name}`;
        // Store the file handle for later access
        fileHandles.current.set(filePath, entry);
        entries.push({
          name: entry.name,
          type: "file",
          path: filePath,
        });
      }
    }
    return entries.sort((a, b) => {
      if (a.type === "directory" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name);
    });
  }

  // Add save functionality
  const handleSave = async () => {
    try {
      if (!selectedFile) {
        // No file is selected
        return;
      }

      const fileHandle = fileHandles.current.get(selectedFile);
      if (!fileHandle) {
        console.error("No file handle found");
        return;
      }

      // Create a FileSystemWritableFileStream to write to
      const writable = await fileHandle.createWritable();
      // Write the contents of the file to the stream
      await writable.write(code);
      // Close the file and write the contents to disk
      await writable.close();

      // Could add visual feedback here if desired
      console.log("File saved successfully");
    } catch (error) {
      console.error("Error saving file:", error);
    }
  };

  // Add keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = async (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault(); // Prevent browser save dialog
        await handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, selectedFile]); // Dependencies for the effect

  // Handle file selection
  const handleFileClick = async (path) => {
    try {
      const fileHandle = fileHandles.current.get(path);
      if (!fileHandle) return;

      const file = await fileHandle.getFile();
      const content = await file.text();
      setCode(content);
      setSelectedFile(path);
      // Update the language based on the file name
      setLanguage(getLanguageFromFileName(file.name));
    } catch (error) {
      console.error("Error reading file:", error);
    }
  };

  const toggleDirectory = (path) => {
    setExpandedDirs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  // Recursive component for rendering file tree
  const FileTreeItem = ({ item, depth = 0 }) => {
    const isExpanded = expandedDirs.has(item.path);
    const hasChildren = item.type === "directory" && item.children?.length > 0;
    const isSelected = selectedFile === item.path;

    return (
      <div style={{ marginLeft: `${depth * 16}px` }}>
        <div
          className={`flex items-center space-x-2 text-sm py-1 hover:bg-white/5 rounded px-2 ${
            hasChildren ? "cursor-pointer" : "cursor-default"
          } ${isSelected ? "bg-white/10" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              toggleDirectory(item.path);
            } else {
              handleFileClick(item.path);
            }
          }}
        >
          <div className="flex items-center">
            {hasChildren && (
              <svg
                className={`w-4 h-4 text-gray-400 transform transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}

            {item.type === "directory" ? (
              <svg
                className="w-4 h-4 text-yellow-400 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-gray-400 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
          </div>
          <span className="text-gray-300">{item.name}</span>
        </div>

        {item.type === "directory" &&
          isExpanded &&
          item.children?.map((child, index) => (
            <FileTreeItem
              key={`${child.path}-${index}`}
              item={child}
              depth={depth + 1}
            />
          ))}
      </div>
    );
  };

  // Function to handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add inline completion provider for all languages
    monaco.languages.registerInlineCompletionsProvider("*", {
      provideInlineCompletions: async (model, position, context, token) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const code = model.getValue();

        // Get the current line's indentation
        const indentMatch = lineContent.match(/^[\s]*/);
        const currentIndent = indentMatch ? indentMatch[0] : "";

        console.log("Requesting AI suggestion for:", { lineContent, position });

        let suggestion = await getAISuggestion(code, position, lineContent);

        console.log("Received AI suggestion:", suggestion);

        if (!suggestion) return { items: [] };

        // Format the suggestion to maintain indentation for all lines
        suggestion = suggestion
          .split("\n")
          .map((line, index) => {
            // Don't add indentation to empty lines
            if (line.trim() === "") return "";
            // First line doesn't need indentation as it continues from current position
            return index === 0 ? line : currentIndent + line;
          })
          .join("\n");

        return {
          items: [
            {
              insertText: suggestion,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            },
          ],
        };
      },
      handleItemDidShow: () => {},
      handleItemDidInsert: (item) => {
        // Move to the next line after accepting a suggestion
        setTimeout(() => {
          const position = editorRef.current.getPosition();
          editorRef.current.setPosition({
            lineNumber: position.lineNumber + 1,
            column: 1,
          });
          editorRef.current.focus();
        }, 0);
      },
      freeInlineCompletions: () => {},
    });

    // Configure editor for inline suggestions
    editor.updateOptions({
      inlineSuggest: {
        enabled: true,
        mode: "prefix",
        showToolbar: "always",
      },
      suggest: {
        showInlineSuggestions: true,
        preview: true,
        showInlineDetails: true,
      },
      quickSuggestions: {
        other: false,
        comments: false,
        strings: false,
      },
    });

    // Add a command to handle suggestion acceptance
    editor.addCommand(
      monaco.KeyCode.Tab,
      () => {
        // Check if there's an active inline suggestion
        const hasInlineSuggestion =
          editor.getModel().inlineCompletionsProvider !== undefined;

        if (hasInlineSuggestion) {
          editor.trigger("keyboard", "editor.action.inlineSuggest.commit", {});
          // Move to next line after commit
          setTimeout(() => {
            const position = editor.getPosition();
            const currentLine = editor
              .getModel()
              .getLineContent(position.lineNumber);

            // Calculate the indentation of the current line
            const indentMatch = currentLine.match(/^[\s]*/);
            const currentIndent = indentMatch ? indentMatch[0] : "";

            // Insert a new line with proper indentation
            const insertText = "\n" + currentIndent;
            editor.executeEdits("insert-line", [
              {
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
                text: insertText,
              },
            ]);

            // Move cursor to the new line at the proper indentation
            editor.setPosition({
              lineNumber: position.lineNumber + 1,
              column: currentIndent.length + 1,
            });

            editor.focus();
          }, 0);
        } else {
          // Use default tab behavior for indentation
          editor.trigger("keyboard", "tab", {});
        }
      },
      "tab"
    );

    // Add change listener for debounced suggestions
    editor.onDidChangeModelContent(() => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }

      suggestionTimeoutRef.current = setTimeout(() => {
        const position = editor.getPosition();
        if (position) {
          console.log("Triggering inline suggestion at position:", position);
          editor.trigger("keyboard", "editor.action.inlineSuggest.trigger", {});
        }
      }, 500); // .5 second delay
    });
  };

  // Function to get AI suggestions
  const getAISuggestion = async (code, position, lineContent) => {
    try {
      console.log("Sending request to /api/suggest with:", {
        code,
        position,
        lineContent,
      });
      const response = await fetch("/api/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          position,
          lineContent,
        }),
      });
      const data = await response.json();
      console.log("Suggestion received from API:", data.suggestion);
      return data.suggestion;
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      return "";
    }
  };

  // Handle mouse down on the resizer
  const handleMouseDown = (e) => {
    setIsResizing(true);
  };

  // Handle mouse move to resize the chat panel
  const handleMouseMove = (e) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      // Set minimum width to 400px and maximum to 800px
      setChatWidth(Math.max(400, Math.min(newWidth, 800)));
    }
  };

  // Handle mouse up to stop resizing
  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-mono">
      {/* Top Navigation Bar */}
      <nav className="h-12 glass border-b border-white/10 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-blue-400">FlexCode</span>
          <div className="flex space-x-2 text-sm text-gray-400">
            <div className="relative" ref={fileMenuRef}>
              <button
                onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                className="hover:text-white px-2 py-1 rounded transition-colors"
              >
                File
              </button>
              {isFileMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#0A0A0A] rounded-lg border border-white/10 overflow-hidden z-50">
                  <button
                    onClick={handleFolderSelect}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors"
                  >
                    Open Folder
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!selectedFile}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors flex items-center justify-between ${
                      !selectedFile ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span>Save</span>
                    <span className="text-xs text-gray-500">Ctrl+S</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Centered Image */}
        <div className="flex-grow flex justify-center items-center">
          Made with{" "}
          <a
            href="https://www.superflex.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Image
              src="/superflexai_img_reduced.png"
              alt="Superflex AI"
              width={100} // Adjust width as needed
              height={100} // Adjust height as needed
              className="object-contain ml-2"
            />
          </a>
        </div>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="px-3 py-1 text-sm bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
        >
          {isChatOpen ? "Close Chat" : "Open Chat"}
        </button>
      </nav>

      <div className="flex h-[calc(100vh-3rem)]">
        {/* Sidebar */}
        <aside className="w-64 glass border-r border-white/10 flex-shrink-0 flex flex-col">
          {/* Fixed header */}
          <div className="p-4 border-b border-white/10">
            <div className="text-sm text-gray-400">EXPLORER</div>
          </div>
          {/* Scrollable file tree container */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {fileTree.map((item, index) => (
                <FileTreeItem key={`${item.path}-${index}`} item={item} />
              ))}
            </div>
          </div>
        </aside>

        {/* Main Editor Area */}
        <motion.div
          className="flex-1 p-4 min-w-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-full">
            <Editor
              height="90vh"
              language={language}
              value={code}
              onChange={(value) => setCode(value)}
              theme="vs-dark"
              onMount={handleEditorDidMount}
              options={{
                automaticLayout: true,
                scrollBeyondLastLine: false,
                minimap: { enabled: false },
                wordWrap: "on",
                wrappingStrategy: "advanced",
                wordWrapColumn: 80,
                wrappingIndent: "same",
                inlineSuggest: {
                  enabled: true,
                  mode: "prefix",
                },
                suggest: {
                  preview: true,
                  showInlineDetails: true,
                },
              }}
            />
          </div>
        </motion.div>

        {/* AI Chat Panel */}
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: isChatOpen ? chatWidth : 0,
          }}
          style={{
            overflow: "hidden",
          }}
          transition={{ duration: 0.3 }}
          className="glass border-l border-white/10 flex-shrink-0 relative"
        >
          {/* Resizer - Updated styling */}
          <div
            className="absolute top-0 left-0 h-full w-1 cursor-ew-resize group z-50"
            onMouseDown={handleMouseDown}
          >
            {/* Visual indicator for resizer */}
            <div className="absolute top-0 left-0 w-1 h-full" />
          </div>

          <div style={{ width: chatWidth }} className="h-full">
            {" "}
            {/* Panel Content */}
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-white/10">
                <h2 className="text-sm font-semibold text-blue-400">
                  AI Assistant
                </h2>
              </div>

              {/* Messages Area - will grow to fill available space */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-500/20 text-blue-100"
                          : "bg-white/5 text-gray-300"
                      }`}
                    >
                      {message.isLoading ? (
                        <p className="text-sm">
                          Generating response
                          <LoadingDots />
                        </p>
                      ) : (
                        <div className="text-sm prose prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              // Style code uniformly as inline code
                              code({
                                node,
                                inline,
                                className,
                                children,
                                ...props
                              }) {
                                return (
                                  <code
                                    className="rounded px-1 text-orange-200"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                              // Style links
                              a: ({ node, ...props }) => (
                                <a
                                  className="text-blue-400 hover:underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  {...props}
                                />
                              ),
                              // Style paragraphs
                              p: ({ node, ...props }) => (
                                <p className="mb-4 last:mb-0" {...props} />
                              ),
                              // Style lists
                              ul: ({ node, ...props }) => (
                                <ul
                                  className="list-disc ml-4 mb-4 last:mb-0"
                                  {...props}
                                />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol
                                  className="list-decimal ml-4 mb-4 last:mb-0"
                                  {...props}
                                />
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area - fixed at bottom */}
              <div className="border-t border-white/10 p-4 bg-[#0A0A0A]/50 backdrop-blur-sm">
                <form onSubmit={handleSendMessage}>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything..."
                      className="flex-1 bg-white/5 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim()} // Disable button if input is empty
                      className={`px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors ${
                        !input.trim() ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

// FileItem component
function FileItem({ name, isFolder }) {
  return (
    <div className="flex items-center space-x-2 text-sm py-1 hover:bg-white/5 rounded px-2">
      {isFolder ? (
        <svg
          className="w-4 h-4 text-yellow-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}
      <span className="text-gray-300">{name}</span>
    </div>
  );
}

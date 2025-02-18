# FlexCode

Built using [Superflex](https://www.superflex.ai/) for the [Superflex Frontend Hackathon](https://www.nosu.io/hackathons/superflex).

## Overview

This project is a web-based AI code editor—complete with file tree, source code editor, and AI-powered coding assistant. Users can interact with the assistant to receive advice or analysis about their code. The application leverages OpenAI's language model to analyze user input and provide relevant code completions and explanations.

## Features

- **Chat Interface**: Users can ask questions about their code and receive detailed responses from the AI assistant.
- **File Management**: Users can open and save files directly from the application, making it easy to manage their coding projects.
- **Dynamic Language Detection**: The application automatically detects the programming language based on the file extension.

## Installation

To set up the project, ensure you have Node.js installed on your machine. Then, follow these steps:

1. Clone the repository:

   ```
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install the required packages:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:

   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

## Usage

1. Run the application:

   ```
   npm run dev
   ```

2. Open your web browser and navigate to `http://localhost:3000`.

3. Use the chat interface to ask questions or get code suggestions.

4. Open files to edit and save your code directly from the application.

## File Descriptions

- **app/page.js**: The main React component for the web application, handling user interactions and rendering the UI.
- **app/api/suggest/route.js**: API route for generating code suggestions based on the current code context.
- **app/api/chat/route.js**: API route for handling user queries and providing detailed responses from the AI assistant.

## Dependencies

- **Next.js**: A React framework for building server-side rendered applications.
- **OpenAI**: For generating code suggestions and responses.
- **Framer Motion**: For animations and transitions in the UI.
- **Monaco Editor**: A code editor that provides syntax highlighting and code editing capabilities.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

# Reactor AI Backend

This is the backend service for Reactor AI, powered by Google's Gemini AI. It provides a REST API for handling AI-powered DeFi automation conversations and interactions.

## Features

- 🤖 Gemini AI Integration for natural language processing
- 💬 Conversation management with context preservation
- 🔗 Blockchain integration for token balances and prices
- 🔄 Stop order automation configuration
- 📊 Health monitoring and error handling
- 🚀 Rate limiting and caching
- 💾 PostgreSQL database with Prisma ORM

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Gemini API key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
./scripts/setup-env.sh
```

3. Set up the database:
```bash
./scripts/setup-db.sh
```

4. Start the development server:
```bash
./scripts/dev.sh
```

## API Endpoints

### AI Automation

- `POST /ai-automation/automate`
  - Process user messages and generate AI responses
  - Request body:
    ```json
    {
      "message": "string",
      "conversationId": "string",
      "connectedWallet": "string?",
      "currentNetwork": "number?"
    }
    ```

### Health Checks

- `GET /ai-automation/health`
  - Basic health check
- `GET /ai-automation/health/detailed`
  - Detailed health status of all services

### Conversation Management

- `DELETE /ai-automation/conversation/:conversationId`
  - Reset a conversation

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `GEMINI_API_KEY`: Your Gemini API key
- `GEMINI_API_ENDPOINT`: Gemini API endpoint
- `PORT`: Server port (default: 8000)
- `NODE_ENV`: Environment (development/production)

## Development

The server uses:
- TypeScript for type safety
- Express for the web server
- Prisma for database access
- Zod for request validation
- Jest for testing

### Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm test`: Run tests

## Error Handling

The service includes comprehensive error handling:
- Rate limiting
- Request validation
- Error tracking and monitoring
- Circuit breaker for external services

## Monitoring

Health checks and detailed status endpoints are available for monitoring:
- Basic health: `/ai-automation/health`
- Detailed status: `/ai-automation/health/detailed`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC 
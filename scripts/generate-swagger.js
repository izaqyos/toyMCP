const path = require('path');
const fs = require('fs');
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../src/config'); // To get the port if needed

// Define swagger options, mirroring those in server.js but ensuring output is self-contained
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ToyMCP API (Generated Static Spec)', // Slightly different title for clarity
      version: '1.0.0', // Consider reading from package.json
      description: 'Static API documentation for the ToyMCP application using JSON-RPC 2.0.',
    },
    servers: [
      {
        // For static docs, often better to not hardcode localhost
        // url: `http://localhost:${config.server.port || 3000}`,
        // description: 'Local development server',
        // OR provide the production URL if available
         url: '/rpc', // Using a relative URL might work if deployed alongside the API
         description: 'API Endpoint (Relative)'
      },
       // Add production server URL here if applicable
       // {
       //   url: 'YOUR_PRODUCTION_API_URL',
       //   description: 'Production server'
       // }
    ],
    // No paths needed here, as they are defined in the definitions file
    components: {} // Let swagger-jsdoc populate this from definitions
  },
  // Point to the file containing the JSDoc definitions
  apis: [path.join(__dirname, '../src/swagger_definitions.js')],
};

// Generate the specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Define the output path - Changed to /docs
const outputPath = path.join(__dirname, '../docs/openapi.json');
const outputDir = path.dirname(outputPath);

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the specification to the file
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log(`Swagger specification generated successfully at ${outputPath}`); 
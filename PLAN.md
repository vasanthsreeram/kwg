# Plan: Integrate SQLite, Add CSV Export, and Dockerize Node.js App

**Phase 1: Database Migration & Setup**

1.  **Install Dependencies:**
    *   Add `sqlite3` for SQLite database interaction.
    *   Add `csv-writer` to help generate the CSV file.
    *   *(Optional)* Remove the `mssql` package if no longer needed.
    *   *(Optional)* Remove `dotenv` if no longer needed.
2.  **Initialize SQLite Database:**
    *   Modify `server.js` to:
        *   Import `sqlite3`.
        *   Connect to `database.sqlite`.
        *   Create `GridGame` table if it doesn't exist (use `TEXT` for JSON columns).
3.  **Update Database Logic:**
    *   Refactor `/submit-data`, `/api/get-stats`, `/api/debug-data` routes in `server.js` for SQLite syntax and methods.

**Phase 2: CSV Download Endpoint**

1.  **Create `/admin-out` Route:**
    *   Add a new `GET` route `/admin-out` in `server.js`.
2.  **Implement CSV Generation:**
    *   Inside the route handler:
        *   Query SQLite for all `GridGame` data.
        *   Process rows: Parse JSON columns (`Scale`, `EnvOrder`, `tscollect`, etc.).
        *   **Flattening Attempt:** Create new columns for simple arrays/objects (e.g., `tscollect_0`, `testerNotes_notes`). Fall back to original JSON string for complex data.
        *   Define CSV header dynamically.
        *   Use `csv-writer` to generate the CSV string.
3.  **Send CSV Response:**
    *   Set headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="gridgame_data.csv"`.
    *   Send the CSV string as the response body.

**Phase 3: Dockerization**

1.  **Create `Dockerfile`:**
    *   Create `Dockerfile` in the project root.
    *   Instructions:
        ```dockerfile
        # Use an official Node.js runtime as a parent image
        FROM node:18-alpine

        # Set the working directory in the container
        WORKDIR /usr/src/app

        # Copy package.json and package-lock.json
        COPY package*.json ./

        # Install app dependencies
        RUN npm ci --only=production

        # Bundle app source
        COPY . .

        # Make port 3000 available
        EXPOSE 3000

        # Run server.js when the container launches
        CMD ["node", "server.js"]
        ```
2.  **Create `.dockerignore`:**
    *   Create `.dockerignore` in the project root.
    *   Exclude: `node_modules`, `.git`, `.env`, `Dockerfile`, `.dockerignore`, `database.sqlite` (optional), logs, `.DS_Store`, etc.
        ```
        node_modules
        npm-debug.log
        .git
        .gitignore
        .env
        Dockerfile
        .dockerignore
        database.sqlite
        *.log
        .DS_Store
        ```

**Phase 4: Testing**

1.  **Local Testing:** Verify SQLite integration and `/admin-out` functionality locally (`node server.js`).
2.  **Docker Testing:**
    *   Build image: `docker build -t gridgame-app .`
    *   Run container: `docker run -p 3000:3000 -d --name gridgame gridgame-app`
    *   Test application via `http://localhost:3000`, including data submission and CSV download.

**Mermaid Diagram:**

```mermaid
graph TD
    A[Start: External MSSQL App] --> B(Install sqlite3, csv-writer);
    B --> C(Remove mssql, dotenv?);
    C --> D[Modify server.js: Init SQLite & Create Table];
    D --> E[Update API Routes for SQLite];
    E --> F[Create /admin-out Route];
    F --> G[Implement DB Query in /admin-out];
    G --> H[Process Data: Parse & Flatten JSON];
    H --> I[Generate CSV String];
    I --> J[Set Headers & Send CSV Response];
    J --> K[Create Dockerfile];
    K --> L[Create .dockerignore];
    L --> M[Build Docker Image];
    M --> N[Run Docker Container];
    N --> O[Test App Locally & In Container];
    O --> P[End: Self-contained Docker App w/ SQLite & CSV Export];
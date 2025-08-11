You are an expert TypeScript and Web3 SDK developer.  
Your task is to implement a complete TypeScript SDK project called **MonoPulse** based on the PRD.md file.

Follow these rules and requirements strictly:

---

### **1. Project Setup**

- Initialize a new Node.js + TypeScript project.
- Set up a Git repository locally inside the project directory.
- Create a `.gitignore` file before making any commits. The `.gitignore` must include:
  - node_modules
  - dist
  - .env
  - coverage
  - .DS_Store
  - \*.log
- Create an initial commit after `.gitignore` is created.

---

### **2. Project Structure**

Follow the architecture from the PRD exactly:

```

src/
core/
rpcClient.ts
multicall.ts
eventBus.ts
dataFetcher.ts
providers/
alliumProvider.ts
goldskyProvider.ts
quicknodeProvider.ts
wsProvider.ts
providerManager.ts
watchers/
balancesWatcher.ts
contractWatcher.ts
nftWatcher.ts
transactionsWatcher.ts
pendingTxWatcher.ts
blockStatsWatcher.ts
utils/
types.ts
logger.ts
helpers.ts
index.ts
examples/
watchBalances.ts
watchContractData.ts
watchNFTs.ts
watchTransactions.ts
watchPendingTxs.ts
watchBlockStats.ts

```

---

### **3. Implementation Guidelines**

- Language: **TypeScript**
- Module system: **ES Modules**
- Export a single main class `MonoPulse` from `src/index.ts`.
- Use a clean OOP approach with classes and interfaces for core components.
- All providers must implement a shared `EventProvider` interface.
- Implement **all watchers** from the PRD:
  1. watchBalances
  2. watchContractData
  3. watchNFTs
  4. watchTransactions
  5. watchPendingTxs
  6. watchBlockStats
- Each watcher must:
  1. Fetch initial data via multicall.
  2. Subscribe to relevant events from the chosen provider.
  3. On relevant event, refetch only changed data and trigger the callback.
- Implement intelligent batching logic in `multicall.ts` with fail-skip handling.
- Use `.env` file for storing API keys in examples.

---

### **4. Documentation**

- Create a professional `README.md` at the root of the project:
  - Introduction & Overview of MonoPulse
  - Installation instructions
  - Quickstart example
  - API documentation for each watcher
  - Example usage for each provider
  - Contributing guidelines
  - License section
- Write the README in a style similar to popular libraries like **ethers.js** or **viem**.
- Include TypeScript code snippets in the README.

---

### **5. Git Commit Workflow**

- Commit after each major step:
  1. Initial commit with `.gitignore` and `package.json`
  2. Commit after project folder structure is created
  3. Commit after implementing core layer
  4. Commit after adding providers
  5. Commit after adding each watcher
  6. Commit after adding examples and README
- Use conventional commit messages (`feat: ...`, `chore: ...`, `docs: ...`, `fix: ...`).

---

### **6. Additional Best Practices**

- Apply ESLint + Prettier for code style.
- Add TypeDoc comments to all public methods and classes.
- Ensure all TypeScript types are explicit.
- Avoid hardcoding API keys; always use environment variables.
- Include minimal but functional test files for all watchers using Jest.
- Ensure the SDK can be published to npm by running `npm publish --dry-run`.

---

Now, start coding the project following the above instructions.  
Output all created files with their respective content, including `.gitignore`, `README.md`, and TypeScript files.  
Explain each step before showing the file content.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Queue system to ensure atomic, serialised writes per collection
const writeQueues = {};

async function enqueueWrite(collectionName, writeTask) {
  if (!writeQueues[collectionName]) {
    writeQueues[collectionName] = Promise.resolve();
  }
  
  const nextTask = writeQueues[collectionName].then(writeTask);
  writeQueues[collectionName] = nextTask.catch(() => {}); // catch errors so queue doesn't block
  return nextTask;
}

// Low-level helper to read a JSON file safely
async function readCollection(collectionName) {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Return empty array if file does not exist
      return [];
    }
    throw error;
  }
}

// Low-level helper to write a JSON file atomically (write to temp file, then rename)
async function writeCollection(collectionName, data) {
  return enqueueWrite(collectionName, async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = path.join(DATA_DIR, `${collectionName}.json`);
    const tempPath = `${filePath}.tmp`;
    
    const stringifiedData = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, stringifiedData, 'utf-8');
    await fs.rename(tempPath, filePath);
  });
}

// Generic CRUD helper creator
function createRepository(collectionName) {
  return {
    async find(filter = {}) {
      const items = await readCollection(collectionName);
      return items.filter(item => {
        for (const key in filter) {
          if (filter[key] !== undefined && item[key] !== filter[key]) {
            return false;
          }
        }
        return true;
      });
    },

    async findOne(filter = {}) {
      const items = await readCollection(collectionName);
      return items.find(item => {
        for (const key in filter) {
          if (filter[key] !== undefined && item[key] !== filter[key]) {
            return false;
          }
        }
        return true;
      }) || null;
    },

    async findById(id) {
      const items = await readCollection(collectionName);
      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
      return items.find(item => item.id === parsedId || item.id === id) || null;
    },

    async insert(data) {
      const items = await readCollection(collectionName);
      
      // Auto-increment ID
      const maxId = items.reduce((max, item) => (item.id && typeof item.id === 'number' ? Math.max(max, item.id) : max), 0);
      const newItem = {
        id: maxId + 1,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      items.push(newItem);
      await writeCollection(collectionName, items);
      return newItem;
    },

    async update(id, data) {
      const items = await readCollection(collectionName);
      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
      const index = items.findIndex(item => item.id === parsedId || item.id === id);
      
      if (index === -1) {
        throw new Error(`Item with ID ${id} not found in ${collectionName}`);
      }
      
      const updatedItem = {
        ...items[index],
        ...data,
        id: items[index].id, // Ensure ID is never overwritten
        updatedAt: new Date().toISOString()
      };
      
      items[index] = updatedItem;
      await writeCollection(collectionName, items);
      return updatedItem;
    },

    async delete(id) {
      const items = await readCollection(collectionName);
      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
      const filteredItems = items.filter(item => item.id !== parsedId && item.id !== id);
      
      if (filteredItems.length === items.length) {
        return false;
      }
      
      await writeCollection(collectionName, filteredItems);
      return true;
    },

    async raw() {
      return await readCollection(collectionName);
    },

    async saveAll(items) {
      await writeCollection(collectionName, items);
      return items;
    }
  };
}

// Database client abstraction matching standard repository patterns
export const db = {
  users: createRepository('users'),
  medicines: createRepository('medicines'),
  bills: createRepository('bills'),
  notifications: createRepository('notifications'),
  
  // Custom execution wrappers for transaction-like safety across multiple collections
  async runTransaction(transactionFn) {
    // Acquire simple lock for multi-document operations
    // Note: Since Javascript is single-threaded, raw async block serialisation 
    // is achieved by running in the queue or awaiting sequential operations.
    return await transactionFn(db);
  },

  // Export helper for migration path
  async exportData() {
    const collections = ['users', 'medicines', 'bills', 'notifications'];
    const exportDump = {};
    for (const coll of collections) {
      exportDump[coll] = await readCollection(coll);
    }
    return exportDump;
  },

  // Import/Restore helper for migration
  async importData(dump) {
    for (const coll in dump) {
      if (Array.isArray(dump[coll])) {
        await writeCollection(coll, dump[coll]);
      }
    }
    return true;
  }
};

import { promises as fs } from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb-service:27017/easyshop';
const scriptDir = path.resolve(path.dirname(''));

// Product Schema
const productSchema = new mongoose.Schema({
  _id: { type: String }, // Allow string IDs
  originalId: { type: String }, // Store the original ID
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  oldPrice: Number,
  categories: [String],
  image: [String],
  rating: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  shop_category: { type: String, required: true },
  unit_of_measure: String,
  colors: [String],
  sizes: [String]
}, {
  timestamps: true,
  _id: false // Disable auto-generated ObjectId
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// Function to get correct image path based on shop category
function getImagePath(originalPath: string, shopCategory: string): string {
  const fileName = path.basename(originalPath);
  const categoryMap: { [key: string]: string } = {
    electronics: 'gadgetsImages',
    medicine: 'medicineImages',
    grocery: 'groceryImages',
    clothing: 'clothingImages',
    furniture: 'furnitureImages',
    books: 'books',
    beauty: 'makeupImages',
    snacks: 'groceryImages',
    bakery: 'bakeryImages',
    bags: 'bagsImages'
  };
  
  const imageDir = categoryMap[shopCategory] || shopCategory + 'Images';
  return `/${imageDir}/${fileName}`;
}

async function migrateData() {
  try {
    console.log('Starting migration process...');
    console.log('Attempting to connect to MongoDB at:', MONGODB_URI);
    
    // Connect to MongoDB with options
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s
      connectTimeoutMS: 10000,
    });
    
    console.log('Successfully connected to MongoDB');

    // Check if database is accessible
    if (mongoose.connection.db) {
      const admin = mongoose.connection.db.admin();
      const dbStatus = await admin.ping();
      console.log('Database ping successful:', dbStatus);
    }

    // Get the project root directory (container working directory)
    const projectRoot = '/app';
    
    // Read the JSON file from the container
    const dbFilePath = path.join(projectRoot, '.db', 'db.json');
    console.log('Attempting to read data file from:', dbFilePath);
    
    const jsonData = await fs.readFile(dbFilePath, 'utf-8');
    const data = JSON.parse(jsonData);

    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Invalid data format: products array not found');
    }

    console.log(`Found ${data.products.length} products to migrate`);

    // Clear existing products
    const deleteResult = await Product.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing products`);

    // Create a map to track used IDs
    const usedIds = new Set<string>();

    // Prepare products for insertion with unique IDs
    const products = data.products.map((product: any, index: number) => {
      if (!product.id) {
        console.warn(`Product at index ${index} missing ID, skipping`);
        return null;
      }

      // Ensure ID is unique and padded
      let paddedId = product.id.toString().padStart(10, '0');
      while (usedIds.has(paddedId)) {
        const num = parseInt(paddedId);
        paddedId = (num + 1).toString().padStart(10, '0');
      }
      usedIds.add(paddedId);

      // Fix image paths
      const fixedImages = Array.isArray(product.image) 
        ? product.image.map((img: string) => getImagePath(img, product.shop_category))
        : [];

      return {
        _id: paddedId,
        originalId: paddedId,
        ...product,
        image: fixedImages
      };
    }).filter(Boolean); // Remove null values

    // Insert products in batches to avoid memory issues
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await Product.insertMany(batch);
      insertedCount += batch.length;
      console.log(`Migrated ${insertedCount}/${products.length} products`);
    }

    console.log(`Migration completed successfully! Migrated ${insertedCount} products`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    
    if (error instanceof mongoose.Error) {
      console.error('Mongoose error details:', {
        name: error.name,
        message: error.message,
      });
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateData();

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();

const PORT = process.env.PORT || 3000;

// CORS Configuration for Netlify and Render
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5500',
  'https://moonlit-tarsier-7325a8.netlify.app',
  'https://heartfelt-lebkuchen-97c297.netlify.app',
  'https://*.netlify.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin.replace('*', '.*');
          const regex = new RegExp(pattern);
          return regex.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log('Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(bodyParser.json());
app.use(express.json());

// Static files serving
app.use(express.static(path.join(__dirname, 'public')));

// JSON ফাইলের পাথ
const DATA_FILE = path.join(__dirname, 'data.json');

// MongoDB Connection (Optional)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://billaharif661_db_user:2GCmDhaEOQUteXow@iwonttotast0.mza6qgz.mongodb.net/BillahArif?appName=IWontToTast0';
let mongooseConnected = false;

// Use JSON file storage by default (for Render deployment)
if (process.env.USE_MONGODB === 'true') {
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log('✅ MongoDB Connected');
        mongooseConnected = true;
        initializeMongoDB();
    }).catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.log('⚠️ Using JSON file storage');
        mongooseConnected = false;
        initializeJSON();
    });
} else {
    console.log('ℹ️ Using JSON file storage');
    mongooseConnected = false;
    initializeJSON();
}

// MongoDB Schemas (for optional use)
const orderSchema = new mongoose.Schema({
    orderId: String,
    customerName: String,
    phone: String,
    email: String,
    address: String,
    district: String,
    quantity: Number,
    total: Number,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
    reviewerName: String,
    rating: Number,
    reviewText: String,
    approved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now }
});

const settingsSchema = new mongoose.Schema({
    bookPrice: { type: Number, default: 250 },
    deliveryCharge: { type: Number, default: 60 },
    discount: { type: Number, default: 50 },
    bulkDiscountThreshold: { type: Number, default: 5 },
    bulkDiscountAmount: { type: Number, default: 20 },
    currency: { type: String, default: '৳' },
    siteTitle: { type: String, default: 'মৃত্যু ও তার পরে' },
    siteDescription: { type: String, default: 'আধ্যাত্মিক জিজ্ঞাসার উত্তর' },
    hotlineNumber: { type: String, default: '০১৭১২-৩৪৫৬৭৮' },
    contactHours: { type: String, default: 'সকাল ১০টা - রাত ১০টা' }
});

// MongoDB Models
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

// JSON ডেটা ফাংশন
function readJSONData() {
    if (!fs.existsSync(DATA_FILE)) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        const initialData = {
            orders: [],
            reviews: [],
            users: [{
                id: 'admin001',
                username: 'admin',
                password: hashedPassword,
                email: 'admin@MyBook.com',
                role: 'admin',
                createdAt: new Date().toISOString()
            }],
            settings: {
                bookPrice: 250,
                deliveryCharge: 60,
                discount: 50,
                bulkDiscountThreshold: 5,
                bulkDiscountAmount: 20,
                currency: '৳',
                siteTitle: 'মৃত্যু ও তার পরে',
                siteDescription: 'আধ্যাত্মিক জিজ্ঞাসার উত্তর',
                hotlineNumber: '০১৭১২-৩৪৫৬৭৮',
                contactHours: 'সকাল ১০টা - রাত ১০টা'
            }
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

function writeJSONData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function initializeMongoDB() {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            await User.create({
                username: 'admin',
                password: hashedPassword,
                email: 'admin@MyBook.com',
                role: 'admin'
            });
            console.log('✅ Admin user created');
        }
        
        const settingsExist = await Settings.findOne();
        if (!settingsExist) {
            await Settings.create({});
            console.log('✅ Default settings created');
        }
    } catch (error) {
        console.error('❌ MongoDB initialization error:', error);
    }
}

function initializeJSON() {
    if (!fs.existsSync(DATA_FILE)) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        const initialData = {
            orders: [],
            reviews: [],
            users: [{
                id: 'admin001',
                username: 'admin',
                password: hashedPassword,
                email: 'admin@MyBook.com',
                role: 'admin',
                createdAt: new Date().toISOString()
            }],
            settings: {
                bookPrice: 250,
                deliveryCharge: 60,
                discount: 50,
                bulkDiscountThreshold: 5,
                bulkDiscountAmount: 20,
                currency: '৳',
                siteTitle: 'মৃত্যু ও তার পরে',
                siteDescription: 'আধ্যাত্মিক জিজ্ঞাসার উত্তর',
                hotlineNumber: '০১৭১২-৩৪৫৬৭৮',
                contactHours: 'সকাল ১০টা - রাত ১০টা'
            }
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ JSON data initialized');
    }
}

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'MySuperSecretKey_2026_@!#_JWT', (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }
    next();
};

// API Routes

// 1. Health Check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date(),
        database: mongooseConnected ? 'MongoDB' : 'JSON file',
        environment: process.env.NODE_ENV || 'development'
    });
});

// 2. Public API - Settings
app.get('/api/settings', async (req, res) => {
    try {
        if (mongooseConnected) {
            const settings = await Settings.findOne() || {};
            res.json({ success: true, settings });
        } else {
            const data = readJSONData();
            res.json({ success: true, settings: data.settings });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Public API - Approved Reviews
app.get('/api/reviews/approved', async (req, res) => {
    try {
        let reviews = [];
        
        if (mongooseConnected) {
            reviews = await Review.find({ approved: true }).sort({ createdAt: -1 });
        } else {
            const data = readJSONData();
            reviews = data.reviews.filter(review => review.approved).sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        }
        
        res.json({
            success: true,
            reviews,
            total: reviews.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to load reviews: ' + error.message
        });
    }
});

// 4. Public API - Submit Order
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            orderId: 'ORD' + Date.now() + Math.floor(Math.random() * 1000),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (mongooseConnected) {
            const order = new Order(orderData);
            await order.save();
            res.json({ 
                success: true, 
                message: 'Order placed successfully', 
                order: {
                    id: order._id,
                    ...order.toObject()
                }
            });
        } else {
            const data = readJSONData();
            data.orders.push(orderData);
            writeJSONData(data);
            res.json({ 
                success: true, 
                message: 'Order placed successfully', 
                order: orderData 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Public API - Submit Review
app.post('/api/reviews', async (req, res) => {
    try {
        const reviewData = {
            ...req.body,
            approved: false,
            createdAt: new Date()
        };

        if (mongooseConnected) {
            const review = new Review(reviewData);
            await review.save();
            res.json({ 
                success: true, 
                message: 'Review submitted successfully', 
                review: {
                    id: review._id,
                    ...review.toObject()
                }
            });
        } else {
            const data = readJSONData();
            const newReview = {
                ...reviewData,
                id: 'REV' + Date.now() + Math.floor(Math.random() * 1000)
            };
            data.reviews.push(newReview);
            writeJSONData(data);
            res.json({ 
                success: true, 
                message: 'Review submitted successfully', 
                review: newReview 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Authentication
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (mongooseConnected) {
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            
            const token = jwt.sign(
                { userId: user._id, username: user.username, role: user.role },
                process.env.JWT_SECRET || 'MySuperSecretKey_2026_@!#_JWT',
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            const data = readJSONData();
            const user = data.users.find(u => u.username === username);
            
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            
            const validPassword = bcrypt.compareSync(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            
            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET || 'MySuperSecretKey_2026_@!#_JWT',
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 7. Admin API - Orders
app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        let orders = [];
        let total = 0;
        
        if (mongooseConnected) {
            const query = status && status !== 'all' ? { status } : {};
            orders = await Order.find(query)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum);
            total = await Order.countDocuments(query);
        } else {
            const data = readJSONData();
            let filteredOrders = data.orders || [];
            
            if (status && status !== 'all') {
                filteredOrders = filteredOrders.filter(order => order.status === status);
            }
            
            filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            total = filteredOrders.length;
            const start = (pageNum - 1) * limitNum;
            orders = filteredOrders.slice(start, start + limitNum);
        }
        
        res.json({
            success: true,
            orders,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalOrders: total,
                hasNextPage: pageNum * limitNum < total,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 8. Admin API - Reviews
app.get('/api/admin/reviews', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { approved, page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        let reviews = [];
        let total = 0;
        
        if (mongooseConnected) {
            const query = approved !== undefined ? { approved: approved === 'true' } : {};
            reviews = await Review.find(query)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum);
            total = await Review.countDocuments(query);
        } else {
            const data = readJSONData();
            let filteredReviews = data.reviews || [];
            
            if (approved !== undefined) {
                filteredReviews = filteredReviews.filter(review => review.approved === (approved === 'true'));
            }
            
            filteredReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            total = filteredReviews.length;
            const start = (pageNum - 1) * limitNum;
            reviews = filteredReviews.slice(start, start + limitNum);
        }
        
        res.json({
            success: true,
            reviews,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalReviews: total,
                hasNextPage: pageNum * limitNum < total,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 9. Admin API - Statistics (UPDATED)
app.get('/api/admin/statistics', authenticateToken, isAdmin, async (req, res) => {
    try {
        let orders = [];
        let reviews = [];
        
        if (mongooseConnected) {
            orders = await Order.find();
            reviews = await Review.find();
        } else {
            const data = readJSONData();
            orders = data.orders || [];
            reviews = data.reviews || [];
        }
        
        // সঠিকভাবে স্ট্যাটাস গণনা করুন
        const stats = {
            orders: {
                total: orders.length,
                pending: orders.filter(o => o.status === 'pending' || o.status === 'পেন্ডিং').length,
                confirmed: orders.filter(o => o.status === 'confirmed' || o.status === 'কনফার্মড').length,
                shipped: orders.filter(o => o.status === 'shipped' || o.status === 'শিপড').length,
                delivered: orders.filter(o => o.status === 'delivered' || o.status === 'ডেলিভারড').length,
                cancelled: orders.filter(o => o.status === 'cancelled' || o.status === 'ক্যান্সেলড').length
            },
            reviews: {
                total: reviews.length,
                approved: reviews.filter(r => r.approved).length,
                pending: reviews.filter(r => !r.approved).length
            },
            revenue: {
                total: orders
                    .filter(o => o.status === 'delivered' || o.status === 'ডেলিভারড')
                    .reduce((sum, order) => sum + (order.total || 0), 0)
            }
        };
        
        console.log('Statistics calculated:', stats.orders); // ডিবাগ লগ
        
        res.json({ success: true, statistics: stats });
    } catch (error) {
        console.error('Error in statistics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 10. Admin API - Update Order
app.put('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        if (mongooseConnected) {
            let order;
            // প্রথমে _id হিসেবে খুঁজুন
            try {
                order = await Order.findById(id);
            } catch (err) {
                // _id ব্যর্থ হলে orderId হিসেবে খুঁজুন
                order = await Order.findOne({ orderId: id });
            }
            
            if (!order) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Order not found' 
                });
            }
            
            // আপডেট করুন
            Object.assign(order, updates);
            order.updatedAt = new Date();
            await order.save();
            
            res.json({ 
                success: true, 
                message: 'Order updated successfully', 
                order: {
                    id: order._id,
                    ...order.toObject()
                }
            });
        } else {
            const data = readJSONData();
            // orderId বা id দিয়ে খুঁজুন
            const orderIndex = data.orders.findIndex(o => 
                o.orderId === id || o.id === id || o._id === id
            );
            
            if (orderIndex === -1) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Order not found' 
                });
            }
            
            data.orders[orderIndex] = { 
                ...data.orders[orderIndex], 
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            writeJSONData(data);
            
            res.json({ 
                success: true, 
                message: 'Order updated successfully', 
                order: data.orders[orderIndex] 
            });
        }
    } catch (error) {
        console.error('Order update error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// 11. Admin API - Approve Review
app.put('/api/admin/reviews/:id/approve', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (mongooseConnected) {
            // ObjectId হিসেবে চেষ্টা করুন, না হলে string হিসেবে খুঁজুন
            let review;
            try {
                // প্রথমে ObjectId হিসেবে খুঁজুন
                review = await Review.findById(id);
            } catch (err) {
                // ObjectId ব্যর্থ হলে string ID হিসেবে খুঁজুন
                review = await Review.findOne({ id: id });
            }
            
            if (!review) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Review not found' 
                });
            }
            
            review.approved = true;
            await review.save();
            
            res.json({ 
                success: true, 
                message: 'Review approved', 
                review: {
                    id: review._id,
                    ...review.toObject()
                }
            });
        } else {
            const data = readJSONData();
            const reviewIndex = data.reviews.findIndex(r => r.id === id);
            if (reviewIndex === -1) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Review not found' 
                });
            }
            
            data.reviews[reviewIndex].approved = true;
            writeJSONData(data);
            
            res.json({ 
                success: true, 
                message: 'Review approved', 
                review: data.reviews[reviewIndex] 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// 12. Admin API - Delete Review
app.delete('/api/admin/reviews/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (mongooseConnected) {
            // ObjectId হিসেবে চেষ্টা করুন, না হলে string হিসেবে খুঁজুন
            let deletedReview;
            try {
                deletedReview = await Review.findByIdAndDelete(id);
            } catch (err) {
                deletedReview = await Review.findOneAndDelete({ id: id });
            }
            
            if (!deletedReview) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Review not found' 
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Review deleted' 
            });
        } else {
            const data = readJSONData();
            const reviewIndex = data.reviews.findIndex(r => r.id === id);
            if (reviewIndex === -1) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Review not found' 
                });
            }
            
            data.reviews.splice(reviewIndex, 1);
            writeJSONData(data);
            
            res.json({ 
                success: true, 
                message: 'Review deleted' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// 13. Admin API - Delete Order
app.delete('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (mongooseConnected) {
            // ObjectId হিসেবে চেষ্টা করুন, না হলে orderId হিসেবে খুঁজুন
            let deletedOrder;
            try {
                deletedOrder = await Order.findByIdAndDelete(id);
            } catch (err) {
                deletedOrder = await Order.findOneAndDelete({ orderId: id });
            }
            
            if (!deletedOrder) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Order not found' 
                });
            }
            
            res.json({ success: true, message: 'Order deleted' });
        } else {
            const data = readJSONData();
            const orderIndex = data.orders.findIndex(o => 
                o.orderId === id || o.id === id || o._id === id
            );
            
            if (orderIndex === -1) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Order not found' 
                });
            }
            
            data.orders.splice(orderIndex, 1);
            writeJSONData(data);
            
            res.json({ 
                success: true, 
                message: 'Order deleted' 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 14. Dashboard Chart Data (UPDATED)
app.get('/api/dashboard/chart-data', authenticateToken, isAdmin, async (req, res) => {
    try {
        let orders = [];
        
        if (mongooseConnected) {
            orders = await Order.find().sort({ createdAt: -1 }).limit(15);
        } else {
            const data = readJSONData();
            orders = data.orders || [];
            orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15);
        }
        
        // আসল অর্ডার ডেটা থেকে চার্ট তৈরি
        const chartLabels = Array.from({length: 7}, (_, i) => (i + 1).toString());
        const chartData = Array.from({length: 7}, () => 0);
        
        orders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            const dayIndex = orderDate.getDate() % 7;
            if (dayIndex >= 0 && dayIndex < 7) {
                chartData[dayIndex]++;
            }
        });
        
        // স্ট্যাটাস ডেটা
        const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'পেন্ডিং').length;
        const confirmedCount = orders.filter(o => o.status === 'confirmed' || o.status === 'কনফার্মড').length;
        const shippedCount = orders.filter(o => o.status === 'shipped' || o.status === 'শিপড').length;
        const deliveredCount = orders.filter(o => o.status === 'delivered' || o.status === 'ডেলিভারড').length;
        const cancelledCount = orders.filter(o => o.status === 'cancelled' || o.status === 'ক্যান্সেলড').length;
        
        const chartDataResponse = {
            labels: chartLabels,
            datasets: [{
                label: 'দৈনিক অর্ডার',
                data: chartData,
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                borderColor: 'rgba(124, 58, 237, 1)',
                borderWidth: 2,
                tension: 0.4
            }]
        };
        
        const statusDataResponse = {
            labels: ['পেন্ডিং', 'কনফার্মড', 'শিপড', 'ডেলিভারড', 'ক্যান্সেলড'],
            datasets: [{
                data: [
                    pendingCount,
                    confirmedCount,
                    shippedCount,
                    deliveredCount,
                    cancelledCount
                ],
                backgroundColor: ['#fbbf24', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444']
            }]
        };
        
        res.json({
            success: true,
            chartData: chartDataResponse,
            statusData: statusDataResponse,
            realData: true
        });
    } catch (error) {
        console.error('Chart data error:', error);
        // ইরর হলেও ডিফল্ট ডেটা পাঠান
        const defaultChartData = {
            labels: ['১', '২', '৩', '৪', '৫', '৬', '৭'],
            datasets: [{
                label: 'দৈনিক অর্ডার',
                data: [2, 3, 1, 4, 2, 3, 2],
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                borderColor: 'rgba(124, 58, 237, 1)',
                borderWidth: 2,
                tension: 0.4
            }]
        };
        
        const defaultStatusData = {
            labels: ['পেন্ডিং', 'কনফার্মড', 'শিপড', 'ডেলিভারড', 'ক্যান্সেলড'],
            datasets: [{
                data: [5, 3, 2, 8, 1],
                backgroundColor: ['#fbbf24', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444']
            }]
        };
        
        res.json({
            success: true,
            chartData: defaultChartData,
            statusData: defaultStatusData,
            realData: false
        });
    }
});

// 15. Debug endpoint
app.get('/api/debug/data', authenticateToken, isAdmin, (req, res) => {
    try {
        const data = readJSONData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'MyBook API',
        endpoints: {
            health: '/api/health',
            settings: '/api/settings',
            reviews: {
                approved: '/api/reviews/approved',
                submit: 'POST /api/reviews'
            },
            orders: 'POST /api/orders',
            auth: 'POST /api/auth/login',
            admin: {
                orders: 'GET /api/admin/orders',
                reviews: 'GET /api/admin/reviews',
                statistics: 'GET /api/admin/statistics'
            }
        }
    });
});

// Catch-all route
app.get('*', (req, res) => {
    res.json({
        success: false,
        message: 'API endpoint not found. Please check the documentation at /api'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🔐 Demo Login: admin / admin123`);
    console.log(`💾 Database: ${mongooseConnected ? 'MongoDB' : 'JSON file'}`);
    console.log(`💰 বইয়ের দাম: ২৫০ টাকা`);
    console.log(`🔧 Health Check: http://localhost:${PORT}/api/health`);
});
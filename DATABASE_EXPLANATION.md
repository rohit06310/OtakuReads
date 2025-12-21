# E-Book Store Database Architecture

## Current Setup: Mock Data + localStorage

The application currently uses a **client-side data storage** approach:

### 1. Mock Data Storage
- **Books**: Stored in `src/store/bookSlice.js` as a hardcoded array
- **Users**: Simulated authentication in `src/store/authSlice.js`
- **Cart**: Managed in `src/store/cartSlice.js` with localStorage persistence
- **Orders**: Stored in `src/store/orderSlice.js` with localStorage persistence

### 2. Data Flow
```
Frontend (React) → Redux Store → localStorage → Browser Storage
```

### 3. Current Data Structure

#### Books Data
```javascript
const mockBooks = [
  {
    id: '1',
    title: 'The Art of Programming',
    author: 'John Doe',
    price: 29.99,
    coverImage: 'https://images.pexels.com/...',
    description: 'A comprehensive guide...',
    category: 'Programming',
    rating: 4.5,
    pages: 320,
  }
]
```

#### User Authentication
```javascript
// Simulated login - no real backend
const user = {
  id: '1',
  email: formData.email,
  role: formData.email.includes('admin') ? 'admin' : 'user'
}
```

#### Cart & Orders
```javascript
// Stored in localStorage
localStorage.setItem('cart', JSON.stringify(cartItems))
localStorage.setItem('orders', JSON.stringify(orders))
```

## Limitations of Current Setup

1. **No Data Persistence**: Data resets when localStorage is cleared
2. **No Real Authentication**: Anyone can access admin features
3. **No Payment Processing**: Simulated payment flow
4. **No Multi-User Support**: All users share the same data
5. **No Search Optimization**: Client-side filtering only

---

## Upgrading to Real Database (Supabase)

To make this a production-ready application, here's how to integrate Supabase:

### 1. Database Schema
```sql
-- Users table (handled by Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books table
CREATE TABLE books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cover_image TEXT,
  description TEXT,
  preview TEXT,
  category TEXT NOT NULL,
  rating DECIMAL(2,1) DEFAULT 0,
  pages INTEGER DEFAULT 0,
  download_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10,2) NOT NULL
);
```

### 2. Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Anyone can read books" ON books
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage books" ON books
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 3. API Integration
```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 4. Updated Redux Actions
```javascript
// Real database operations instead of mock data
export const fetchBooks = createAsyncThunk(
  'books/fetchBooks',
  async () => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
)
```

## Benefits of Database Integration

### 1. **Real Authentication**
- Secure user registration and login
- Password hashing and validation
- Session management
- Role-based access control

### 2. **Data Persistence**
- All data stored in PostgreSQL database
- Automatic backups and scaling
- ACID compliance for transactions

### 3. **Multi-User Support**
- Each user has their own cart and orders
- Admin users can manage all books
- User isolation and security

### 4. **Real-Time Features**
- Live updates when books are added/modified
- Real-time inventory management
- Instant search and filtering

### 5. **Payment Integration**
- Secure payment processing with Razorpay
- Order tracking and fulfillment
- Digital product delivery

### 6. **Scalability**
- Handle thousands of users
- Optimized database queries
- CDN for image delivery

## How to Implement

1. **Set up Supabase Project**
   - Create account at supabase.com
   - Create new project
   - Get API keys

2. **Run Database Migrations**
   - Create tables and relationships
   - Set up RLS policies
   - Seed initial data

3. **Update Frontend Code**
   - Replace mock data with API calls
   - Implement real authentication
   - Add error handling and loading states

4. **Configure Environment**
   - Add Supabase credentials
   - Set up payment gateway keys
   - Configure deployment settings

Would you like me to implement the full Supabase integration for your E-Book Store?
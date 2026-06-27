const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Book = require('./models/Book');
const Coupon = require('./models/Coupon');

const books = [
  {
    title: 'The World of Attack on Titan',
    author: 'Hajime Isayama',
    price: 199.99,
    coverImage: 'https://imgs.search.brave.com/foqXzf-JAwnW3uA-1DLyBhLYa2Ec1onPoq00QZ52LSI/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pLnRo/cmlmdGJvb2tzLmNv/bS9hcGkvaW1hZ2Vo/YW5kbGVyL20vQjIy/OUY2QUVGODk1RDQ5/MEUzNUQ2MUU5NTE3/QTA3NjM5MkM2MzAz/RC5qcGVn',
    description: 'Dive deep into the lore, characters, and themes of Attack on Titan with exclusive artwork and author commentary.',
    preview: 'Chapter 1: The Walls and Humanity...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Shonen',
    rating: 4.9,
    pages: 350,
    isFeatured: true,
  },
  {
    title: 'My Hero Academia: Official Character Guide',
    author: 'Kohei Horikoshi',
    price: 299.99,
    coverImage: 'https://imgs.search.brave.com/UFGvmSVxowukh4cOmTENErbDNdc2wrZRBADYcMi8FB8/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/OTFuWmxkbDRCN0wu/anBn',
    description: 'A complete guide to the heroes, quirks, and villains of the My Hero Academia universe.',
    preview: 'Meet Deku, the boy who would be a hero...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Shonen',
    rating: 4.7,
    pages: 300,
    isFeatured: true,
  },
  {
    title: 'Demon Slayer: Kimetsu no Yaiba – The Complete Story',
    author: 'Koyoharu Gotouge',
    price: 399.99,
    coverImage: 'https://imgs.search.brave.com/OByyCVp1LwwUWnVrTgaHfw1v_Bp1iltsPXB8tQkYTBU/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pNS53/YWxtYXJ0aW1hZ2Vz/LmNvbS9zZW8vQUJZ/c3R5bGUtVGFuamly/by1hbmQtTmV6dWtv/LURlbW9uLVNsYXll/ci0yMC01LXgtMTUt/UG9zdGVyXzNkMDgx/MTczLTVmZDAtNGM0/Mi05MzM3LWFhNTFj/N2Q3YWVlMC4yYzE1/OTllMmIxZGYyNDcz/YTAzYmM5NmI4ZTdk/ZWNkYS5qcGVnP29k/bkhlaWdodD01ODAm/b2RuV2lkdGg9NTgw/Jm9kbkJnPUZGRkZG/Rg',
    description: 'Relive the emotional and action-packed story of Tanjiro and Nezuko in this official book.',
    preview: 'Chapter 1: Cruelty...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Shonen',
    rating: 4.8,
    pages: 420,
    isFeatured: true,
  },
  {
    title: 'Death Note: How to Read 13',
    author: 'Tsugumi Ohba & Takeshi Obata',
    price: 269.99,
    coverImage: 'https://imgs.search.brave.com/F3RmhipGeyvHLmcdOO7c11XnQcPcdEJf2a8_lisaBTs/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvcmVk/LWxpZ2h0LWRlYXRo/LW5vdGUtcGhvbmUt/eTByYnl1cGVheXM1/cTN5bS5qcGc',
    description: 'The ultimate companion book to the legendary Death Note manga, including interviews and insights.',
    preview: 'Ryuk speaks: The story behind the Shinigami...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Seinen',
    rating: 4.6,
    pages: 260,
  },
  {
    title: 'Fullmetal Alchemist: The Complete Artbook',
    author: 'Hiromu Arakawa',
    price: 449.99,
    coverImage: 'https://imgs.search.brave.com/HeJpH7B5xky8yS0gHoGeFpokWsVhbIF7zNjtk3PlrXM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvZnVs/bG1ldGFsLWFsY2hl/bWlzdC1lZHdhcmQt/ZWxyaWMtcm9ib3Qt/YXJtLXk4c3hvaDVh/NjJ1cnh3Z2IuanBn',
    description: 'A stunning collection of illustrations and concept art from Fullmetal Alchemist.',
    preview: 'From early sketches to final designs...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Seinen',
    rating: 5.0,
    pages: 280,
    isFeatured: true,
  },
  {
    title: 'Naruto: The Official Fanbook',
    author: 'Masashi Kishimoto',
    price: 279.99,
    coverImage: 'https://imgs.search.brave.com/yPaql4zXSfrMLt2wL6R9RPNfQsmFZqL7Y4cEEmS6pdM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9uYXJ1/dG8tb2ZmaWNpYWwu/Y29tL2FuaW1lL2lt/Z18yLndlYnA',
    description: 'Celebrate Naruto\'s journey from outcast to Hokage with trivia, character bios, and original artwork.',
    preview: 'Chapter 1: Naruto Uzumaki, Number One Hyperactive Ninja...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Slice of Life',
    rating: 4.8,
    pages: 310,
  },
  {
    title: 'One Piece: Color Walk Compendium',
    author: 'Eiichiro Oda',
    price: 499.99,
    coverImage: 'https://imgs.search.brave.com/cFWvWKnje7e2CdyQlT_exB5GV0Vj9TbbYv1y0VYPT20/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9zdGF0/aWMwLmNicmltYWdl/cy5jb20vd29yZHBy/ZXNzL3dwLWNvbnRl/bnQvdXBsb2Fkcy8y/MDIzLzA4L29uZS1w/aWVjZS1maWxsZXIu/anBnP3E9NDkmZml0/PWNyb3Amdz0zMTQm/aD0yNDQmZHByPTI',
    description: 'A massive collection of color illustrations spanning years of One Piece adventures.',
    preview: 'Luffy and crew set sail...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Isekai',
    rating: 4.9,
    pages: 500,
    isFeatured: true,
  },
  {
    title: 'Jujutsu Kaisen: Official Fan Guide',
    author: 'Gege Akutami',
    price: 319.99,
    coverImage: 'https://imgs.search.brave.com/fh3xVS8ZweRXcTCoMEK4-I-f9vvqiiuvy5zw7VRCdrw/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzL2QwL2Ix/LzlhL2QwYjE5YTc4/YzNjYTI2ODRhYmIw/NjJlZjU2NmZhYWY2/LmpwZw',
    description: 'Explore the dark and thrilling world of Jujutsu Kaisen with detailed profiles and lore.',
    preview: 'Chapter 1: Cursed Energy and Sorcerers...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Seinen',
    rating: 4.7,
    pages: 340,
  },
  {
    title: 'Bleach: The Official Character Guide',
    author: 'Tite Kubo',
    price: 249.99,
    coverImage: 'https://imgs.search.brave.com/Y-7E3lP5p-iNqA28O3bC33R_3g9c89Xn8lD3DZbD6uM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/NTFOcDFkOFl1Tkwu/anBn',
    description: 'Explore the world of Soul Reapers, Hollows, and Quincy with this comprehensive guide to Bleach.',
    preview: 'Chapter 1: The Substitute Soul Reaper...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Shonen',
    rating: 4.6,
    pages: 250,
  },
  {
    title: 'Hunter x Hunter: Compendium',
    author: 'Yoshihiro Togashi',
    price: 349.99,
    coverImage: 'https://imgs.search.brave.com/D_8_6f-pS8R7kS1vL7jZ2lYg4Uq5Ua1Yy7lH3mQhZ2E/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/NjFOMlU4YzZlOUwu/anBn',
    description: 'A detailed look at the Hunter Exam, Nen, and the dangerous beasts of Hunter x Hunter.',
    preview: 'Gon\'s journey begins...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Shonen',
    rating: 4.9,
    pages: 400,
  },
  {
    title: 'Berserk: Official Guidebook',
    author: 'Kentaro Miura',
    price: 499.99,
    coverImage: 'https://imgs.search.brave.com/a7hWc5A5A4VzLqP7bW9wWzJ_2iV5P8YwZ0G0M7B_0sY/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/ODFnNlhHVk9LOUwu/anBn',
    description: 'Delve into the dark fantasy world of Berserk with character profiles, lore, and creator interviews.',
    preview: 'The Black Swordsman...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Seinen',
    rating: 5.0,
    pages: 350,
    isFeatured: true,
  },
  {
    title: 'Vagabond: Illustration Collection',
    author: 'Takehiko Inoue',
    price: 549.99,
    coverImage: 'https://imgs.search.brave.com/Q9y7XW2L8M3N6K5b_2L3A8Y_9Q8L9W2Q0T7Z6H3L_9g/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/OTFiNDFaODU5OEwu/anBn',
    description: 'A breathtaking collection of watercolor and ink illustrations from the masterpiece Vagabond.',
    preview: 'The path of the sword...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Seinen',
    rating: 5.0,
    pages: 200,
  },
  {
    title: 'Spy x Family: The Official Mission Guide',
    author: 'Tatsuya Endo',
    price: 289.99,
    coverImage: 'https://imgs.search.brave.com/z8L6Q3W4T5R1A8Z9X2C7V6B4N5M1L9K8J7H6G5F4D3S/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/ODFhMTdhZGFaN0wu/anBn',
    description: 'Get the inside scoop on the Forger family, Operation Strix, and the secrets of Ostania.',
    preview: 'Twilight\'s hardest mission...',
    downloadUrl: '#',
    pdfUrl: null,
    category: 'Shonen',
    rating: 4.8,
    pages: 220,
  }
];

const coupons = [
  {
    code: 'WELCOME20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 0,
    maxUses: 100,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    code: 'OTAKU50',
    discountType: 'fixed',
    discountValue: 50,
    minOrderAmount: 300,
    maxUses: 50,
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    code: 'MANGA10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxUses: null,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
];

const users = [
  {
    name: 'Admin User',
    email: 'admin@otakureads.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Reader One',
    email: 'reader@otakureads.com',
    password: 'reader123',
    role: 'reader',
  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/otakureads');
    console.log('🔌 MongoDB Connected for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Book.deleteMany({});
    await Coupon.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Seed users (passwords get hashed by pre-save hook)
    const createdUsers = await User.create(users);
    console.log(`👤 Created ${createdUsers.length} users`);

    // Seed books (assigned to admin)
    const admin = createdUsers.find(u => u.role === 'admin');
    const booksWithCreator = books.map(book => ({ ...book, user: admin._id }));
    const createdBooks = await Book.create(booksWithCreator);
    console.log(`📚 Created ${createdBooks.length} books`);

    // Seed coupons
    const createdCoupons = await Coupon.create(coupons);
    console.log(`🏷️  Created ${createdCoupons.length} coupons`);

    console.log('✅ Database seeded successfully!');
    console.log('🔑 Default accounts:');
    console.log('   Admin      → admin@otakureads.com / admin123');
    console.log('   Reader       → reader@otakureads.com / reader123');
    console.log('\n🏷️  Demo coupons: WELCOME20 (20% off), OTAKU50 (₹50 off orders ≥₹300), MANGA10 (10% off)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seedDB();
